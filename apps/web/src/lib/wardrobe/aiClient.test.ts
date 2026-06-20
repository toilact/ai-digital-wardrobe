import { describe, it, expect, vi, afterEach } from "vitest";
import { parsePersonOnAi } from "./aiClient";

afterEach(() => vi.restoreAllMocks());

describe("parsePersonOnAi", () => {
  it("posts file to AI service and returns items", async () => {
    const fake = { ok: true, items: [{ slot: "top", category: "Áo", image_png_base64: "x", colors: null, embedding: [], embeddingModel: "clip-vit-b32", bbox: [0,0,1,1] }] };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(fake), { status: 200 })));
    const out = await parsePersonOnAi(new Blob(["img"]));
    expect(out.items[0].slot).toBe("top");
    expect((fetch as any).mock.calls[0][0]).toContain("/parse-person");
  });
});
