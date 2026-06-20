# M1a — Structured Wardrobe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép upload 1 ảnh người mặc → tách tất cả món đồ → tinh chỉnh → lưu tủ đồ có cấu trúc (slot, formality, styleTags, warmth, CLIP embedding), vẫn giữ luồng thêm món lẻ.

**Architecture:** Mở rộng FastAPI service hiện có (`services/ai/app.py`) thêm Segformer multi-garment parsing + CLIP embedding, tái dùng pipeline `_build_cutout`/`_dominant_color_vi`. Web thêm route proxy `parse-person`, mở rộng `label-item`/`confirm`, viết lại `WardrobeUploader`. Schema item mới validate bằng zod.

**Tech Stack:** Python 3.11 (FastAPI, transformers Segformer, torch, open_clip), Next.js 16 (App Router, TS, zod), Firebase Admin (Firestore), Cloudinary, pytest, vitest.

## Global Constraints

- Python service chạy device MPS/CPU (không CUDA): `CLIP_DEVICE` đã auto-detect; Segformer dùng cùng device pattern.
- Giữ field `category` tiếng Việt (`Áo|Quần|Váy|Đầm|Giày|Khác`) để không phá UI/list cũ.
- `slot` ∈ `top|bottom|dress|outerwear|shoes|bag|accessory` (khớp `OutfitSlot` trong `apps/web/src/lib/outfitSchema.ts`).
- Embedding: CLIP ViT-B/32, độ dài 512, lưu kèm `embeddingModel: "clip-vit-b32"`.
- TDD: mỗi task kết thúc bằng test xanh + 1 commit. Làm trên nhánh `feat/m1a-structured-wardrobe` (đã tạo).
- KHÔNG commit file nặng (model weight Segformer tải runtime, không add vào git).

---

### Task 1: Python test infra + Segformer parser core

**Files:**
- Modify: `services/ai/requirements.txt`
- Create: `services/ai/garment_parse.py`
- Create: `services/ai/tests/__init__.py`
- Create: `services/ai/tests/test_garment_parse.py`
- Create: `services/ai/tests/fixtures/person_two_items.jpg` (ảnh 1 người mặc áo + quần, tự chuẩn bị)

**Interfaces:**
- Produces:
  - `SEGFORMER_LABEL_TO_SLOT: dict[int, tuple[str, str]]` — map id lớp ATR → `(slot, category_vi)`.
  - `parse_garments(img_rgb: np.ndarray, min_area_ratio: float = 0.01) -> list[dict]` — trả list `{"slot": str, "category": str, "mask01": np.ndarray(H,W uint8)}`, mỗi phần tử là 1 nhóm món có diện tích ≥ `min_area_ratio` tổng pixel.

- [ ] **Step 1: Thêm dependency**

Thêm vào `services/ai/requirements.txt` (cuối file):
```
transformers==4.44.2
pytest==8.3.3
```
Cài: `services/ai/.venv/bin/pip install transformers==4.44.2 pytest==8.3.3`

- [ ] **Step 2: Viết test thất bại**

`services/ai/tests/__init__.py`: để trống.

`services/ai/tests/test_garment_parse.py`:
```python
import numpy as np
import cv2
from garment_parse import parse_garments, SEGFORMER_LABEL_TO_SLOT


def test_label_map_covers_garment_classes():
    # upper-clothes(4), skirt(5), pants(6), dress(7), shoes(9,10), bag(16)
    assert SEGFORMER_LABEL_TO_SLOT[4] == ("top", "Áo")
    assert SEGFORMER_LABEL_TO_SLOT[6] == ("bottom", "Quần")
    assert SEGFORMER_LABEL_TO_SLOT[7] == ("dress", "Đầm")
    assert SEGFORMER_LABEL_TO_SLOT[9] == ("shoes", "Giày")
    assert SEGFORMER_LABEL_TO_SLOT[16] == ("bag", "Khác")
    # body parts không có trong map
    assert 11 not in SEGFORMER_LABEL_TO_SLOT  # face


def test_parse_person_returns_multiple_garments():
    img = cv2.cvtColor(cv2.imread("tests/fixtures/person_two_items.jpg"), cv2.COLOR_BGR2RGB)
    items = parse_garments(img)
    slots = {it["slot"] for it in items}
    assert len(items) >= 2
    assert "top" in slots and "bottom" in slots
    for it in items:
        assert it["mask01"].shape == img.shape[:2]
        assert it["mask01"].max() == 1
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `cd services/ai && .venv/bin/python -m pytest tests/test_garment_parse.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'garment_parse'`.

- [ ] **Step 4: Viết implementation**

`services/ai/garment_parse.py`:
```python
import os
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

