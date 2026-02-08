import { z } from "zod";

export const OutfitSlot = z.enum([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "bag",
  "accessory",
]);

export const OutfitPiece = z.object({
  slot: OutfitSlot,
  source: z.enum(["wardrobe", "suggested"]),
  wardrobeItemId: z.string().nullable().default(null),
  name: z.string(),
  note: z.string().default(""),
});

export const OutfitOption = z.object({
  title: z.string(),
  pieces: z.array(OutfitPiece).default([]),
  why: z.string().default(""),
  do: z.array(z.string()).default([]),
  dont: z.array(z.string()).default([]),
});

// ✅ weather schema riêng
export const WeatherSchema = z.object({
  tempC: z.number(),
  feelsLikeC: z.number(),
  condition: z.string(),
  rainMm: z.number(),
  windKmh: z.number(),
});

export const OutfitResponseSchema = z.object({
  needMoreInfo: z.boolean().default(false),

  // ✅ cho phép null/undefined và auto thành ""
  question: z.string().nullable().optional().transform((v) => v ?? ""),

  // ✅ weather sẽ được server gắn vào, nhưng vẫn giữ schema để validate
  weather: WeatherSchema,

  // ✅ các mảng default [] để khỏi undefined
  options: z.array(OutfitOption).default([]),
  tips: z.array(z.string()).default([]),
  missingItems: z.array(z.string()).default([]),
});

export type OutfitResponse = z.infer<typeof OutfitResponseSchema>;
