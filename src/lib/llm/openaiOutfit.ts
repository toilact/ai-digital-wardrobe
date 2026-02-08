import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { OutfitResponseSchema, type OutfitResponse } from "@/lib/outfitSchema";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateOutfitOpenAI(input: {
  occasion: string;
  style?: string;
  weather: any;
  wardrobeItems: Array<any>;
}): Promise<OutfitResponse> {
  const system = `
Bạn là stylist thời trang (Việt Nam).
Nhiệm vụ: dựa trên THỜI TIẾT HIỆN TẠI và DỊP ĐI (occasion) để đề xuất outfit.

Ưu tiên:
- ƯU TIÊN dùng đồ có sẵn trong "wardrobeItems" (nếu hợp).
- Nếu trời mưa: ưu tiên đồ nhanh khô, giày kín, gợi ý áo khoác/ô.
- Nếu nóng: ưu tiên thoáng, thấm hút, màu sáng.
- Trả về 3 options nếu đủ dữ liệu.
- Nếu thiếu thông tin quan trọng, set needMoreInfo=true và hỏi đúng 1 câu.

Bắt buộc trả JSON đúng schema.
`;

  const resp = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    input: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(input) },
    ],
    text: { format: zodTextFormat(OutfitResponseSchema, "outfit_suggestion") },
  });

  const parsed = resp.output_parsed;

  // ✅ quan trọng: output_parsed có thể null
  if (!parsed) {
    throw new Error("Model returned null/invalid structured output");
  }

  // ✅ validate lại cho chắc kiểu
  return OutfitResponseSchema.parse(parsed);
}
