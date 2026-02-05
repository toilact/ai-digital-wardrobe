import os
import io
import requests
from PIL import Image
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

APP_SECRET = os.environ.get("APP_SECRET", "")

app = FastAPI(title="Wardrobe AI Service")

class AnalyzeIn(BaseModel):
    imageUrl: str

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
def analyze(payload: AnalyzeIn, x_app_secret: str = Header(default="")):
    # Bảo vệ bằng secret header (đơn giản, hợp demo)
    if not APP_SECRET or x_app_secret != APP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Tải ảnh về để chứng minh “AI service xử lý ảnh”
    r = requests.get(payload.imageUrl, timeout=15)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    w, h = img.size

    # TODO: thay phần mock này bằng pipeline F thật
    items = [
        {"category": "outerwear", "label": "blazer", "confidence": 0.91},
        {"category": "top", "label": "shirt", "confidence": 0.86},
        {"category": "bottom", "label": "pants", "confidence": 0.89},
        {"category": "shoes", "label": "shoes", "confidence": 0.81},
        {"category": "accessories", "label": "watch", "confidence": 0.74},
    ]

    return {
        "ok": True,
        "image": {"w": w, "h": h},
        "items": items,
    }
