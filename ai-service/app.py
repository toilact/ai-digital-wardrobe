# ai-service/app.py
import base64
import io
import os
from typing import List, Dict, Any

import numpy as np
import cv2
from PIL import Image

import torch
import torch.nn.functional as F

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import networks
from utils.transforms import get_affine_transform, transform_logits


app = FastAPI()

# CORS cho Next.js gọi
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev ok
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHP config ---
SCHP_DATASET = os.getenv("SCHP_DATASET", "lip")  # "lip" | "atr" | "pascal"
SCHP_CKPT = os.getenv("SCHP_CKPT", os.path.join("checkpoints", "lip.pth"))
SCHP_DEVICE = os.getenv("SCHP_DEVICE", "").strip()  # optional: "cpu" | "mps" | "cuda"

DATASET_SETTINGS = {
    "lip": {
        "input_size": [473, 473],
        "num_classes": 20,
        "labels": [
            "Background", "Hat", "Hair", "Glove", "Sunglasses", "Upper-clothes", "Dress", "Coat",
            "Socks", "Pants", "Jumpsuits", "Scarf", "Skirt", "Face", "Left-arm", "Right-arm",
            "Left-leg", "Right-leg", "Left-shoe", "Right-shoe",
        ],
    },
    "atr": {
        "input_size": [512, 512],
        "num_classes": 18,
        "labels": [
            "Background", "Hat", "Hair", "Sunglasses", "Upper-clothes", "Skirt", "Pants", "Dress", "Belt",
            "Left-shoe", "Right-shoe", "Face", "Left-leg", "Right-leg", "Left-arm", "Right-arm", "Bag", "Scarf"
        ],
    },
    "pascal": {
        "input_size": [512, 512],
        "num_classes": 7,
        "labels": ["Background", "Head", "Torso", "Upper Arms", "Lower Arms", "Upper Legs", "Lower Legs"],
    }
}

# mapping class label (theo labels ở trên) -> item type để đưa vào tủ đồ
CLASS_TO_ITEM = {
    "Upper-clothes": "top",
    "Coat": "outerwear",
    "Dress": "dress",
    "Pants": "pants",
    "Skirt": "skirt",
    "Left-shoe": "shoes",
    "Right-shoe": "shoes",
    "Hat": "hat",
    "Scarf": "scarf",
    # ATR only:
    "Bag": "bag",
    "Belt": "belt",
}

_MODEL = None
_DEVICE = None


def _pick_device() -> str:
    if SCHP_DEVICE:
        return SCHP_DEVICE
    # ưu tiên mps nếu có (Mac Apple Silicon), rồi cuda, rồi cpu
    if torch.backends.mps.is_available():
        return "mps"
    if torch.cuda.is_available():
        return "cuda"
    return "cpu"


def load_schp():
    """
    Load model + weights 1 lần, cache global.
    """
    global _MODEL, _DEVICE

    if _MODEL is not None:
        return _MODEL, _DEVICE

    if SCHP_DATASET not in DATASET_SETTINGS:
        raise RuntimeError(f"Unknown SCHP_DATASET={SCHP_DATASET}. Use one of {list(DATASET_SETTINGS.keys())}")

    cfg = DATASET_SETTINGS[SCHP_DATASET]
    num_classes = cfg["num_classes"]

    if not os.path.exists(SCHP_CKPT):
        raise RuntimeError(f"Checkpoint not found: {SCHP_CKPT}")

    model = networks.init_model("resnet101", num_classes=num_classes, pretrained=None)

    ckpt = torch.load(SCHP_CKPT, map_location="cpu")
    state_dict = ckpt.get("state_dict", ckpt)

    # remove "module." prefix
    new_state = {}
    for k, v in state_dict.items():
        if k.startswith("module."):
            new_state[k[7:]] = v
        else:
            new_state[k] = v

    missing, unexpected = model.load_state_dict(new_state, strict=False)
    if missing or unexpected:
        print("[SCHP] load_state_dict warnings:", {
            "missing": missing[:10],
            "unexpected": unexpected[:10],
        })

    _DEVICE = _pick_device()
    model.to(_DEVICE)
    model.eval()

    _MODEL = model
    print(f"[SCHP] loaded dataset={SCHP_DATASET}, ckpt={SCHP_CKPT}, device={_DEVICE}")
    return _MODEL, _DEVICE


def rgba_cutout(orig_bgr: np.ndarray, mask: np.ndarray) -> Image.Image:
    """
    orig_bgr: HxWx3
    mask: HxW (0/255)
    """
    b, g, r = cv2.split(orig_bgr)
    a = mask.astype(np.uint8)
    rgba = cv2.merge([r, g, b, a])  # PIL expects RGBA
    return Image.fromarray(rgba, mode="RGBA")


