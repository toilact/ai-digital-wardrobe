import { describe, it, expect } from "vitest";
import { buildItemDoc } from "./buildItemDoc";

describe("buildItemDoc", () => {
  it("produces full structured doc", () => {
    const doc = buildItemDoc("u1", {
      category: "Áo", slot: "top", subType: "áo thun", image_png_base64: "x",
      colors: { hex: "#fff", nameVi: "Trắng" }, formality: 0.2, styleTags: ["casual"],
      warmth: 0.3, embedding: [0.1, 0.2], embeddingModel: "clip-vit-b32", sourceImageId: "src1",
    } as any, "https://img", "pid1");
    expect(doc.uid).toBe("u1");
    expect(doc.slot).toBe("top");
    expect(doc.wearCount).toBe(0);
    expect(doc.lastWornAt).toBe(null);
    expect(doc.labelStatus).toBe("auto");
    expect(doc.embedding).toEqual([0.1, 0.2]);
    expect(doc.imageUrl).toBe("https://img");
  });
});
