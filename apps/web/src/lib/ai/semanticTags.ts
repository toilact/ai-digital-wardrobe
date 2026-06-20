import { GoogleGenAI } from "@google/genai";

export type SemanticTags = { formality: number; styleTags: string[]; warmth: number };

const clamp01 = (n: unknown): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0.5;
  return Math.max(0, Math.min(1, v));
};

export function parseSemanticTags(raw: unknown): SemanticTags {
  const o = (raw ?? {}) as Record<string, unknown>;
  const tags = Array.isArray(o.styleTags)
    ? o.styleTags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean)
    : [];
  return { formality: clamp01(o.formality), styleTags: tags, warmth: clamp01(o.warmth) };
}

export async function geminiSemanticTags(pngBase64: string): Promise<SemanticTags> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return parseSemanticTags(null);
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: 'Phân tích món đồ. Trả JSON: {"formality":0..1 (0=thể thao,1=dạ tiệc),"warmth":0..1 (0=mát mẻ,1=giữ ấm),"styleTags":["minimal"|"streetwear"|...]}',
          },
          { inlineData: { mimeType: "image/png", data: pngBase64 } },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });
  try {
    return parseSemanticTags(JSON.parse(res.text ?? "{}"));
  } catch {
    return parseSemanticTags(null);
  }
}
