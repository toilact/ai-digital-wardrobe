import { describe, it, expect } from "vitest";
import { backfillPatch } from "./backfillItem";

describe("backfillPatch", () => {
  it("fills slot/embedding/tags for legacy item", () => {
    const p = backfillPatch({ category: "Quần" }, [0.1], { formality: 0.4, styleTags: ["casual"], warmth: 0.5 });
    expect(p.slot).toBe("bottom");
    expect(p.embedding).toEqual([0.1]);
    expect(p.embeddingModel).toBe("clip-vit-b32");
    expect(p.formality).toBe(0.4);
    expect(p.labelStatus).toBe("backfilled");
    expect(p.wearCount).toBe(0);
    expect(p.lastWornAt).toBe(null);
    expect(p.styleTags).toEqual(["casual"]);
    expect(p.warmth).toBe(0.5);
  });
});
