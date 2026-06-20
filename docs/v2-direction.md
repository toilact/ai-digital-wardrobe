# AI Digital Wardrobe — Định hướng v2

> Chốt sau buổi grill ngày 2026-06-20. Đây là bản hiểu chung về hướng đi, KHÔNG phải plan thực thi.
> Plan chi tiết từng milestone nằm ở `docs/superpowers/plans/`.

## Mục tiêu (3-trong-1, đã hòa giải)

Sản phẩm thật cho user + đồ án thi **hackathon** + sân chơi tự build model CV/LLM.

**Nguyên tắc hòa giải xung đột:** model tự-build được train **TRƯỚC** hackathon, đóng vai "moat" kỹ thuật; trong hackathon chỉ polish trải nghiệm sản phẩm. Khi "tự build model" đụng "ổn định sản phẩm" → ưu tiên ổn định cho phần demo, để phần model nặng ở chế độ chuẩn bị sẵn.

**Compute:** MacBook Pro M5 24GB (MPS) cho inference local + Kaggle T4×2 cho training. → Không train parser/diffusion từ scratch; dùng pretrained + fine-tune nhẹ.

## Cây phụ thuộc

```
[NỀN MÓNG] Multi-garment parsing → tủ đồ có cấu trúc trong DB
      ├──► Recommendation + chấm điểm outfit   (cần item embedding/thuộc tính)
      └──► Virtual try-on                        (cần cutout sạch + ảnh người)
                  └──► Thương mại hóa (affiliate + thử đồ shop)
```
Không có nền parsing có cấu trúc → không tính năng nào phía sau có dữ liệu để chạy.

## Milestone 1 — Nền móng + Recommendation (ưu tiên, ít rủi ro)

1. **Tách toàn bộ đồ trên người:** `segformer_b2_clothes` (HuggingFace, pretrained, chạy MPS) → mask full-body kèm sẵn nhãn category → cắt từng món → tái dùng pipeline alpha-matting + MobileSAM hiện có để tinh chỉnh viền → lưu DB **có cấu trúc**.
   - Thay hẳn luồng single-item hiện tại (`/cutout` 1 món).
   - Xóa mạng `AugmentCE2P`/`networks` (code chết, chưa từng được wire).
2. **Định nghĩa "đẹp" = 4 trục đo được (label space):**
   - Màu — color harmony (luật, từ màu chủ đạo đã trích).
   - Dịp/formality — công sở/dạo phố/tiệc (luật + thuộc tính + thời tiết đã có).
   - Style compatibility — **model học**.
   - Gu cá nhân — **tầng re-rank cá nhân hóa**.
   - Kiến trúc 2 tầng: compatibility khách quan ở dưới, re-rank theo gu ở trên.
3. **Model chấm điểm = Outfit Transformer trên đặc trưng CLIP (ViT-B/32 frozen)**, train trên **Polyvore** (outfit curated = mẫu dương) tại Kaggle.
4. **Trục gu:** cold-start bằng **onboarding quiz phong cách** (user chọn vài outfit/style lúc đăng ký → vector gu ban đầu), học tiếp từ like/lịch sử mặc in-app.
5. **Phân vai model vs LLM:** model duyệt tổ hợp → chấm điểm 4 trục → chọn top; **Gemini nhận điểm + lý do rồi diễn giải/tư vấn** bằng ngôn ngữ tự nhiên. Model = bộ não, LLM = cái miệng.
6. **Xử lý ngay:** gỡ code gọi INFIP (đã down) khỏi `outfit-suggest`; tạm trả **text-only + điểm**. Visualization quay lại đúng nghĩa ở Milestone 2.

## Milestone 2 — Virtual Try-on

Self-host model try-on **open-source** (CatVTON / OOTDiffusion / IDM-VTON) trên GPU Space/Kaggle → sinh ảnh user mặc đồ có sẵn trong tủ. Mục tiêu sản phẩm: tái sử dụng trang phục, tối ưu tài chính. Có thể thêm fallback API nếu demo cần chắc.

## Milestone 3 — Thương mại hóa

**Affiliate + try-on đồ shop:** liên kết shop có sẵn (Shopee/brand local), kéo catalog về; user chán đồ → gợi ý mua → **thử đồ mới ảo** (dùng VTON ở M2) → mua qua link affiliate. KHÔNG ôm kho/thanh toán/vận chuyển.

## Còn treo — resolve ở bước lập kế hoạch

- **Schema DB mới:** item có cấu trúc cần field gì (category, color, occasion, style-embedding, wear-count...) — đụng Firebase hiện tại.
- **Candidate generation:** tủ nhiều món → tổ hợp outfit bùng nổ; cần chiến lược sinh ứng viên trước khi cho Outfit Transformer chấm set.
- **Gộp 4 trục thành 1 điểm:** trọng số tay vs học.
- **Polyvore:** license/định dạng; độ lệch văn hóa (chấp nhận, vá bằng tín hiệu in-app).
- **Dọn nợ tech song song:** 2 SDK Google AI (`@google/genai` + `@google/generative-ai`) + `openai` dư thừa.
