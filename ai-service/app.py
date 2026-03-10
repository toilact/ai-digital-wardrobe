# ai-service/app.py
import base64
import io
import os
from typing import Any, Dict, Optional, Tuple, List
import json
import torch
from pydantic import BaseModel

import cv2
import numpy as np
from PIL import Image

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

app = FastAPI()

# CORS cho Next.js gọi
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev ok
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# ADD: Multi-point SAM + AutoLabel (CLIP + color)
# =============================

# Optional local CLIP (open_clip_torch) for fallback labeling
try:
    import open_clip  # type: ignore
except Exception:
    open_clip = None

# ----- AutoLabel config -----
AUTO_LABEL_INCLUDE_COLOR = os.getenv("AUTO_LABEL_INCLUDE_COLOR", "1").lower() not in ("0", "false", "no")
ENABLE_AUTO_LABEL = os.getenv("ENABLE_AUTO_LABEL", "1") == "1"
AUTO_LABEL_BACKEND_DEFAULT = os.getenv("AUTO_LABEL_BACKEND", "clip")  # clip | none
CLIP_MODEL_NAME = os.getenv("CLIP_MODEL_NAME", "ViT-B-32")
CLIP_PRETRAINED = os.getenv("CLIP_PRETRAINED", "laion2b_s34b_b79k")
CLIP_DEVICE = os.getenv("CLIP_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
CLIP_TEMPERATURE = float(os.getenv("CLIP_TEMPERATURE", "100.0"))

FASHION_CATEGORIES_VI = ["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"]

# Prompt-set per class để CLIP zero-shot ổn định hơn
_CLIP_PROMPTS = {
    "Áo": [
        "a photo of a shirt", "a photo of a t-shirt", "a photo of a blouse",
        "a photo of a hoodie", "a photo of a sweater", "a photo of a jacket",
        "áo thun", "áo sơ mi", "áo khoác"
    ],
    "Quần": [
        "a photo of pants", "a photo of trousers", "a photo of jeans",
        "a photo of shorts", "quần jean", "quần short", "quần dài"
    ],
    "Váy": [
        "a photo of a skirt", "a photo of a mini skirt", "a photo of a long skirt",
        "chân váy", "váy"
    ],
    "Đầm": [
        "a photo of a dress", "a photo of a gown", "a photo of a one-piece dress",
        "đầm", "váy liền", "đầm maxi"
    ],
    "Giày": [
        "a photo of shoes", "a photo of sneakers", "a photo of boots",
        "a photo of sandals", "giày", "giày sneaker", "boots"
    ],
    "Khác": [
        "a photo of a fashion accessory", "a photo of a bag", "a photo of a hat",
        "a photo of an accessory", "phụ kiện", "túi", "nón"
    ],
}

_clip_model = None
_clip_preprocess = None
_clip_text_features = None
_clip_ready = False

def _safe_json_loads(s: str):
    try:
        return json.loads(s)
    except Exception:
        return None

def _parse_points_json(s: str | None) -> List[Tuple[float, float]]:
    if not s:
        return []
    data = _safe_json_loads(s)
    if data is None:
        return []
    # allow {"points": [[x,y],...]}
    if isinstance(data, dict) and "points" in data:
        data = data["points"]
    if not isinstance(data, list):
        return []
    out: List[Tuple[float, float]] = []
    for p in data:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            try:
                out.append((float(p[0]), float(p[1])))
            except Exception:
                pass
    return out

def _parse_box_json(s: str | None) -> Tuple[float, float, float, float] | None:
    if not s:
        return None
    data = _safe_json_loads(s)
    if data is None:
        return None
    if isinstance(data, dict) and "box" in data:
        data = data["box"]
    if isinstance(data, (list, tuple)) and len(data) >= 4:
        try:
            return (float(data[0]), float(data[1]), float(data[2]), float(data[3]))
        except Exception:
            return None
    return None

def _resize_max_side(img_rgb: np.ndarray, max_side: int) -> Tuple[np.ndarray, float]:
    h, w = img_rgb.shape[:2]
    m = max(h, w)
    if m <= max_side:
        return img_rgb, 1.0
    scale = max_side / float(m)
    nh, nw = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(img_rgb, (nw, nh), interpolation=cv2.INTER_AREA)
    return resized, scale

# ---- ADD THESE HELPERS somewhere ABOVE _sam_prompt_mask ----
from typing import Optional, List, Tuple, Dict

def _clamp_f(v: float, lo: float, hi: float) -> float:
    return float(max(lo, min(hi, v)))

def _points_to_pixels(points: List[Tuple[float, float]], w: int, h: int) -> List[Tuple[float, float]]:
    """Accept either normalized [0..1] points or pixel points; return pixel points clamped to image."""
    if not points:
        return []

    is_norm = True
    for x, y in points:
        x = float(x); y = float(y)
        if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
            is_norm = False
            break

    out: List[Tuple[float, float]] = []
    for x, y in points:
        x = float(x); y = float(y)
        if is_norm:
            px = x * (w - 1)
            py = y * (h - 1)
        else:
            px = x
            py = y
        out.append((_clamp_f(px, 0.0, float(w - 1)), _clamp_f(py, 0.0, float(h - 1))))
    return out

def _box_to_pixels(box: Optional[Tuple[float, float, float, float]], w: int, h: int) -> Optional[Tuple[float, float, float, float]]:
    """Accept either normalized [0..1] box or pixel box; return pixel box clamped & sorted."""
    if box is None:
        return None
    x0, y0, x1, y1 = [float(v) for v in box]
    is_norm = all(0.0 <= v <= 1.0 for v in (x0, y0, x1, y1))
    if is_norm:
        x0 *= (w - 1); x1 *= (w - 1)
        y0 *= (h - 1); y1 *= (h - 1)

    xa, xb = sorted([x0, x1])
    ya, yb = sorted([y0, y1])

    xa = _clamp_f(xa, 0.0, float(w - 1))
    xb = _clamp_f(xb, 0.0, float(w - 1))
    ya = _clamp_f(ya, 0.0, float(h - 1))
    yb = _clamp_f(yb, 0.0, float(h - 1))
    return (xa, ya, xb, yb)


# ---- REPLACE your existing _sam_prompt_mask with this ----
def _sam_prompt_mask(
    img_rgb: np.ndarray,
    pos_points: List[Tuple[float, float]],
    neg_points: List[Tuple[float, float]],
    box: Optional[Tuple[float, float, float, float]] = None,
) -> Tuple[np.ndarray, Dict]:
    import numpy as np
    import cv2

    predictor = _get_sam_predictor()
    max_side = int(globals().get("SAM_MAX_SIDE", 1024))

    h0, w0 = img_rgb.shape[:2]

    # ✅ Convert normalized points/box -> pixel coordinates
    pos_px = _points_to_pixels(pos_points, w0, h0)
    neg_px = _points_to_pixels(neg_points, w0, h0)
    box_px = _box_to_pixels(box, w0, h0)

    img_small, scale = _resize_max_side(img_rgb, max_side=max_side)

    points: List[List[float]] = []
    labels: List[int] = []

    for (x, y) in pos_px:
        points.append([x * scale, y * scale])
        labels.append(1)
    for (x, y) in neg_px:
        points.append([x * scale, y * scale])
        labels.append(0)

    point_coords = np.array(points, dtype=np.float32) if points else None
    point_labels = np.array(labels, dtype=np.int32) if labels else None

    box_arr = None
    if box_px is not None:
        x0, y0, x1, y1 = box_px
        box_arr = np.array([x0 * scale, y0 * scale, x1 * scale, y1 * scale], dtype=np.float32)

    # Speed: if prompt is “strong” (multi points or box), no need multimask
    multimask = True if (point_coords is not None and point_coords.shape[0] <= 1 and box_arr is None) else False

    use_fp16 = SAM_USE_FP16 and getattr(predictor, "_device", "cpu").startswith("cuda")

    if use_fp16:
        with torch.inference_mode(), torch.autocast("cuda", dtype=torch.float16):
            predictor.set_image(img_small)
            masks, scores, _ = predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                box=box_arr,
                multimask_output=multimask,
            )
    else:
        with torch.inference_mode():
            predictor.set_image(img_small)
            masks, scores, _ = predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                box=box_arr,
                multimask_output=multimask,
            )

    best = int(np.argmax(scores))
    mask_small = masks[best].astype(np.uint8)

    # upscale back to full-res
    if scale != 1.0:
        mask01 = cv2.resize(mask_small, (w0, h0), interpolation=cv2.INTER_NEAREST).astype(np.uint8)
    else:
        mask01 = mask_small

    meta = {
        "engine": "sam_prompt_v2_normfix",
        "sam_score": float(scores[best]),
        "sam_max_side": int(max_side),
        "num_pos": int(len(pos_points)),
        "num_neg": int(len(neg_points)),
        "has_box": bool(box_px is not None),
    }
    return mask01, meta