def crop_to_mask(img_rgba: Image.Image, mask: np.ndarray, pad: int = 10) -> Image.Image:
    ys, xs = np.where(mask > 0)
    if len(xs) == 0 or len(ys) == 0:
        return img_rgba
    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(mask.shape[1] - 1, x2 + pad)
    y2 = min(mask.shape[0] - 1, y2 + pad)
    return img_rgba.crop((x1, y1, x2 + 1, y2 + 1))


def clean_mask(mask: np.ndarray) -> np.ndarray:
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    m = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k, iterations=1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k, iterations=2)
    return m


def run_schp(image_bgr: np.ndarray) -> List[Dict[str, Any]]:
    """
    Output:
      - list item: { "class_name": "...", "mask": HxW uint8(0/255) }
    """
    model, device = load_schp()
    cfg = DATASET_SETTINGS[SCHP_DATASET]
    input_size = cfg["input_size"]
    labels = cfg["labels"]

    h, w = image_bgr.shape[:2]
    input_h, input_w = int(input_size[0]), int(input_size[1])

    aspect_ratio = input_w * 1.0 / input_h

    # box theo kiểu extractor: [0,0,w-1,h-1]
    box_w = float(w - 1)
    box_h = float(h - 1)
    center = np.array([box_w * 0.5, box_h * 0.5], dtype=np.float32)

    if box_w > aspect_ratio * box_h:
        box_h = box_w / aspect_ratio
    elif box_w < aspect_ratio * box_h:
        box_w = box_h * aspect_ratio

    scale = np.array([box_w, box_h], dtype=np.float32)

    trans = get_affine_transform(center, scale, 0, np.asarray(input_size))
    inp = cv2.warpAffine(
        image_bgr,
        trans,
        (input_w, input_h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )

    # normalize giống simple_extractor.py (BGR order)
    x = torch.from_numpy(inp.transpose(2, 0, 1)).float() / 255.0
    mean = torch.tensor([0.406, 0.456, 0.485], dtype=torch.float32).view(3, 1, 1)
    std = torch.tensor([0.225, 0.224, 0.229], dtype=torch.float32).view(3, 1, 1)
    x = (x - mean) / std
    x = x.unsqueeze(0).to(device)

    with torch.no_grad():
        out = model(x)              # [[parsing, fusion], [edge]]
        fusion = out[0][-1]         # N,C,h,w
        up = F.interpolate(fusion, size=(input_h, input_w), mode="bilinear", align_corners=True)
        logits = up[0].permute(1, 2, 0).detach().cpu().numpy()  # HWC

    # map logits về ảnh gốc
    logits_result = transform_logits(logits, center, scale, w, h, input_size=input_size)
    parsing = np.argmax(logits_result, axis=2).astype(np.uint8)

    # lọc nhiễu theo diện tích (tùy ảnh)
    min_pixels = max(150, int(0.0005 * h * w))  # >= 0.05% ảnh hoặc 150px

    items: List[Dict[str, Any]] = []
    for idx, class_name in enumerate(labels):
        if class_name not in CLASS_TO_ITEM:
            continue

        pix = int((parsing == idx).sum())
        if pix < min_pixels:
            continue

        mask = (parsing == idx).astype(np.uint8) * 255
        items.append({"class_name": class_name, "mask": mask})

    return items


@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    try:
        data = await file.read()
        pil = Image.open(io.BytesIO(data)).convert("RGB")
        image_rgb = np.array(pil)
        image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

        items_raw = run_schp(image_bgr)

        merged_by_item: Dict[str, np.ndarray] = {}

        for it in items_raw:
            class_name = it["class_name"]
            mask = it["mask"].astype(np.uint8)

            item_type = CLASS_TO_ITEM.get(class_name)
            if not item_type:
                continue

            if item_type not in merged_by_item:
                merged_by_item[item_type] = mask.copy()
            else:
                merged_by_item[item_type] = cv2.bitwise_or(merged_by_item[item_type], mask)

        results = []
        for item_type, mask in merged_by_item.items():
            mask = clean_mask(mask)

            cut = rgba_cutout(image_bgr, mask)
            cut = crop_to_mask(cut, mask, pad=12)

            buf = io.BytesIO()
            cut.save(buf, format="PNG")
            b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

            results.append({
                "type": item_type,
                "image_png_base64": b64,
            })

        return {"ok": True, "items": results}
    except Exception as e:
        print("[/parse] ERROR:", repr(e))
        return {"ok": False, "message": str(e), "items": []}


@app.get("/health")
def health():
    return {"ok": True}
