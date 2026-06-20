import { describe, it, expect } from "vitest";
import { parseSemanticTags } from "./semanticTags";

describe("parseSemanticTags", () => {
  it("clamps formality/warmth to [0,1] and coerces tags", () => {
    const r = parseSemanticTags({ formality: 1.7, warmth: -2, styleTags: ["Minimal", 5] });
    expect(r.formality).toBe(1);
    expect(r.warmth).toBe(0);
    expect(r.styleTags).toEqual(["minimal"]);
  });

  it("falls back to defaults on garbage", () => {
    const r = parseSemanticTags(null);
    expect(r.formality).toBe(0.5);
    expect(r.warmth).toBe(0.5);
    expect(r.styleTags).toEqual([]);
  });
});