def _hex_from_rgb(rgb: Tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(rgb[0], rgb[1], rgb[2])

def _hsv_to_color_vi(h: int, s: int, v: int) -> str:
    # OpenCV HSV: H 0..179
    if v < 40:
        return "Đen"
    if s < 25 and v > 220:
        return "Trắng"
    if s < 25:
        return "Xám" if v < 180 else "Be"

    # Brown heuristic: warm hue + darker value
    if 10 <= h <= 25 and v < 160:
        return "Nâu"

    if h <= 10 or h >= 170:
        return "Đỏ"
    if 11 <= h <= 20:
        return "Cam"
    if 21 <= h <= 34:
        return "Vàng"
    if 35 <= h <= 85:
        return "Xanh lá"
    if 86 <= h <= 125:
        return "Xanh dương"
    if 126 <= h <= 150:
        return "Tím"
    if 151 <= h <= 169:
        return "Hồng"
    return "Không rõ"

def _dominant_color_vi(pil_rgba: Image.Image) -> dict:
    arr = np.array(pil_rgba.convert("RGBA"))
    alpha = arr[:, :, 3]
    mask = alpha > 32
    cnt = int(mask.sum())
    if cnt < 50:
        return {"color": "Không rõ"}

    rgb = arr[:, :, :3][mask]
    # sample to keep it fast
    if rgb.shape[0] > 50000:
        idx = np.random.choice(rgb.shape[0], 50000, replace=False)
        rgb = rgb[idx]

    med = np.median(rgb, axis=0).astype(np.uint8)
    hsv = cv2.cvtColor(np.uint8([[med]]), cv2.COLOR_RGB2HSV)[0][0]
    h, s, v = int(hsv[0]), int(hsv[1]), int(hsv[2])
    color = _hsv_to_color_vi(h, s, v)
    rgb_tuple = (int(med[0]), int(med[1]), int(med[2]))
    return {
        "color": color,
        "colorRgb": [rgb_tuple[0], rgb_tuple[1], rgb_tuple[2]],
        "colorHex": _hex_from_rgb(rgb_tuple),
    }

def _ensure_clip_loaded() -> bool:
    global _clip_model, _clip_preprocess, _clip_text_features, _clip_ready

    if _clip_ready:
        return True
    if not ENABLE_AUTO_LABEL:
        return False
    if open_clip is None:
        return False

    try:
        name = (CLIP_MODEL_NAME or "").strip()

        # Support HuggingFace hub models via OpenCLIP:
        # Example: CLIP_MODEL_NAME="hf-hub:Marqo/marqo-fashionCLIP"
        if name.startswith("hf-hub:"):
            model, _, preprocess = open_clip.create_model_and_transforms(name)
        else:
            model, _, preprocess = open_clip.create_model_and_transforms(
                name, pretrained=CLIP_PRETRAINED
            )

        model = model.to(CLIP_DEVICE)
        model.eval()

        tokenizer = open_clip.get_tokenizer(name)

        # Build text features: mean over prompts per category
        with torch.inference_mode():
            labels = list(FASHION_CATEGORIES_VI)

            # Flatten prompts for a single forward pass (faster than per-category loop)
            all_prompts = []
            spans = []  # (start_idx, end_idx) per label in all_prompts
            for cat in labels:
                prompts = _CLIP_PROMPTS[cat]
                s = len(all_prompts)
                all_prompts.extend(prompts)
                e = len(all_prompts)
                spans.append((s, e))

            tokens = tokenizer(all_prompts)
            if hasattr(tokens, "to"):
                tokens = tokens.to(CLIP_DEVICE)

            feats = model.encode_text(tokens)
            feats = feats / feats.norm(dim=-1, keepdim=True)

            text_feats = []
            for (s, e) in spans:
                v = feats[s:e].mean(dim=0)
                v = v / v.norm()
                text_feats.append(v)

            text_feats = torch.stack(text_feats, dim=0).to(CLIP_DEVICE)

        _clip_model = model
        _clip_preprocess = preprocess
        _clip_text_features = text_feats
        _clip_ready = True
        return True

    except Exception as e:
        # giữ behavior "fail silently" như bạn, nhưng có log nhẹ để debug
        try:
            print(f"[clip] _ensure_clip_loaded failed: {e}")
        except Exception:
            pass
        _clip_ready = False
        return False

def _clip_predict_category(pil_rgba: Image.Image) -> dict | None:
    if not _ensure_clip_loaded():
        return None
    # Composite transparent item onto white bg for stability
    rgba = pil_rgba.convert("RGBA")
    bg = Image.new("RGB", rgba.size, (255, 255, 255))
    bg.paste(rgba, mask=rgba.split()[-1])

    img_tensor = _clip_preprocess(bg).unsqueeze(0).to(CLIP_DEVICE)

    with torch.no_grad():
        img_feat = _clip_model.encode_image(img_tensor)
        img_feat = img_feat / img_feat.norm(dim=-1, keepdim=True)
        logits = (img_feat @ _clip_text_features.T) * CLIP_TEMPERATURE
        probs = logits.softmax(dim=-1).detach().cpu().numpy()[0]

    best = int(np.argmax(probs))
    top_idx = np.argsort(-probs)[:3]
    top = [{"category": FASHION_CATEGORIES_VI[int(i)], "p": float(probs[int(i)])} for i in top_idx]

    return {
        "category": FASHION_CATEGORIES_VI[best],
        "confidence": float(probs[best]),
        "backend": "clip",
        "top": top,
    }

# -----------------------------
# Config (tune bằng ENV)
# -----------------------------
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "25"))

