# M1a — Nền móng & Tủ đồ có cấu trúc (Design)

> Sub-project đầu của Milestone 1 (xem `docs/v2-direction.md`). Spec này CHỈ bao M1a.
> M1b (Recommendation) là spec riêng, làm sau khi M1a xong.

## Mục tiêu

Thay luồng "1 ảnh = 1 món" bằng khả năng **upload 1 ảnh người mặc → tách tất cả món trên người → tinh chỉnh → lưu vào tủ đồ có cấu trúc**, đồng thời vẫn giữ đường thêm món lẻ (flat-lay). Đầu ra là dữ liệu item đủ giàu để M1b (recommendation) và M2 (try-on) đứng lên trên.

## Quyết định đã chốt (từ buổi brainstorm 2026-06-20)

- **Input model:** cả hai — ảnh người (multi-garment) + ảnh lẻ (flat-lay, giữ luồng `/cutout` cũ).
- **Refine UX:** auto refine + duyệt giữ/bỏ + sửa nhãn + **SAM-click** sửa mask (tái dùng MobileSAM endpoint sẵn có).
- **Trục dịp:** `formality` thang liên tục per-item (0→1), không nhãn dịp cứng.
- **Label engine:** hybrid — local lo category/màu/CLIP-embedding; Gemini gán formality + styleTags + warmth (cache 1 lần/món).
- **Kiến trúc pipeline:** Phương án A — mở rộng FastAPI service hiện có thêm `/parse-person`, tái dùng pipeline alpha-matting/crop/màu/SAM-click.

## Luồng end-to-end

```
[Ảnh người mặc]                          [Ảnh lẻ / flat-lay]
      │                                         │
      ▼ POST /api/wardrobe/parse-person         ▼ (luồng /cutout cũ, giữ nguyên)
  Python: Segformer → mask từng món
        → reuse alpha-matting refine + crop + màu
        → CLIP embedding (đã load sẵn)
        → trả [{ slot, category, cutout, color, embedding, bbox }]
      │
      ▼ Màn duyệt (review grid)
   mỗi món: giữ/bỏ · sửa nhãn · SAM-click sửa mask (POST /cutout, đã có)
      │
      ▼ gán nhãn ngữ nghĩa: Gemini → formality (0..1) + styleTags  (cache)
      │
      ▼ POST /api/wardrobe/confirm (mở rộng) → Cloudinary + Firestore (schema mới)
```

## Schema `wardrobeItems` (v2)

```jsonc
{
  "uid": "...",
  // định danh
  "category": "Áo|Quần|Váy|Đầm|Giày|Khác",            // GIỮ — tương thích UI/list cũ
  "slot": "top|bottom|dress|outerwear|shoes|bag|accessory", // MỚI — khớp OutfitSlot trong outfitSchema.ts
  "subType": "áo sơ mi",                                // rawType cũ, đổi tên
  // hình ảnh
  "imageUrl": "...", "cloudinaryPublicId": "...",
  "colors": [{ "nameVi": "Trắng", "hex": "#ffffff", "ratio": 0.7 }],
  // ngữ nghĩa (hybrid label)
  "formality": 0.3,                                     // 0=thể thao → 1=dạ tiệc
  "styleTags": ["minimal", "casual"],
  "warmth": 0.4,                                        // phục vụ trục thời tiết
  // ML
  "embedding": [/* 512 floats */], "embeddingModel": "clip-vit-b32",
  // sử dụng / nguồn gốc
  "wearCount": 0, "lastWornAt": null,
  "sourceImageId": "wardrobe/<uid>/_sources/<id>",      // ảnh người gốc — cho try-on M2
  "source": "segformer+refine | flatlay+sam",
  "labelStatus": "auto | edited",
  "createdAt": "...", "updatedAt": "..."
}
```

Quyết định kèm theo:
- **Embedding tính ở Python** (CLIP đã load) và trả về luôn lúc parse → lưu thẳng vào item; M1b khỏi tính lại.
- **Lưu ảnh người gốc** vào Cloudinary (`_sources/`) + `sourceImageId` để M2 try-on dùng làm nền.
- Giữ `category` tiếng Việt để không phá UI/list hiện tại; `slot` phục vụ tầng reco.

## Category → slot mapping (Segformer `mattmdjaga/segformer_b2_clothes`, 18 lớp ATR)

| Segformer label | slot | category (VN) |
|---|---|---|
| upper-clothes | top | Áo |
| dress | dress | Đầm |
| skirt | bottom | Váy |
| pants | bottom | Quần |
| left-shoe + right-shoe | shoes | Giày (gộp L+R thành 1 đôi) |
| bag | bag | Khác |
| hat, scarf, sunglasses, belt | accessory | Khác |
| background, hair, face, arm(L/R), leg(L/R) | — | (bỏ — không phải đồ) |

`outerwear`: Segformer không tách áo khoác khỏi `upper-clothes` → để Gemini tinh chỉnh `subType`/`slot=outerwear` ở bước gán nhãn ngữ nghĩa.

## Endpoints & file đổi

| Endpoint / file | Trạng thái | Việc |
|---|---|---|
| `POST /parse-person` (Python `services/ai/app.py`) | mới | Segformer → mask từng món → refine/crop/màu/embedding → trả list |
| `POST /cutout` (Python) | giữ | flat-lay lẻ + SAM-click sửa mask (đã có) |
| `POST /api/wardrobe/parse-person` (web) | mới | proxy → Python, trả cutouts cho màn duyệt |
| `POST /api/wardrobe/label-item` (web) | mở rộng | thêm formality + styleTags qua Gemini (cache) |
| `POST /api/wardrobe/confirm` (web) | mở rộng | persist schema mới + lưu ảnh nguồn |
| `apps/web/src/components/WardrobeUploader.tsx` | viết lại | 2 chế độ input + review grid + SAM-click |

Dọn kèm: xóa code chết `services/ai/networks/AugmentCE2P.py` + `services/ai/networks/` (chưa từng được wire).

## Migration đồ cũ

Item cũ thiếu `slot/formality/embedding/colors`. → **Script backfill chạy 1 lần**: đọc `imageUrl` → tính CLIP embedding + suy `slot` từ `category` + Gemini gán formality/styleTags/warmth. Bắt buộc chạy **trước M1b** (M1b cần embedding). Item cũ vẫn hiển thị bình thường trong lúc chờ (đã có `category`+`imageUrl`).

## Testing

- **Python:** unit test `/parse-person` trên vài ảnh người mẫu (mặc ≥2 món) → trả ≥2 món, slot đúng kỳ vọng, mask non-empty, `embedding` dài 512.
- **Web:** zod validate item schema mới; `confirm` ghi đủ field xuống Firestore.
- **E2E smoke:** upload ảnh người → review grid hiện nhiều món → sửa 1 món bằng SAM-click → confirm → `list` hiện item có cấu trúc.

## Ngoài phạm vi M1a

- Material / brand / giá (để M3 shopping).
- Trục gu + onboarding quiz + Outfit Transformer scoring (M1b).
- Virtual try-on (M2).
- Editor mask đầy đủ (brush/eraser) — chỉ làm SAM-click ở M1a.
