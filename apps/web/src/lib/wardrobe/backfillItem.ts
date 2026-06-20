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