# Resize để GrabCut nhanh hơn nếu ảnh quá lớn (0 = không resize)
PRODUCT_MAX_SIDE = int(os.getenv("PRODUCT_MAX_SIDE", "1600"))

# GrabCut init rectangle: ảnh product thường 1 item nằm giữa
GC_RECT_MARGIN = float(os.getenv("GC_RECT_MARGIN", "0.06"))  # 0.04-0.10
GC_ITER_RECT = int(os.getenv("GC_ITER_RECT", "5"))
GC_ITER_MASK = int(os.getenv("GC_ITER_MASK", "3"))

# tạo sure-foreground/background khi refine để giữ chi tiết mảnh (dây)
GC_SURE_FG_ERODE = int(os.getenv("GC_SURE_FG_ERODE", "3"))  # px
GC_SURE_BG_ERODE = int(os.getenv("GC_SURE_BG_ERODE", "3"))  # px

# Post-process mask: close để nối khe nhỏ, attach để không mất phần bị đứt nhẹ
POST_CLOSE_K = int(os.getenv("POST_CLOSE_K", "5"))
ATTACH_CC_PX = int(os.getenv("ATTACH_CC_PX", "8"))

# Alpha fallback: feather nhẹ chỉ ở viền (KHÔNG làm mờ cả váy)
EDGE_BAND_PX = int(os.getenv("EDGE_BAND_PX", "2"))  # 1-3
MASK_FEATHER_SIGMA = float(os.getenv("MASK_FEATHER_SIGMA", "0.8"))  # 0.6-1.2

# Force alpha=255 ở vùng chắc chắn bên trong (tránh “trong ruột bị trong suốt”)
FORCE_SOLID_INTERIOR_PX = int(os.getenv("FORCE_SOLID_INTERIOR_PX", "3"))

# Closed-form matting (nếu cài pymatting) -> đẹp nhất cho viền/dây mảnh
TRIMAP_ERODE_K = int(os.getenv("TRIMAP_ERODE_K", "5"))
TRIMAP_DILATE_K = int(os.getenv("TRIMAP_DILATE_K", "13"))

# Crop output
CROP_PAD = int(os.getenv("CROP_PAD", "12"))

# Perf knobs
SAM_USE_FP16 = os.getenv("SAM_USE_FP16", "1").lower() not in ("0", "false", "no")
FAST_ROI_CROP = os.getenv("FAST_ROI_CROP", "1").lower() not in ("0", "false", "no")
PNG_COMPRESS_LEVEL = int(os.getenv("PNG_COMPRESS_LEVEL", "3"))  # 0..9 (lower=faster)

# Khử halo (grey spill) ở viền
DECONTAMINATE = os.getenv("DECONTAMINATE", "1").strip() not in ("0", "false", "False", "")
DECONTAM_RING_PX = int(os.getenv("DECONTAM_RING_PX", "15"))

