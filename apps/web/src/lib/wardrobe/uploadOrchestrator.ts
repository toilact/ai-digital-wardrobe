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
