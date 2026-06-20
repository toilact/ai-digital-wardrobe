import { describe, it, expect } from "vitest";
import { garmentsToReviewItems, reviewItemsToConfirmPayload } from "./uploadOrchestrator";

const g = {
  slot: "top", category: "Áo", image_png_base64: "x",
  colors: { hex: "#fff", nameVi: "Trắng" }, embedding: [0.1], embeddingModel: "clip-vit-b32", bbox: [0,0,1,1],
};

describe("uploadOrchestrator", () => {
  it("maps parsed garments to review items (kept by default)", () => {
    const items = garmentsToReviewItems([g as any], "src1");
    expect(items[0].keep).toBe(true);
    expect(items[0].slot).toBe("top");
    expect(items[0].sourceImageId).toBe("src1");
    expect(items[0].id).toBeTruthy();
  });

  it("drops unkept items and strips UI fields in payload", () => {
    const items = garmentsToReviewItems([g as any, g as any], null);
    items[1].keep = false;
    const payload = reviewItemsToConfirmPayload(items);
    expect(payload).toHaveLength(1);
    expect((payload[0] as any).keep).toBeUndefined();
    expect((payload[0] as any).id).toBeUndefined();
  });
});