def _ensure_uint8_rgb(img: np.ndarray) -> np.ndarray:
    """
    OpenCV grabCut + morphology yêu cầu ảnh uint8.
    Nếu ảnh float (0..1 hoặc 0..255), ép về uint8.
    """
    if img is None:
        return img
    if img.dtype == np.uint8:
        return img
    mx = float(np.max(img)) if img.size else 0.0
    if mx <= 1.5:
        img = img * 255.0
    return np.clip(img, 0, 255).astype(np.uint8)

def _ensure_mask01_uint8(mask: np.ndarray) -> np.ndarray:
    """
    Ép mask về uint8 0/1 (tránh bool).
    """
    if mask is None:
        return mask
    return (mask > 0).astype(np.uint8)

def _ensure_uint8_rgb(img: np.ndarray) -> np.ndarray:
    """
    OpenCV grabCut + morphology muốn uint8 (0..255).
    Nếu ảnh đang float (0..1 hoặc 0..255), ép về uint8 an toàn.
    """
    if img is None:
        return img
    if img.dtype == np.uint8:
        return img
    # nếu ảnh float 0..1
    mx = float(np.max(img)) if img.size else 0.0
    if mx <= 1.5:
        img = img * 255.0
    img = np.clip(img, 0, 255).astype(np.uint8)
    return img

# -----------------------------
# Utils
# -----------------------------
def _resize_max_side(img_rgb: np.ndarray, max_side: int) -> Tuple[np.ndarray, float]:
    if max_side <= 0:
        return img_rgb, 1.0
    h, w = img_rgb.shape[:2]
    if max(h, w) <= max_side:
        return img_rgb, 1.0
    scale = max_side / float(max(h, w))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = cv2.resize(img_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale


def _read_upload_image_rgb(data: bytes) -> np.ndarray:
    if MAX_UPLOAD_MB > 0 and len(data) > MAX_UPLOAD_MB * 1024 * 1024:
        raise RuntimeError(f"File too large (> {MAX_UPLOAD_MB}MB).")

    pil = Image.open(io.BytesIO(data)).convert("RGB")
    img = np.array(pil)  # RGB uint8
    if img.ndim != 3 or img.shape[2] != 3:
        raise RuntimeError("Invalid image format.")
    return img


def _largest_connected_component(mask01: np.ndarray) -> np.ndarray:
    mask01 = (mask01 > 0).astype(np.uint8)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask01, connectivity=8)
    if num <= 1:
        return mask01
    areas = stats[1:, cv2.CC_STAT_AREA]
    best = 1 + int(np.argmax(areas))
    return (labels == best).astype(np.uint8)


def _keep_cc_attached(mask01: np.ndarray, attach_px: int) -> np.ndarray:
    """
    Giữ CC lớn nhất + các CC nhỏ nằm sát/đụng vùng CC lớn nhất sau khi dilate.
    Tránh mất dây/chi tiết mảnh nếu bị đứt nhẹ.
    """
    mask01 = (mask01 > 0).astype(np.uint8)
    num, labels, stats, _ = cv2.connectedComponentsWithStats(mask01, connectivity=8)
    if num <= 2:
        return _largest_connected_component(mask01)

    areas = stats[1:, cv2.CC_STAT_AREA]
    best = 1 + int(np.argmax(areas))

    main = (labels == best).astype(np.uint8)
    if attach_px <= 0:
        return main

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * attach_px + 1, 2 * attach_px + 1))
    main_dil = cv2.dilate(main, k, iterations=1)

    keep = main.copy()
    for lab in range(1, num):
        if lab == best:
            continue
        comp = (labels == lab).astype(np.uint8)
        if np.any((comp == 1) & (main_dil == 1)):
            keep = np.maximum(keep, comp)

    return keep.astype(np.uint8)


def _postprocess_mask(mask01: np.ndarray) -> np.ndarray:
    mask01 = (mask01 > 0).astype(np.uint8)

    if POST_CLOSE_K and POST_CLOSE_K > 1:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (POST_CLOSE_K, POST_CLOSE_K))
        mask01 = cv2.morphologyEx(mask01, cv2.MORPH_CLOSE, k, iterations=2)

    mask01 = _keep_cc_attached(mask01, attach_px=ATTACH_CC_PX)
    return mask01.astype(np.uint8)


def _border_touch(mask01: np.ndarray) -> float:
    m = (mask01 > 0).astype(np.uint8)
    return float(np.mean(np.concatenate([m[0, :], m[-1, :], m[:, 0], m[:, -1]])))


def _mask_score(mask01: np.ndarray) -> float:
    """
    Score để chọn mask tốt nhất khi thử nhiều margin.
    Ưu tiên: không chạm viền, diện tích vừa phải.
    """
    area = float(np.mean(mask01))
    bt = _border_touch(mask01)
    area_score = 1.0 - min(1.0, abs(area - 0.25) / 0.75)
    border_score = 1.0 - min(1.0, bt / 0.6)
    return 0.7 * border_score + 0.3 * area_score


# -----------------------------
# GrabCut product mask (no torch)
# -----------------------------
def _grabcut_rect_mask(img_rgb: np.ndarray, margin: float) -> np.ndarray:
    h, w = img_rgb.shape[:2]
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

    mx = int(round(margin * w))
    my = int(round(margin * h))
    rect = (mx, my, max(1, w - 2 * mx), max(1, h - 2 * my))

    gc = np.zeros((h, w), dtype=np.uint8)
    bgModel = np.zeros((1, 65), np.float64)
    fgModel = np.zeros((1, 65), np.float64)

    cv2.grabCut(img_bgr, gc, rect, bgModel, fgModel, GC_ITER_RECT, cv2.GC_INIT_WITH_RECT)
    mask01 = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    return mask01


