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
