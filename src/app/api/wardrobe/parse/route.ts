import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

type AIItem = { type: string; image_png_base64: string };
type AIResponse = { ok: boolean; items: AIItem[] };

export async function POST(req: Request) {
  try {
    const admin = getAdmin();

    // auth
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing Authorization token" }, { status: 401 });
    await admin.auth().verifyIdToken(token);

    // file
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ ok: false, message: "Missing file" }, { status: 400 });

    // call ai
    const aiForm = new FormData();
    aiForm.append("file", file, file.name);

    const aiRes = await fetch(`${AI_SERVICE_URL}/parse`, {
      method: "POST",
      body: aiForm,
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      return NextResponse.json({ ok: false, message: "AI service failed", detail: t.slice(0, 600) }, { status: 502 });
    }

    const aiJson = (await aiRes.json()) as AIResponse;
    if (!aiJson.ok || !Array.isArray(aiJson.items)) {
      return NextResponse.json({ ok: false, message: "AI returned invalid response" }, { status: 502 });
    }

    // trả về dạng data url để frontend hiển thị ngay
    const items = aiJson.items.map((it) => ({
      type: it.type,
      imageDataUrl: `data:image/png;base64,${it.image_png_base64}`,
      image_png_base64: it.image_png_base64, // giữ lại để confirm gửi lên
    }));

    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "Parse failed" }, { status: 500 });
  }
}