_DEVICE = os.getenv("CLIP_DEVICE", "mps" if torch.backends.mps.is_available() else "cpu")
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
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd services/ai && .venv/bin/python -m pytest tests/test_garment_parse.py -v`
Expected: PASS (lần đầu tải weight Segformer ~vài chục MB).

- [ ] **Step 6: Commit**

```bash
git add services/ai/requirements.txt services/ai/garment_parse.py services/ai/tests/
git commit -m "feat(ai): segformer multi-garment parser + python test infra"
```

---

### Task 2: CLIP embedding helper

**Files:**
- Modify: `services/ai/app.py` (thêm hàm sau `_clip_predict_category`, ~dòng 467)
- Create: `services/ai/tests/test_clip_embedding.py`

**Interfaces:**
- Consumes: `_ensure_clip_loaded()`, `_clip_model`, `_clip_preprocess`, `CLIP_DEVICE` (đã có trong `app.py`).
- Produces: `_clip_embedding(pil_rgba: Image.Image) -> list[float]` — vector 512 đã L2-normalize; trả `[]` nếu CLIP không load được.

- [ ] **Step 1: Viết test thất bại**

`services/ai/tests/test_clip_embedding.py`:
```python
import numpy as np
from PIL import Image
from app import _clip_embedding


def test_embedding_has_512_dims_and_normalized():
    arr = (np.random.rand(64, 64, 4) * 255).astype("uint8")
    emb = _clip_embedding(Image.fromarray(arr, mode="RGBA"))
    assert len(emb) == 512
    norm = float(np.linalg.norm(np.array(emb)))
    assert abs(norm - 1.0) < 1e-3
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd services/ai && .venv/bin/python -m pytest tests/test_clip_embedding.py -v`
Expected: FAIL — `ImportError: cannot import name '_clip_embedding'`.

- [ ] **Step 3: Viết implementation**

Thêm vào `services/ai/app.py` (ngay sau hàm `_clip_predict_category`):
```python
def _clip_embedding(pil_rgba: Image.Image) -> list[float]:
    if not _ensure_clip_loaded():
        return []
    # Ghép RGBA lên nền xám trung tính giống _clip_predict_category
    bg = Image.new("RGB", pil_rgba.size, (127, 127, 127))
    bg.paste(pil_rgba, mask=pil_rgba.split()[-1])
    img_tensor = _clip_preprocess(bg).unsqueeze(0).to(CLIP_DEVICE)
    with torch.no_grad():
        feat = _clip_model.encode_image(img_tensor)
        feat = feat / feat.norm(dim=-1, keepdim=True)
    return feat[0].cpu().float().tolist()
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd services/ai && .venv/bin/python -m pytest tests/test_clip_embedding.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/ai/app.py services/ai/tests/test_clip_embedding.py
git commit -m "feat(ai): clip image embedding helper (512-d, normalized)"
```

---

### Task 3: `/parse-person` endpoint

**Files:**
- Modify: `services/ai/app.py` (thêm endpoint sau `/parse`, ~dòng 1208; thêm `from garment_parse import parse_garments` ở đầu file gần các import khác)
- Create: `services/ai/tests/test_parse_person_endpoint.py`

**Interfaces:**
- Consumes: `parse_garments` (Task 1), `_clip_embedding` (Task 2), `_read_upload_image_rgb`, `_build_cutout`, `_dominant_color_vi` (đã có).
- Produces: `POST /parse-person` (multipart `file`) → JSON
  `{"ok": true, "items": [{"slot","category","image_png_base64","colors","embedding","embeddingModel","bbox"}]}`.

- [ ] **Step 1: Viết test thất bại**

`services/ai/tests/test_parse_person_endpoint.py`:
```python
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
```
Cài test client nếu thiếu: `services/ai/.venv/bin/pip install httpx==0.28.1` (đã có theo lockfile).

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd services/ai && .venv/bin/python -m pytest tests/test_parse_person_endpoint.py -v`
Expected: FAIL — 404 (endpoint chưa tồn tại).

- [ ] **Step 3: Viết implementation**

