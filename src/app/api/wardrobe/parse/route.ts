// src/app/api/wardrobe/parse/route.ts
import { NextResponse } from "next/server";
import { labelWardrobeItemSimpleFromPngBase64, type SimpleLabel } from "@/lib/ai/labelItem";

export const runtime = "nodejs";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

// LABEL_STRATEGY:
// - "openai": giữ tên env cũ để tương thích, nhưng thực tế gọi model local qua /label
// - "hybrid": chỉ gọi model local nếu service hint yếu / thiếu
// - "service": chỉ dùng hint từ ai-service
// - "none": không label
const LABEL_STRATEGY = (process.env.LABEL_STRATEGY || "service").toLowerCase();
const HYBRID_MIN_CONF = Number(process.env.LABEL_HYBRID_MIN_CONF ?? "0.35");

type AIItem = {
  type: string;
  image_png_base64: string;
  meta?: any;
  mask_png_base64?: string;
};

type AIResponse = {
  ok: boolean;
  items: AIItem[];
  message?: string;
};

const ALLOWED_CATS = new Set(["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"]);
function safeCat(x: any): string | undefined {
  return typeof x === "string" && ALLOWED_CATS.has(x) ? x : undefined;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    const x = form.get("x")?.toString();
    const y = form.get("y")?.toString();

    if (!file) {
      return NextResponse.json({ ok: false, message: "Missing file" }, { status: 400 });
    }
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image files are allowed" }, { status: 400 });
    }

    const aiForm = new FormData();
    aiForm.append("file", file);
    aiForm.append("item_type", "item");
    aiForm.append("crop", "true");
    aiForm.append("output", "base64");

    const wantServiceHint = LABEL_STRATEGY !== "none";
    aiForm.append("auto_label", wantServiceHint ? "true" : "false");
    aiForm.append("label_backend", wantServiceHint ? "clip" : "none");

    if (x && y) {
      aiForm.append("x", x);
      aiForm.append("y", y);
    }

    const aiRes = await fetch(`${AI_SERVICE_URL}/cutout`, { method: "POST", body: aiForm });
    const aiJson = (await aiRes.json()) as AIResponse;

    if (!aiJson.ok) {
      return NextResponse.json({ ok: false, message: aiJson.message || "AI service failed" }, { status: 500 });
    }

    const items = aiJson.items || [];

    const labeledItems = await Promise.all(
      items.map(async (it) => {
        const pngB64 = it.image_png_base64;
        const dataUrl = pngB64.startsWith("data:") ? pngB64 : `data:image/png;base64,${pngB64}`;

        if (LABEL_STRATEGY === "none") {
          return {
            type: "Khác",
            category: "Khác",
            imageDataUrl: dataUrl,
            image_png_base64: pngB64,
            meta: it.meta,
            labelSource: "none" as const,
          };
        }

        const auto = it.meta?.autoLabel ?? null;
        const hintCategory = safeCat(auto?.category) ?? safeCat(it.type);
        const hintConfidence = typeof auto?.confidence === "number" ? auto.confidence : null;

        let label: SimpleLabel | null = null;
        let labelSource: "model" | "service" | "none" = "none";

        const shouldCallModel =
          LABEL_STRATEGY === "openai"
            ? true
            : LABEL_STRATEGY === "hybrid"
            ? hintConfidence === null || hintConfidence < HYBRID_MIN_CONF || !hintCategory
            : false;

        if (shouldCallModel) {
          try {
            label = await labelWardrobeItemSimpleFromPngBase64(pngB64, {
              categoryHint: hintCategory,
              confidenceHint: hintConfidence,
            });
            labelSource = "model";
          } catch (e) {
            console.warn("Label failed, fallback to service hint:", e);
          }
        }

        if (!label && hintCategory) labelSource = "service";

        const category = label?.category ?? hintCategory ?? "Khác";

        return {
          type: category,
          category,
          imageDataUrl: dataUrl,
          image_png_base64: pngB64,
          meta: it.meta,
          labelSource,
        };
      })
    );

    return NextResponse.json({ ok: true, items: labeledItems, count: labeledItems.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "Parse failed" }, { status: 500 });
  }
}