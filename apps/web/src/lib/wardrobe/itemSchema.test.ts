import { describe, it, expect } from "vitest";
import { WardrobeItemInputSchema, categoryToSlot } from "./itemSchema";

describe("WardrobeItemInputSchema", () => {
  it("accepts a full structured item", () => {
    const r = WardrobeItemInputSchema.safeParse({
      category: "Áo", slot: "top", subType: "áo sơ mi",
      image_png_base64: "abc",
      colors: { hex: "#ffffff", nameVi: "Trắng" },
      formality: 0.3, styleTags: ["minimal"], warmth: 0.4,
      embedding: [0.1], embeddingModel: "clip-vit-b32",
    });
    expect(r.success).toBe(true);
  });

  it("rejects formality out of range", () => {
    const r = WardrobeItemInputSchema.safeParse({
      category: "Áo", slot: "top", image_png_base64: "abc", formality: 5,
    });
    expect(r.success).toBe(false);
  });
});

describe("categoryToSlot", () => {
  it("maps VN categories", () => {
    expect(categoryToSlot("Quần")).toBe("bottom");
    expect(categoryToSlot("Giày")).toBe("shoes");
    expect(categoryToSlot("Đầm")).toBe("dress");
    expect(categoryToSlot("Khác")).toBe("accessory");
  });
});