Thêm import gần đầu `services/ai/app.py` (cạnh `import cv2`):
```python
from garment_parse import parse_garments
```
Thêm endpoint sau hàm `parse` (~dòng 1208):
```python
@app.post("/parse-person")
async def parse_person(file: UploadFile = File(...)):
    try:
        data = await file.read()
        if not data:
            return JSONResponse({"ok": False, "message": "Empty file"}, status_code=400)
        img_rgb = _read_upload_image_rgb(data)
        garments = parse_garments(img_rgb)
        items = []
        for g in garments:
            png_bytes, alpha_final, _mask, meta = _build_cutout(img_rgb, g["mask01"], crop=True)
            pil_rgba = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
            items.append({
                "slot": g["slot"],
                "category": g["category"],
                "image_png_base64": base64.b64encode(png_bytes).decode("ascii"),
                "colors": _dominant_color_vi(pil_rgba),
                "embedding": _clip_embedding(pil_rgba),
                "embeddingModel": "clip-vit-b32",
                "bbox": meta.get("roi", [0, 0, img_rgb.shape[1], img_rgb.shape[0]]),
            })
        return {"ok": True, "items": items}
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=500)
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd services/ai && .venv/bin/python -m pytest tests/test_parse_person_endpoint.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add services/ai/app.py services/ai/tests/test_parse_person_endpoint.py
git commit -m "feat(ai): POST /parse-person multi-garment endpoint"
```

---

### Task 4: Xóa code chết `networks/`

**Files:**
- Delete: `services/ai/networks/` (toàn bộ), `services/ai/utils/transforms.py` nếu chỉ phục vụ networks.

- [ ] **Step 1: Xác nhận không nơi nào import**

Run: `cd services/ai && grep -rn "networks\|AugmentCE2P\|utils.transforms" --include=*.py . | grep -v tests`
Expected: không có dòng nào trong code chạy (chỉ trong chính `networks/`).

- [ ] **Step 2: Xóa**

```bash
cd services/ai && git rm -r networks/
git rm utils/transforms.py   # chỉ khi grep ở Step 1 xác nhận không ai dùng
```

- [ ] **Step 3: Smoke import app**

Run: `cd services/ai && .venv/bin/python -c "import app; print('ok')"`
Expected: in `ok`.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(ai): remove dead human-parsing networks scaffolding"
```

---

### Task 5: Web test infra + item schema & slot mapping

**Files:**
- Modify: `apps/web/package.json` (devDeps + script `test`)
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/wardrobe/itemSchema.ts`
- Create: `apps/web/src/lib/wardrobe/itemSchema.test.ts`

**Interfaces:**
- Produces:
  - `WardrobeItemInputSchema` (zod) — validate payload 1 món gửi lên `confirm`.
  - `type WardrobeItemInput = z.infer<typeof WardrobeItemInputSchema>`.
  - `categoryToSlot(category: string): Slot` — suy slot từ category VN (cho backfill đồ cũ).
  - `type Slot = "top"|"bottom"|"dress"|"outerwear"|"shoes"|"bag"|"accessory"`.

- [ ] **Step 1: Thêm vitest**

Thêm vào `apps/web/package.json` `devDependencies`: `"vitest": "^2.1.8"`; thêm script `"test": "vitest run"`.
Cài: `pnpm --filter web add -D vitest@^2.1.8`.

`apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 2: Viết test thất bại**

`apps/web/src/lib/wardrobe/itemSchema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { WardrobeItemInputSchema, categoryToSlot } from "./itemSchema";

describe("WardrobeItemInputSchema", () => {
  it("accepts a full structured item", () => {
    const r = WardrobeItemInputSchema.safeParse({
      category: "Áo", slot: "top", subType: "áo sơ mi",
      image_png_base64: "abc",
      colors: { hex: "#ffffff", nameVi: "Trắng" },
      formality: 0.3, styleTags: ["minimal"], warmth: 0.4,
      embedding: [0.1], embeddingModel: "clip-vit-b32",
    });
    expect(r.success).toBe(true);
  });

  it("rejects formality out of range", () => {
    const r = WardrobeItemInputSchema.safeParse({
      category: "Áo", slot: "top", image_png_base64: "abc", formality: 5,
    });
    expect(r.success).toBe(false);
  });
});

