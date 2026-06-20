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
