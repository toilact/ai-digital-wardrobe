import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

export async function POST(req: Request) {
  try {
    const admin = getAdmin();
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });

    const { uid } = await admin.auth().verifyIdToken(token);

    const body = await req.json();
    const message: string = String(body?.message ?? "");
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message.trim()) {
      return NextResponse.json({ ok: false, message: "Empty message" }, { status: 400 });
    }

    // Lấy profile (nếu có) để prompt ngon hơn
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    const profile = userDoc.exists ? userDoc.data() : null;

    // Prompt kiểu stylist (ngắn gọn, dễ demo)
    const convo = history
      .slice(-10)
      .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${String(m.content || "")}`)
      .join("\n");

    const prompt = `
Bạn là stylist AI của "AI Digital Wardrobe".
Nhiệm vụ: gợi ý outfit thực tế, dễ mặc, rõ ràng.
Luôn trả lời:
1) Outfit đề xuất (áo + quần/váy + giày + phụ kiện)
2) Vì sao hợp (thời tiết/dịp/vibe)
3) 1 biến thể (màu khác hoặc formal hơn)
4) Tip nhanh (tóc/đồ đi kèm)

User profile (nếu có): ${profile ? JSON.stringify(profile) : "null"}

Conversation:
${convo}

User: ${message}
Assistant:
`.trim();

    // ✅ Gọi module geminiOutfit.ts (tự bắt named/default export)
    const mod: any = await import("@/lib/llm/geminiOutfit");
    const fn = mod.geminiOutfit ?? mod.default;
    if (typeof fn !== "function") {
      return NextResponse.json(
        { ok: false, message: "geminiOutfit export not found. Check lib/llm/geminiOutfit.ts" },
        { status: 500 }
      );
    }

    // giả định fn nhận (prompt: string) và trả string
    const reply = await fn(prompt);

    return NextResponse.json({ ok: true, reply });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "Server error" }, { status: 500 });
  }
}