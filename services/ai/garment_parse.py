import os
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

# Segformer produces near-zero non-background activations on MPS (Apple Silicon precision issue).
# Force CPU for reliable inference; override via SEGFORMER_DEVICE env var if needed.
_DEVICE = os.getenv("SEGFORMER_DEVICE", "cpu")
_SEG_MODEL_NAME = os.getenv("SEGFORMER_MODEL", "mattmdjaga/segformer_b2_clothes")

# ATR 18-class id -> (slot, category_vi). Bỏ background/body parts.
SEGFORMER_LABEL_TO_SLOT: dict[int, tuple[str, str]] = {
    1: ("accessory", "Khác"),   # Hat
    3: ("accessory", "Khác"),   # Sunglasses
    4: ("top", "Áo"),           # Upper-clothes
    5: ("bottom", "Váy"),       # Skirt
    6: ("bottom", "Quần"),      # Pants
    7: ("dress", "Đầm"),        # Dress
    8: ("accessory", "Khác"),   # Belt
    9: ("shoes", "Giày"),       # Left-shoe
    10: ("shoes", "Giày"),      # Right-shoe
    16: ("bag", "Khác"),        # Bag
    17: ("accessory", "Khác"),  # Scarf
}

# Các id gộp chung thành 1 món (đôi giày trái+phải = 1).
_MERGE_GROUPS = [{9, 10}]

_seg_model = None
_seg_processor = None


def _ensure_seg_loaded() -> None:
    global _seg_model, _seg_processor
    if _seg_model is not None:
        return
    from transformers import SegformerForSemanticSegmentation, SegformerImageProcessor
    _seg_processor = SegformerImageProcessor.from_pretrained(_SEG_MODEL_NAME)
    _seg_model = SegformerForSemanticSegmentation.from_pretrained(_SEG_MODEL_NAME).to(_DEVICE).eval()


def _label_map(img_rgb: np.ndarray) -> np.ndarray:
    _ensure_seg_loaded()
    pil = Image.fromarray(img_rgb)
    inputs = _seg_processor(images=pil, return_tensors="pt").to(_DEVICE)
    with torch.no_grad():
        logits = _seg_model(**inputs).logits  # (1, C, h, w)
    up = F.interpolate(logits, size=img_rgb.shape[:2], mode="bilinear", align_corners=False)
    return up.argmax(dim=1)[0].cpu().numpy().astype(np.int32)


def parse_garments(img_rgb: np.ndarray, min_area_ratio: float = 0.01) -> list[dict]:
    seg = _label_map(img_rgb)
    total = seg.shape[0] * seg.shape[1]
    out: list[dict] = []
    handled: set[int] = set()

    def emit(ids: set[int]) -> None:
        mask = np.isin(seg, list(ids)).astype(np.uint8)
        if mask.sum() < min_area_ratio * total:
            return
        first = sorted(ids)[0]
        slot, cat = SEGFORMER_LABEL_TO_SLOT[first]
        out.append({"slot": slot, "category": cat, "mask01": mask})

    for group in _MERGE_GROUPS:
        if group & set(SEGFORMER_LABEL_TO_SLOT):
            emit(group)
            handled |= group

    for lid in SEGFORMER_LABEL_TO_SLOT:
        if lid in handled:
            continue
        emit({lid})

    return out