def _grabcut_refine_with_mask(img_rgb: np.ndarray, init01: np.ndarray, iters: int = 2) -> np.ndarray:
    """
    Refine mask bằng GrabCut (INIT_WITH_MASK), output uint8 0/1
    """
    import cv2
    import numpy as np

    img = _ensure_uint8_rgb(img_rgb)
    init01 = _ensure_mask01_uint8(init01)

    # GrabCut mask phải là labels {0,1,2,3} (BG, FG, PR_BG, PR_FG)
    gc_mask = np.where(init01 == 1, cv2.GC_PR_FGD, cv2.GC_BGD).astype(np.uint8)

    # ép border là background để giảm trường hợp “ăn cả ảnh”
    gc_mask[:2, :] = cv2.GC_BGD
    gc_mask[-2:, :] = cv2.GC_BGD
    gc_mask[:, :2] = cv2.GC_BGD
    gc_mask[:, -2:] = cv2.GC_BGD

    bgdModel = np.zeros((1, 65), np.float64)
    fgdModel = np.zeros((1, 65), np.float64)

    # grabCut cần ảnh 3-channel uint8
    cv2.grabCut(img, gc_mask, None, bgdModel, fgdModel, int(iters), cv2.GC_INIT_WITH_MASK)

    out01 = np.where((gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    return out01


def _product_auto_mask(img_rgb_full: np.ndarray) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Auto mask cho ảnh product:
    - Thử vài margin để GrabCut ổn định hơn
    - Refine 2-pass
    """
    img_rgb, scale = _resize_max_side(img_rgb_full, PRODUCT_MAX_SIDE)

    margins = [GC_RECT_MARGIN, 0.03, 0.10]
    best_mask = None
    best_s = -1e9
    best_m = None

    for m in margins:
        mask01 = _grabcut_rect_mask(img_rgb, margin=m)
        mask01 = _postprocess_mask(mask01)
        mask01 = _grabcut_refine_with_mask(img_rgb, mask01)
        mask01 = _postprocess_mask(mask01)

        s = _mask_score(mask01)
        if s > best_s:
            best_s = s
            best_mask = mask01
            best_m = m

    if best_mask is None:
        best_mask = np.ones(img_rgb.shape[:2], dtype=np.uint8)

    # nếu bị invert (foreground quá lớn & chạm viền nhiều), đảo lại
    area = float(np.mean(best_mask))
    bt = _border_touch(best_mask)
    if area > 0.85 and bt > 0.35:
        best_mask = (1 - best_mask).astype(np.uint8)
        best_mask = _postprocess_mask(best_mask)
        area = float(np.mean(best_mask))
        bt = _border_touch(best_mask)

    # upscale về full-res
    if scale != 1.0:
        h0, w0 = img_rgb_full.shape[:2]
        best_mask = cv2.resize(best_mask, (w0, h0), interpolation=cv2.INTER_NEAREST)
    else:
        best_mask = best_mask.astype(np.uint8)

    meta = {
        "scale": float(scale),
        "margin_used": float(best_m if best_m is not None else GC_RECT_MARGIN),
        "score": float(best_s),
        "area_frac": float(area),
        "border_touch": float(bt),
    }
    return best_mask.astype(np.uint8), meta

# -----------------------------
# Optional SAM point mask (needs checkpoint)
# -----------------------------
SAM_ENABLED = os.getenv("ENABLE_SAM", "1").lower() not in ("0", "false", "no")
SAM_MODEL_TYPE = os.getenv("SAM_MODEL_TYPE", "vit_h")
SAM_CHECKPOINT = os.getenv("SAM_CHECKPOINT", "/app/checkpoints/sam_vit_h_4b8939.pth")
SAM_MAX_SIDE = int(os.getenv("SAM_MAX_SIDE", "1024"))

_sam_predictor = None

def _sam_ready() -> bool:
    if not SAM_ENABLED:
        return False
    if not os.path.exists(SAM_CHECKPOINT):
        return False
    try:
        import torch  # noqa
        from segment_anything import sam_model_registry, SamPredictor  # noqa
        return True
    except Exception:
        return False

def _get_sam_predictor():
    global _sam_predictor
    if _sam_predictor is not None:
        return _sam_predictor

    import torch
    from segment_anything import sam_model_registry, SamPredictor

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda":
        # Speed on Ampere+: TF32
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    sam = sam_model_registry[SAM_MODEL_TYPE](checkpoint=SAM_CHECKPOINT)
    sam.to(device=device)
    sam.eval()

    predictor = SamPredictor(sam)
    predictor._device = device
    _sam_predictor = predictor
    return _sam_predictor

def _sam_point_mask(img_rgb_full: np.ndarray, x_norm: float, y_norm: float) -> Tuple[np.ndarray, Dict[str, float]]:
    import numpy as np
    import cv2

    predictor = _get_sam_predictor()

    img_rgb, scale = _resize_max_side(img_rgb_full, SAM_MAX_SIDE)
    h, w = img_rgb.shape[:2]

    x_norm = float(max(0.0, min(1.0, x_norm)))
    y_norm = float(max(0.0, min(1.0, y_norm)))
    x_px = int(round(x_norm * (w - 1)))
    y_px = int(round(y_norm * (h - 1)))

    point_coords = np.array([[x_px, y_px]], dtype=np.float32)
    point_labels = np.array([1], dtype=np.int32)

    use_fp16 = SAM_USE_FP16 and getattr(predictor, "_device", "cpu").startswith("cuda")

    if use_fp16:
        with torch.inference_mode(), torch.autocast("cuda", dtype=torch.float16):
            predictor.set_image(img_rgb)
            masks, scores, _ = predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                multimask_output=True
            )
    else:
        with torch.inference_mode():
            predictor.set_image(img_rgb)
            masks, scores, _ = predictor.predict(
                point_coords=point_coords,
                point_labels=point_labels,
                multimask_output=True
            )

    best = int(np.argmax(scores))
    mask01 = masks[best].astype(np.uint8)

    if scale != 1.0:
        h0, w0 = img_rgb_full.shape[:2]
        mask01 = cv2.resize(mask01, (w0, h0), interpolation=cv2.INTER_NEAREST)

    meta = {
        "engine": "sam_point_v2_fast",
        "sam_score": float(scores[best]),
        "point_x": float(x_norm),
        "point_y": float(y_norm),
        "sam_max_side": int(SAM_MAX_SIDE),
    }
    return mask01.astype(np.uint8), meta

# -----------------------------
# Alpha refine + halo reduction
# -----------------------------
def _safe_import_pymatting():
    try:
        from pymatting.alpha.estimate_alpha_cf import estimate_alpha_cf  # type: ignore
        return estimate_alpha_cf
    except Exception:
        return None


def _make_trimap_from_mask(mask01: np.ndarray, erode_k: int, dilate_k: int) -> np.ndarray:
    m = (mask01 > 0).astype(np.uint8)

    erode_k = max(1, int(erode_k) | 1)  # odd
    dilate_k = max(erode_k + 2, int(dilate_k) | 1)

    k_er = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erode_k, erode_k))
    k_di = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (dilate_k, dilate_k))

    sure_fg = cv2.erode(m, k_er, iterations=1)
    sure_bg = 1 - cv2.dilate(m, k_di, iterations=1)

    trimap = np.full_like(m, 0.5, dtype=np.float32)
    trimap[sure_bg == 1] = 0.0
    trimap[sure_fg == 1] = 1.0
    return trimap


def _alpha_fallback_band(mask01: np.ndarray) -> np.ndarray:
    """
    Alpha = 255 bên trong, 0 bên ngoài, feather nhẹ chỉ ở viền.
    """
    alpha255 = (mask01.astype(np.uint8) * 255).astype(np.uint8)

    if EDGE_BAND_PX <= 0 or MASK_FEATHER_SIGMA <= 0:
        alpha255[alpha255 < 2] = 0
        return alpha255

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * EDGE_BAND_PX + 1, 2 * EDGE_BAND_PX + 1))
    er = cv2.erode(alpha255, k, iterations=1)
    di = cv2.dilate(alpha255, k, iterations=1)
    band = (di > 0) & (er == 0)

    blurred = cv2.GaussianBlur(
        alpha255.astype(np.float32),
        (0, 0),
        sigmaX=MASK_FEATHER_SIGMA,
        sigmaY=MASK_FEATHER_SIGMA,
    )
    alpha255[band] = np.clip(blurred[band], 0, 255).astype(np.uint8)

    alpha255[alpha255 < 2] = 0
    return alpha255


def _force_solid_interior(alpha255: np.ndarray, mask01: np.ndarray) -> np.ndarray:
    if FORCE_SOLID_INTERIOR_PX <= 0:
        return alpha255
    k = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (2 * FORCE_SOLID_INTERIOR_PX + 1, 2 * FORCE_SOLID_INTERIOR_PX + 1)
    )
    sure = cv2.erode((mask01 > 0).astype(np.uint8), k, iterations=1)
    alpha255[sure == 1] = 255
    return alpha255


def _estimate_bg_near_object(img_rgb: np.ndarray, mask01: np.ndarray, ring_px: int) -> np.ndarray:
    """
    Ước lượng màu nền sát viền object (để khử halo).
    """
    ring_px = max(1, int(ring_px))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * ring_px + 1, 2 * ring_px + 1))
    di = cv2.dilate((mask01 > 0).astype(np.uint8), k, iterations=1)
    ring = (di == 1) & (mask01 == 0)

    ys, xs = np.where(ring)
    if len(xs) < 50:
        border = np.concatenate([img_rgb[0, :, :], img_rgb[-1, :, :], img_rgb[:, 0, :], img_rgb[:, -1, :]], axis=0)
        return np.median(border.astype(np.float32), axis=0)

    n = min(6000, len(xs))
    idx = np.random.choice(len(xs), size=n, replace=False)
    samp = img_rgb[ys[idx], xs[idx], :].astype(np.float32)
    return np.median(samp, axis=0)


def _decontaminate_rgb(img_rgb: np.ndarray, alpha255: np.ndarray, bg_rgb: np.ndarray) -> np.ndarray:
    """
    Khử màu nền bị “dính” ở viền (grey halo), chỉ áp dụng cho pixel bán trong suốt.
    """
    a = alpha255.astype(np.float32) / 255.0
    a3 = a[..., None]
    bg = bg_rgb.astype(np.float32)[None, None, :]
    rgb = img_rgb.astype(np.float32)

    edge = (a > 0.0) & (a < 1.0)
    if np.any(edge):
        m = edge[..., None]
        rgb_corr = (rgb - (1.0 - a3) * bg) / np.clip(a3, 1e-3, 1.0)
        rgb = np.where(m, np.clip(rgb_corr, 0, 255), rgb)

    return rgb.astype(np.uint8)


def _alpha_refine(img_rgb: np.ndarray, mask01: np.ndarray) -> Tuple[np.ndarray, Dict[str, str]]:
    """
    Alpha refine:
    - Nếu có pymatting: closed-form matting
    - Nếu lỗi / không có: band-feather fallback
    """
    estimate_alpha_cf = _safe_import_pymatting()
    if estimate_alpha_cf is not None:
        try:
            trimap = _make_trimap_from_mask(mask01, erode_k=TRIMAP_ERODE_K, dilate_k=TRIMAP_DILATE_K)

            # ✅ Pymatting/numba thường ổn định hơn với float64
            img_f = img_rgb.astype(np.float64) / 255.0
            trimap_f = trimap.astype(np.float64)

            alpha = estimate_alpha_cf(img_f, trimap_f)  # float 0..1
            alpha255 = (np.clip(alpha, 0, 1) * 255.0).astype(np.uint8)
            alpha255 = _force_solid_interior(alpha255, mask01)
            alpha255[alpha255 < 2] = 0
            return alpha255, {"alpha": "pymatting_cf"}
        except Exception as e:
            # ✅ nếu pymatting fail thì vẫn trả kết quả đẹp vừa đủ (không sập API)
            alpha255 = _alpha_fallback_band(mask01)
            alpha255 = _force_solid_interior(alpha255, mask01)
            alpha255[alpha255 < 2] = 0
            return alpha255, {"alpha": "band_fallback", "pymatting_error": str(e)[:200]}

    alpha255 = _alpha_fallback_band(mask01)
    alpha255 = _force_solid_interior(alpha255, mask01)
    alpha255[alpha255 < 2] = 0
    return alpha255, {"alpha": "band"}


def _crop_to_alpha(img_rgba: Image.Image, alpha255: np.ndarray, pad: int) -> Image.Image:
    ys, xs = np.where(alpha255 > 127)
    if len(xs) == 0 or len(ys) == 0:
        return img_rgba
    x0, x1 = xs.min(), xs.max()
    y0, y1 = ys.min(), ys.max()
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(alpha255.shape[1] - 1, x1 + pad)
    y1 = min(alpha255.shape[0] - 1, y1 + pad)
    return img_rgba.crop((int(x0), int(y0), int(x1 + 1), int(y1 + 1)))


from typing import Optional, Tuple, Dict
import numpy as np

def _bbox_from_mask01(mask01: np.ndarray, pad: int) -> Optional[Tuple[int, int, int, int]]:
    ys, xs = np.where(mask01 > 0)
    if xs.size == 0 or ys.size == 0:
        return None
    x0 = int(max(0, xs.min() - pad))
    y0 = int(max(0, ys.min() - pad))
    x1 = int(min(mask01.shape[1] - 1, xs.max() + pad))
    y1 = int(min(mask01.shape[0] - 1, ys.max() + pad))
    if x1 <= x0 or y1 <= y0:
        return None
    return x0, y0, x1, y1


def _build_cutout(
    img_rgb: np.ndarray,
    mask01: np.ndarray,
    crop: bool = True
) -> Tuple[bytes, np.ndarray, np.ndarray, Dict]:
    """
    Returns:
      - cutout PNG bytes (RGBA)
      - alpha255 array (cropped-final)
      - mask255 array (cropped-final)
      - meta dict
    """
    import io
    from PIL import Image

    mask01 = (mask01 > 0).astype(np.uint8)

    meta: Dict = {}
    img_work = img_rgb
    mask_work = mask01

    # ✅ ROI crop BEFORE alpha refine/decontam (big speed-up on large photos)
    if crop and FAST_ROI_CROP:
        safety = int(max(TRIMAP_DILATE_K, DECONTAM_RING_PX, 16))
        roi_pad = int(CROP_PAD + safety)
        bbox = _bbox_from_mask01(mask01, pad=roi_pad)
        if bbox is not None:
            x0, y0, x1, y1 = bbox
            img_work = img_rgb[y0:y1 + 1, x0:x1 + 1]
            mask_work = mask01[y0:y1 + 1, x0:x1 + 1]
            meta["roi"] = [x0, y0, x1, y1]
            meta["roi_pad"] = roi_pad

    # Alpha refine on work area
    alpha255, meta_a = _alpha_refine(img_work, mask_work)
    meta.update(meta_a)

    # Use refined alpha as final mask for decontam + output
    mask01_ref = (alpha255 > 127).astype(np.uint8)

    rgb_out = img_work
    if DECONTAMINATE:
        bg_rgb = _estimate_bg_near_object(img_work, mask01_ref, ring_px=DECONTAM_RING_PX)
        rgb_out = _decontaminate_rgb(img_work, alpha255, bg_rgb)
        meta["decontam"] = True
        meta["decontam_ring"] = int(DECONTAM_RING_PX)

    rgba = np.dstack([rgb_out, alpha255]).astype(np.uint8)
    img_rgba = Image.fromarray(rgba, mode="RGBA")

    # Final crop (same external behaviour)
    if crop:
        img_rgba = _crop_to_alpha(img_rgba, alpha255, pad=CROP_PAD)

    # Keep alpha/mask synced with final image size
    alpha_final = np.array(img_rgba)[:, :, 3].astype(np.uint8)
    mask255_final = (alpha_final > 127).astype(np.uint8) * 255

    buf = io.BytesIO()
    img_rgba.save(buf, format="PNG", compress_level=PNG_COMPRESS_LEVEL)
    return buf.getvalue(), alpha_final, mask255_final, meta

# -----------------------------
# API
# -----------------------------
@app.post("/cutout")
async def cutout(
    file: UploadFile = File(...),
    item_type: str = Form("item"),
    x: Optional[float] = Form(None),
    y: Optional[float] = Form(None),

    # NEW: actually USED now
    pos_points_json: Optional[str] = Form(None),  # JSON: [[x,y],[x,y],...]
    neg_points_json: Optional[str] = Form(None),  # JSON: [[x,y],...]
    box_json: Optional[str] = Form(None),         # JSON: [x0,y0,x1,y1]

    crop: bool = Form(True),
    output: str = Form("base64"),  # "base64" | "file"
    return_mask: bool = Form(False),

    # NEW: Auto label control
    auto_label: bool = Form(True),
    label_backend: str = Form("clip"),  # clip | none
):
    try:
        if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
            return JSONResponse({"ok": False, "message": "Only jpg/png/webp supported"}, status_code=400)

        img_bytes = await file.read()
        if not img_bytes:
            return JSONResponse({"ok": False, "message": "Empty file"}, status_code=400)

        nparr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            return JSONResponse({"ok": False, "message": "Decode failed"}, status_code=400)

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        # --- parse prompts ---
        pos_points = _parse_points_json(pos_points_json)
        neg_points = _parse_points_json(neg_points_json)
        box = _parse_box_json(box_json)

        # If user provides x,y (single-click), treat as a positive point (merge with pos_points_json)
        if x is not None and y is not None:
            pos_points = list(pos_points) + [(float(x), float(y))]

        # --- engine cascade ---
        meta_engine: Dict[str, Any] = {}
        mask01: Optional[np.ndarray] = None

        print(f"[cutout] sam_ready={_sam_ready()}, x={x}, y={y}, pos_points={len(pos_points)}, neg_points={len(neg_points)}, box={box}")

        used_sam_prompt = _sam_ready() and (len(pos_points) > 0 or len(neg_points) > 0 or box is not None)

        if used_sam_prompt:
            try:
                print("[cutout] using SAM prompt mask")
                mask01, meta_engine = _sam_prompt_mask(img_rgb, pos_points, neg_points, box)
            except Exception as e:
                meta_engine = {"engine": "sam", "error": f"sam_prompt_failed: {str(e)}"}
                mask01 = None

        # fallback: old behavior
        if mask01 is None:
            if x is not None and y is not None and _sam_ready():
                print("[cutout] using SAM point mask")
                mask01, meta_engine = _sam_point_mask(img_rgb, float(x), float(y))
            else:
                print("[cutout] using product auto mask (GrabCut fallback)")
                mask01, meta_engine = _product_auto_mask(img_bgr)

        cut_png, _alpha255, mask255, meta_build = _build_cutout(img_rgb, mask01, crop=crop)
        meta: Dict[str, Any] = {**meta_engine, **meta_build}

        # --- AutoLabel (category + optional dominant color) ---
        item_type_out = item_type
        if output != "file" and auto_label and ENABLE_AUTO_LABEL and label_backend != "none":
            try:
                # NOTE: cut_png là bytes PNG RGBA trả từ _build_cutout(...)
                pil_rgba = Image.open(io.BytesIO(cut_png)).convert("RGBA")

                auto = {}

                # Optional: dominant color (tắt để nhanh hơn)
                if AUTO_LABEL_INCLUDE_COLOR:
                    auto.update(_dominant_color_vi(pil_rgba))

                # Category via CLIP
                if label_backend in ("clip", "auto"):
                    auto.update(_clip_predict_category(pil_rgba))

                if auto:
                    meta["autoLabel"] = auto

                # If caller didn't force a specific type, allow overriding default "item"
                if item_type.strip().lower() in ("item", "auto", "", "unknown") and isinstance(auto.get("category"), str):
                    item_type_out = auto.get("category", item_type_out)

            except Exception as e:
                # Don't fail cutout if labeling fails
                meta["autoLabelError"] = str(e) #//

        if output == "file":
            return Response(content=cut_png, media_type="image/png")

        item_b64 = base64.b64encode(cut_png).decode("utf-8")

        resp_item: Dict[str, Any] = {
            "type": item_type_out,
            "image_png_base64": item_b64,
            "meta": meta,
        }

        if return_mask:
            mimg = Image.fromarray(mask255, mode="L")
            mbuf = io.BytesIO()
            mimg.save(mbuf, format="PNG", compress_level=PNG_COMPRESS_LEVEL)
            resp_item["mask_png_base64"] = base64.b64encode(mbuf.getvalue()).decode("utf-8")

        return JSONResponse({"ok": True, "items": [resp_item]})

    except Exception as e:
        print("cutout error:", e)
        return JSONResponse({"ok": False, "message": str(e)}, status_code=500)


@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    # Backward compatible endpoint
    return await cutout(
        file=file,
        x=None,
        y=None,
        pos_points_json=None,
        neg_points_json=None,
        box_json=None,
        item_type="item",
        output="base64",
        crop=True,
        return_mask=False,
    )

from pydantic import BaseModel

class LabelRequest(BaseModel):
    image_png_base64: str
    backend: str = "clip"          # "clip" | "none"
    include_color: bool = False    # default false (you don't want color)

def _decode_png_base64_to_pil_rgba(b64: str) -> Image.Image:
    if not isinstance(b64, str) or not b64.strip():
        raise RuntimeError("image_png_base64 is empty")

    s = b64.strip()
    if s.startswith("data:"):
        # data:image/png;base64,....
        parts = s.split(",", 1)
        if len(parts) == 2:
            s = parts[1]

    raw = base64.b64decode(s)
    return Image.open(io.BytesIO(raw)).convert("RGBA")

@app.post("/label")
async def label_endpoint(req: LabelRequest):
    try:
        if req.backend == "none":
            return JSONResponse({"ok": True, "label": {"category": "Khác", "confidence": 0.0}})

        pil_rgba = _decode_png_base64_to_pil_rgba(req.image_png_base64)

        out = {}
        if req.include_color and AUTO_LABEL_INCLUDE_COLOR:
            out.update(_dominant_color_vi(pil_rgba))

        out.update(_clip_predict_category(pil_rgba))

        # Normalize: ensure only category/confidence returned (and optional color)
        label = {
            "category": out.get("category", "Khác"),
            "confidence": float(out.get("confidence", 0.0)),
        }
        if "color" in out:
            label["color"] = out["color"]

        return JSONResponse({"ok": True, "label": label})
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=400)

@app.on_event("startup")
def _warmup():
    if ENABLE_AUTO_LABEL and open_clip is not None:
        try:
            _ensure_clip_loaded()
        except Exception:
            pass

@app.get("/health")

def health():
    pymatting_ok = _safe_import_pymatting() is not None
    return {
        "ok": True,
        "engine_default": "product_grabcut_v2",
        "pymatting": pymatting_ok,
        "decontaminate": bool(DECONTAMINATE),
        "product_max_side": int(PRODUCT_MAX_SIDE),
        "sam_ready": _sam_ready(),
        "sam_checkpoint": bool(os.path.exists(SAM_CHECKPOINT)),
    }