describe("categoryToSlot", () => {
  it("maps VN categories", () => {
    expect(categoryToSlot("Quần")).toBe("bottom");
    expect(categoryToSlot("Giày")).toBe("shoes");
    expect(categoryToSlot("Đầm")).toBe("dress");
    expect(categoryToSlot("Khác")).toBe("accessory");
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test`
Expected: FAIL — không resolve được `./itemSchema`.

- [ ] **Step 4: Viết implementation**

`apps/web/src/lib/wardrobe/itemSchema.ts`:
```typescript
import { z } from "zod";

export const SLOTS = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"] as const;
export type Slot = (typeof SLOTS)[number];

export const WardrobeItemInputSchema = z.object({
  category: z.enum(["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"]),
  slot: z.enum(SLOTS),
  subType: z.string().max(80).default(""),
  image_png_base64: z.string().min(1),
  colors: z.object({ hex: z.string(), nameVi: z.string() }).nullable().default(null),
  formality: z.number().min(0).max(1).default(0.5),
  styleTags: z.array(z.string()).default([]),
  warmth: z.number().min(0).max(1).default(0.5),
  embedding: z.array(z.number()).default([]),
  embeddingModel: z.string().default("clip-vit-b32"),
  sourceImageId: z.string().nullable().default(null),
});
export type WardrobeItemInput = z.infer<typeof WardrobeItemInputSchema>;

const CAT_SLOT: Record<string, Slot> = {
  "Áo": "top", "Quần": "bottom", "Váy": "bottom",
  "Đầm": "dress", "Giày": "shoes", "Khác": "accessory",
};
export function categoryToSlot(category: string): Slot {
  return CAT_SLOT[category] ?? "accessory";
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/lib/wardrobe/ pnpm-lock.yaml
git commit -m "feat(web): wardrobe item zod schema + slot mapping + vitest"
```

---

### Task 6: `/api/wardrobe/parse-person` proxy route

**Files:**
- Create: `apps/web/src/app/api/wardrobe/parse-person/route.ts`
- Create: `apps/web/src/lib/wardrobe/aiClient.ts`
- Create: `apps/web/src/lib/wardrobe/aiClient.test.ts`

**Interfaces:**
- Consumes: env `AI_SERVICE_URL` (đã dùng cho `/parse` cũ — xem `apps/web/src/app/api/wardrobe/parse/route.ts`), Cloudinary env (đã cấu hình trong `confirm/route.ts`).
- Produces:
  - `parsePersonOnAi(file: Blob): Promise<{ ok: boolean; items: ParsedGarment[] }>`.
  - `type ParsedGarment = { slot: string; category: string; image_png_base64: string; colors: {hex:string;nameVi:string}|null; embedding: number[]; embeddingModel: string; bbox: number[] }`.
  - Route trả thêm `sourceImageId: string` — public_id ảnh người gốc đã upload lên Cloudinary `_sources/` (dùng cho try-on M2). Client thread giá trị này xuống review items.

- [ ] **Step 1: Viết test thất bại**

`apps/web/src/lib/wardrobe/aiClient.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { parsePersonOnAi } from "./aiClient";

afterEach(() => vi.restoreAllMocks());

describe("parsePersonOnAi", () => {
  it("posts file to AI service and returns items", async () => {
    const fake = { ok: true, items: [{ slot: "top", category: "Áo", image_png_base64: "x", colors: null, embedding: [], embeddingModel: "clip-vit-b32", bbox: [0,0,1,1] }] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(fake), { status: 200 })));
    const out = await parsePersonOnAi(new Blob(["img"]));
    expect(out.items[0].slot).toBe("top");
    expect((fetch as any).mock.calls[0][0]).toContain("/parse-person");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test src/lib/wardrobe/aiClient.test.ts`
Expected: FAIL — không resolve `./aiClient`.

- [ ] **Step 3: Viết implementation**

`apps/web/src/lib/wardrobe/aiClient.ts`:
```typescript
export type ParsedGarment = {
  slot: string;
  category: string;
  image_png_base64: string;
  colors: { hex: string; nameVi: string } | null;
  embedding: number[];
  embeddingModel: string;
  bbox: number[];
};

const AI_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

export async function parsePersonOnAi(file: Blob): Promise<{ ok: boolean; items: ParsedGarment[] }> {
  const fd = new FormData();
  fd.append("file", file, "person.jpg");
  const res = await fetch(`${AI_URL}/parse-person`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`AI parse-person failed: ${res.status}`);
  return res.json();
}
```

`apps/web/src/app/api/wardrobe/parse-person/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/firebaseAdmin";
import { parsePersonOnAi } from "@/lib/wardrobe/aiClient";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function getBearerToken(req: Request) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

async function uploadSource(buffer: Buffer, uid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `wardrobe/${uid}/_sources`, resource_type: "image" },
      (err, result) => (err || !result ? reject(err) : resolve(result.public_id!)),
    );
    stream.end(buffer);
  });
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
    const { uid } = await getAdmin().auth().verifyIdToken(token);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) return NextResponse.json({ ok: false, message: "Missing file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const [out, sourceImageId] = await Promise.all([
      parsePersonOnAi(new Blob([buffer])),
      uploadSource(buffer, uid),
    ]);
    return NextResponse.json({ ...out, sourceImageId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "parse-person failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test src/lib/wardrobe/aiClient.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/wardrobe/aiClient.ts apps/web/src/lib/wardrobe/aiClient.test.ts apps/web/src/app/api/wardrobe/parse-person/
git commit -m "feat(web): parse-person proxy route + ai client"
```

---

### Task 7: Mở rộng `label-item` — formality/styleTags/warmth qua Gemini

**Files:**
- Create: `apps/web/src/lib/ai/semanticTags.ts`
- Create: `apps/web/src/lib/ai/semanticTags.test.ts`
- Modify: `apps/web/src/app/api/wardrobe/label-item/route.ts` (gắn kết quả semantic vào response)

**Interfaces:**
- Consumes: `@google/genai` (đã có), env `GEMINI_API_KEY`, `GEMINI_MODEL`.
- Produces: `parseSemanticTags(raw: unknown): { formality: number; styleTags: string[]; warmth: number }` — chuẩn hóa + kẹp giá trị từ JSON Gemini trả về (dùng được độc lập, test thuần không gọi mạng).

- [ ] **Step 1: Viết test thất bại**

`apps/web/src/lib/ai/semanticTags.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseSemanticTags } from "./semanticTags";

describe("parseSemanticTags", () => {
  it("clamps formality/warmth to [0,1] and coerces tags", () => {
    const r = parseSemanticTags({ formality: 1.7, warmth: -2, styleTags: ["Minimal", 5] });
    expect(r.formality).toBe(1);
    expect(r.warmth).toBe(0);
    expect(r.styleTags).toEqual(["minimal"]);
  });

  it("falls back to defaults on garbage", () => {
    const r = parseSemanticTags(null);
    expect(r.formality).toBe(0.5);
    expect(r.warmth).toBe(0.5);
    expect(r.styleTags).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test src/lib/ai/semanticTags.test.ts`
Expected: FAIL — không resolve `./semanticTags`.

- [ ] **Step 3: Viết implementation**

`apps/web/src/lib/ai/semanticTags.ts`:
```typescript
import { GoogleGenAI } from "@google/genai";

export type SemanticTags = { formality: number; styleTags: string[]; warmth: number };

const clamp01 = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0.5;
  return Math.max(0, Math.min(1, v));
};

export function parseSemanticTags(raw: unknown): SemanticTags {
  const o = (raw ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(o.styleTags)
    ? o.styleTags.filter((t): t is string => typeof t === "string").map((t) => t.toLowerCase().trim()).filter(Boolean)
    : [];
  return { formality: clamp01(o.formality), styleTags: tags, warmth: clamp01(o.warmth) };
}

export async function geminiSemanticTags(pngBase64: string): Promise<SemanticTags> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return parseSemanticTags(null);
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview",
    contents: [{
      role: "user",
      parts: [
        { text: 'Phân tích món đồ. Trả JSON: {"formality":0..1 (0=thể thao,1=dạ tiệc),"warmth":0..1 (0=mát mẻ,1=giữ ấm),"styleTags":["minimal"|"streetwear"|...]}' },
        { inlineData: { mimeType: "image/png", data: pngBase64 } },
      ],
    }],
    config: { responseMimeType: "application/json" },
  });
  try {
    return parseSemanticTags(JSON.parse(res.text ?? "{}"));
  } catch {
    return parseSemanticTags(null);
  }
}
```

Trong `apps/web/src/app/api/wardrobe/label-item/route.ts`: sau khi có cutout base64, gọi `geminiSemanticTags(b64)` và thêm `formality/styleTags/warmth` vào object `label` trả về (cạnh `category/color` hiện có). Giữ nguyên phần category/color cũ.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test src/lib/ai/semanticTags.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/ai/semanticTags.ts apps/web/src/lib/ai/semanticTags.test.ts apps/web/src/app/api/wardrobe/label-item/route.ts
git commit -m "feat(web): gemini semantic tags (formality/style/warmth) in label-item"
```

---

### Task 8: Mở rộng `confirm` — persist schema mới + ảnh nguồn

**Files:**
- Create: `apps/web/src/lib/wardrobe/buildItemDoc.ts`
- Create: `apps/web/src/lib/wardrobe/buildItemDoc.test.ts`
- Modify: `apps/web/src/app/api/wardrobe/confirm/route.ts`

**Interfaces:**
- Consumes: `WardrobeItemInput` (Task 5).
- Produces: `buildItemDoc(uid: string, input: WardrobeItemInput, imageUrl: string, publicId: string): Record<string, unknown>` — tạo doc Firestore đầy đủ field schema v2 (trừ `createdAt` để route gắn serverTimestamp).

- [ ] **Step 1: Viết test thất bại**

`apps/web/src/lib/wardrobe/buildItemDoc.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildItemDoc } from "./buildItemDoc";

describe("buildItemDoc", () => {
  it("produces full structured doc", () => {
    const doc = buildItemDoc("u1", {
      category: "Áo", slot: "top", subType: "áo thun", image_png_base64: "x",
      colors: { hex: "#fff", nameVi: "Trắng" }, formality: 0.2, styleTags: ["casual"],
      warmth: 0.3, embedding: [0.1, 0.2], embeddingModel: "clip-vit-b32", sourceImageId: "src1",
    } as any, "https://img", "pid1");
    expect(doc.uid).toBe("u1");
    expect(doc.slot).toBe("top");
    expect(doc.wearCount).toBe(0);
    expect(doc.lastWornAt).toBe(null);
    expect(doc.labelStatus).toBe("auto");
    expect(doc.embedding).toEqual([0.1, 0.2]);
    expect(doc.imageUrl).toBe("https://img");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test src/lib/wardrobe/buildItemDoc.test.ts`
Expected: FAIL — không resolve `./buildItemDoc`.

- [ ] **Step 3: Viết implementation**

`apps/web/src/lib/wardrobe/buildItemDoc.ts`:
```typescript
import type { WardrobeItemInput } from "./itemSchema";

export function buildItemDoc(
  uid: string,
  input: WardrobeItemInput,
  imageUrl: string,
  publicId: string,
): Record<string, unknown> {
  return {
    uid,
    category: input.category,
    slot: input.slot,
    subType: input.subType ?? "",
    imageUrl,
    cloudinaryPublicId: publicId,
    colors: input.colors,
    formality: input.formality,
    styleTags: input.styleTags,
    warmth: input.warmth,
    embedding: input.embedding,
    embeddingModel: input.embeddingModel,
    wearCount: 0,
    lastWornAt: null,
    sourceImageId: input.sourceImageId ?? null,
    source: input.sourceImageId ? "segformer+refine" : "flatlay+sam",
    labelStatus: "auto",
  };
}
```

Trong `apps/web/src/app/api/wardrobe/confirm/route.ts`: thay block tạo `doc` (hiện chỉ `{uid, category, rawType, imageUrl, ...}`) bằng `buildItemDoc(uid, parsedInput, secure_url, public_id)` rồi gắn thêm `createdAt: serverTimestamp()`, `updatedAt: serverTimestamp()`. Validate `items` đầu vào bằng `WardrobeItemInputSchema` trước khi upload.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test src/lib/wardrobe/buildItemDoc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/wardrobe/buildItemDoc.ts apps/web/src/lib/wardrobe/buildItemDoc.test.ts apps/web/src/app/api/wardrobe/confirm/route.ts
git commit -m "feat(web): persist structured item schema v2 in confirm"
```

---

### Task 9: Backfill migration script cho đồ cũ

**Files:**
- Create: `apps/web/scripts/backfill-wardrobe.ts`
- Create: `apps/web/src/lib/wardrobe/backfillItem.ts`
- Create: `apps/web/src/lib/wardrobe/backfillItem.test.ts`

**Interfaces:**
- Consumes: `categoryToSlot` (Task 5).
- Produces: `backfillPatch(old: { category?: string }, embedding: number[], tags: { formality: number; styleTags: string[]; warmth: number }): Record<string, unknown>` — patch các field thiếu cho item cũ.

- [ ] **Step 1: Viết test thất bại**

`apps/web/src/lib/wardrobe/backfillItem.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { backfillPatch } from "./backfillItem";

describe("backfillPatch", () => {
  it("fills slot/embedding/tags for legacy item", () => {
    const p = backfillPatch({ category: "Quần" }, [0.1], { formality: 0.4, styleTags: ["casual"], warmth: 0.5 });
    expect(p.slot).toBe("bottom");
    expect(p.embedding).toEqual([0.1]);
    expect(p.embeddingModel).toBe("clip-vit-b32");
    expect(p.formality).toBe(0.4);
    expect(p.labelStatus).toBe("backfilled");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test src/lib/wardrobe/backfillItem.test.ts`
Expected: FAIL — không resolve `./backfillItem`.

- [ ] **Step 3: Viết implementation**

`apps/web/src/lib/wardrobe/backfillItem.ts`:
```typescript
import { categoryToSlot } from "./itemSchema";

export function backfillPatch(
  old: { category?: string },
  embedding: number[],
  tags: { formality: number; styleTags: string[]; warmth: number },
): Record<string, unknown> {
  return {
    slot: categoryToSlot(old.category ?? "Khác"),
    embedding,
    embeddingModel: "clip-vit-b32",
    formality: tags.formality,
    styleTags: tags.styleTags,
    warmth: tags.warmth,
    wearCount: 0,
    lastWornAt: null,
    labelStatus: "backfilled",
  };
}
```

`apps/web/scripts/backfill-wardrobe.ts` (orchestrator chạy 1 lần, không có test riêng — logic thuần đã test ở `backfillItem`):
```typescript
// Chạy: pnpm --filter web exec tsx scripts/backfill-wardrobe.ts
// Đọc mọi wardrobeItems thiếu `embedding`, tải imageUrl -> /parse-person? Không:
// item cũ là cutout 1 món -> gọi AI /label + /cutout để lấy embedding, Gemini cho tags.
// Với mỗi doc: fetch imageUrl -> POST tới AI service lấy embedding -> geminiSemanticTags -> backfillPatch -> update.
import { getAdmin } from "../src/lib/firebaseAdmin";
import { geminiSemanticTags } from "../src/lib/ai/semanticTags";
import { backfillPatch } from "../src/lib/wardrobe/backfillItem";

async function main() {
  const db = getAdmin().firestore();
  const snap = await db.collection("wardrobeItems").get();
  for (const d of snap.docs) {
    const data = d.data();
    if (Array.isArray(data.embedding) && data.embedding.length > 0) continue;
    const imgRes = await fetch(data.imageUrl);
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/label`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_png_base64: b64, backend: "clip" }),
    });
    const emb: number[] = (await aiRes.json())?.embedding ?? [];
    const tags = await geminiSemanticTags(b64);
    await d.ref.update(backfillPatch(data, emb, tags));
    console.log("backfilled", d.id);
  }
}
main().then(() => process.exit(0));
```
Lưu ý: cần thêm field `embedding` vào response của `/label` (Python) — thêm 1 dòng `"embedding": _clip_embedding(pil)` trong handler `/label` (tái dùng Task 2). Thêm `tsx` devDep nếu chưa có: `pnpm --filter web add -D tsx`.

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test src/lib/wardrobe/backfillItem.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/wardrobe/backfillItem.ts apps/web/src/lib/wardrobe/backfillItem.test.ts apps/web/scripts/backfill-wardrobe.ts apps/web/package.json pnpm-lock.yaml services/ai/app.py
git commit -m "feat(web): wardrobe backfill script + embedding in /label"
```

---

### Task 10: Viết lại `WardrobeUploader` — 2 chế độ + review grid + SAM-click

**Files:**
- Create: `apps/web/src/lib/wardrobe/uploadOrchestrator.ts`
- Create: `apps/web/src/lib/wardrobe/uploadOrchestrator.test.ts`
- Modify: `apps/web/src/components/WardrobeUploader.tsx`

**Interfaces:**
- Consumes: `parsePersonOnAi` (Task 6 client – nhưng component gọi qua route `/api/wardrobe/parse-person`), `WardrobeItemInput` (Task 5).
- Produces:
  - `type ReviewItem = WardrobeItemInput & { keep: boolean; id: string }`.
  - `garmentsToReviewItems(garments: ParsedGarment[], sourceImageId: string | null): ReviewItem[]`.
  - `reviewItemsToConfirmPayload(items: ReviewItem[]): WardrobeItemInput[]` — chỉ lấy `keep === true`, bỏ field UI.

- [ ] **Step 1: Viết test thất bại**

`apps/web/src/lib/wardrobe/uploadOrchestrator.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { garmentsToReviewItems, reviewItemsToConfirmPayload } from "./uploadOrchestrator";

const g = {
  slot: "top", category: "Áo", image_png_base64: "x",
  colors: { hex: "#fff", nameVi: "Trắng" }, embedding: [0.1], embeddingModel: "clip-vit-b32", bbox: [0,0,1,1],
};

describe("uploadOrchestrator", () => {
  it("maps parsed garments to review items (kept by default)", () => {
    const items = garmentsToReviewItems([g as any], "src1");
    expect(items[0].keep).toBe(true);
    expect(items[0].slot).toBe("top");
    expect(items[0].sourceImageId).toBe("src1");
    expect(items[0].id).toBeTruthy();
  });

  it("drops unkept items and strips UI fields in payload", () => {
    const items = garmentsToReviewItems([g as any, g as any], null);
    items[1].keep = false;
    const payload = reviewItemsToConfirmPayload(items);
    expect(payload).toHaveLength(1);
    expect((payload[0] as any).keep).toBeUndefined();
    expect((payload[0] as any).id).toBeUndefined();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `pnpm --filter web test src/lib/wardrobe/uploadOrchestrator.test.ts`
Expected: FAIL — không resolve `./uploadOrchestrator`.

- [ ] **Step 3: Viết implementation**

`apps/web/src/lib/wardrobe/uploadOrchestrator.ts`:
```typescript
import type { ParsedGarment } from "./aiClient";
import type { WardrobeItemInput } from "./itemSchema";

export type ReviewItem = WardrobeItemInput & { keep: boolean; id: string };

export function garmentsToReviewItems(garments: ParsedGarment[], sourceImageId: string | null): ReviewItem[] {
  return garments.map((g, i) => ({
    keep: true,
    id: `${Date.now()}-${i}`,
    category: g.category as WardrobeItemInput["category"],
    slot: g.slot as WardrobeItemInput["slot"],
    subType: "",
    image_png_base64: g.image_png_base64,
    colors: g.colors,
    formality: 0.5,
    styleTags: [],
    warmth: 0.5,
    embedding: g.embedding,
    embeddingModel: g.embeddingModel,
    sourceImageId,
  }));
}

export function reviewItemsToConfirmPayload(items: ReviewItem[]): WardrobeItemInput[] {
  return items.filter((it) => it.keep).map(({ keep, id, ...rest }) => rest);
}
```

Trong `apps/web/src/components/WardrobeUploader.tsx`: thêm tab/chế độ "Ảnh người mặc" gọi `POST /api/wardrobe/parse-person`, dùng `garmentsToReviewItems` để render review grid (mỗi món: checkbox keep, select slot/category, nút "Sửa mask" mở SAM-click qua `/api/wardrobe/parse` cũ với điểm bấm). Khi "Lưu", gọi `reviewItemsToConfirmPayload` → `POST /api/wardrobe/confirm`. Giữ nguyên chế độ ảnh lẻ hiện có. Semantic tags (formality/style/warmth) được điền từ `label-item` trước khi confirm (gọi song song cho các item `keep`).

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `pnpm --filter web test src/lib/wardrobe/uploadOrchestrator.test.ts`
Expected: PASS.

- [ ] **Step 5: Build web để chắc UI không vỡ type**

Run: `pnpm --filter web build`
Expected: build thành công.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/wardrobe/uploadOrchestrator.ts apps/web/src/lib/wardrobe/uploadOrchestrator.test.ts apps/web/src/components/WardrobeUploader.tsx
git commit -m "feat(web): multi-garment upload flow with review grid + sam-click"
```

---

### Task 11: E2E smoke verify

**Files:** (không tạo file; kiểm thử thủ công có hướng dẫn)

- [ ] **Step 1: Chạy AI service**

Run: `cd services/ai && SAM_CHECKPOINT=checkpoints/mobile_sam.pt .venv/bin/python -m uvicorn app:app --port 8000`
Expected: `/health` trả `sam_ready: true`.

- [ ] **Step 2: Chạy web**

Run: `pnpm --filter web dev`
Expected: web lên `http://localhost:3000`.

- [ ] **Step 3: Smoke luồng người mặc**

Đăng nhập → trang upload → chọn "Ảnh người mặc" → upload ảnh 1 người mặc áo+quần → review grid hiện ≥2 món với slot đúng → bỏ tick 1 món → Lưu → trang wardrobe hiện các item mới.
Expected: Firestore doc mới có `slot`, `formality`, `embedding` (length 512), `sourceImageId`.

- [ ] **Step 4: Smoke luồng ảnh lẻ (không hồi quy)**

Chọn "Ảnh lẻ" → upload 1 ảnh áo flat-lay → tách → Lưu.
Expected: vẫn hoạt động như trước, item lưu được.

- [ ] **Step 5: Commit (nếu có chỉnh nhỏ)**

```bash
git commit -am "test(m1a): e2e smoke fixes" --allow-empty
```
