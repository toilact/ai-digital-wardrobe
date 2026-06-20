import base64
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)


def test_parse_person_returns_structured_items():
    with open("tests/fixtures/person_two_items.jpg", "rb") as f:
        r = client.post("/parse-person", files={"file": ("p.jpg", f, "image/jpeg")})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert len(body["items"]) >= 2
    it = body["items"][0]
    assert it["slot"] in {"top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"}
    assert it["embeddingModel"] == "clip-vit-b32"
    assert len(it["embedding"]) == 512
    # base64 decode được
    base64.b64decode(it["image_png_base64"])
    assert len(it["bbox"]) == 4
