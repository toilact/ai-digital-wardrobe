// src/app/api/wardrobe/label-item/route.ts
import { NextResponse } from "next/server";
import { labelWardrobeItemSimpleFromPngBase64 } from "@/lib/ai/labelItem";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const pngBase64 =
      body?.pngBase64 ||
      body?.image_png_base64 ||
      body?.imageBase64 ||
      body?.image ||
      "";

    if (!pngBase64 || typeof pngBase64 !== "string") {
      return NextResponse.json({ ok: false, message: "Missing pngBase64" }, { status: 400 });
    }

    const label = await labelWardrobeItemSimpleFromPngBase64(pngBase64, {
      categoryHint: body?.hintCategory,
      confidenceHint: body?.hintConfidence ?? null,
    });

    return NextResponse.json({
      ok: true,
      label: {
        category: label.category,
        confidence: label.confidence ?? null,
      },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "Label failed" }, { status: 500 });
  }
}