import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const toJsonSchema = zodToJsonSchema as unknown as (schema: unknown) => unknown;

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY in .env.local (restart dev server).");
  return new GoogleGenAI({ apiKey: key });
}

// ✅ Schema nhỏ: chỉ những gì model phải trả
const ModelOutSchema = z.object({
  needMoreInfo: z.boolean().optional().default(false),
  question: z.string().nullable().optional().transform((v) => v ?? ""),
  options: z
    .array(
      z.object({
        title: z.string(),
        pieces: z
          .array(
            z.object({
              slot: z.string(),
              source: z.enum(["wardrobe", "suggested"]).default("suggested"),
              wardrobeItemId: z.string().nullable().optional().default(null),
              name: z.string(),
              note: z.string().optional().default(""),
            })
          )
          .default([]),
        why: z.string().optional().default(""),
        do: z.array(z.string()).optional().default([]),
        dont: z.array(z.string()).optional().default([]),
      })
    )
    .optional()
    .default([]),
  tips: z.array(z.string()).optional().default([]),
  missingItems: z.array(z.string()).optional().default([]),
});

export type ModelOut = z.infer<typeof ModelOutSchema>;

export async function generateOutfitGemini(input: {
  occasion: string;
  style?: string;
  weather: unknown; // server có weather để làm context, nhưng model không phải trả weather
  wardrobeItems: Array<unknown>;
}): Promise<ModelOut> {
  const ai = getGeminiClient();

  const prompt = `
Bạn là stylist thời trang (Việt Nam).

Bạn sẽ nhận:
- weather (chỉ để tham khảo)
- occasion (đi đâu)
- style (tuỳ chọn)
- wardrobeItems (danh sách đồ user có)

NHIỆM VỤ:
- Trả về JSON theo schema (KHÔNG được trả text ngoài JSON).
- KHÔNG được tạo field "weather" trong output.
- Nếu thiếu thông tin quan trọng: needMoreInfo=true và hỏi đúng 1 câu trong "question".
- Nếu đủ: trả 3 options outfit.

INPUT:
${JSON.stringify(input, null, 2)}
`;

  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: toJsonSchema(ModelOutSchema),
    },
  });

  const raw =
    // @ts-expect-error
    (typeof res?.response?.text === "function" ? await res.response.text() : null) ??
    (typeof res?.text === "string" ? res.text : null) ??
    "";

  if (!raw.trim()) throw new Error("Gemini returned empty response text");

  return ModelOutSchema.parse(JSON.parse(raw));
}

export async function geminiOutfit(prompt: string): Promise<string> {
  const ai = getGeminiClient();

  const model =
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3-flash-preview";

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const raw =
    (typeof (res as any)?.text === "string" ? (res as any).text : "") ||
    (typeof (res as any)?.response?.text === "function"
      ? await (res as any).response.text()
      : "") ||
    "";

  if (!raw.trim()) throw new Error("Gemini returned empty response text");
  return raw.trim();
}