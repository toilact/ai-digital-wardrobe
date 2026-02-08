import { NextResponse } from "next/server";
import { getWeatherNow } from "@/lib/weather";
import { OutfitResponseSchema } from "@/lib/outfitSchema";

// TODO: thay bằng firebase-admin verify token của project
async function verifyAndGetUid(_authHeader: string | null): Promise<string> {
  if (!_authHeader) throw new Error("Missing Authorization header");
  return "demo-uid";
}

// TODO: thay bằng Firestore query thật theo schema DB
async function getWardrobeItems(_uid: string) {
  return [];
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const uid = await verifyAndGetUid(auth);

    const body = await req.json();
    const occasion = String(body.occasion ?? "").trim();
    const style = String(body.style ?? "").trim();

    // fallback để demo: HCM
    const lat = Number(body.lat ?? 10.8231);
    const lon = Number(body.lon ?? 106.6297);

    if (!occasion) {
      return NextResponse.json(
        { error: "missing_occasion", message: "Thiếu 'occasion' (đi đâu?)" },
        { status: 400 }
      );
    }

    const [weather, wardrobeItems] = await Promise.all([
      getWeatherNow(lat, lon),
      getWardrobeItems(uid),
    ]);

    const input = { occasion, style: style || undefined, weather, wardrobeItems };

    const provider = process.env.LLM_PROVIDER ?? "gemini";

    // ⚠️ modelOut có thể thiếu field -> ta normalize + luôn gắn weather từ server
    let modelOut: any;

    if (provider === "gemini") {
      const { generateOutfitGemini } = await import("@/lib/llm/geminiOutfit");
      modelOut = await generateOutfitGemini(input);
    } else {
      const { generateOutfitOpenAI } = await import("@/lib/llm/openaiOutfit");
      modelOut = await generateOutfitOpenAI(input);
    }

    // ✅ Normalize + đảm bảo không bao giờ thiếu field (để UI không crash)
    const normalized = OutfitResponseSchema.parse({
      needMoreInfo: Boolean(modelOut?.needMoreInfo),
      question: modelOut?.question ?? "",
      weather, // ✅ luôn lấy từ server
      options: Array.isArray(modelOut?.options) ? modelOut.options : [],
      tips: Array.isArray(modelOut?.tips) ? modelOut.tips : [],
      missingItems: Array.isArray(modelOut?.missingItems) ? modelOut.missingItems : [],
    });

    return NextResponse.json(normalized);
  } catch (e: any) {
    // nếu parse zod fail thì trả details để debug
    const message = e?.message ?? "Unknown error";
    const details = e?.issues ?? e?.errors ?? null;

    return NextResponse.json(
      { error: "server_error", message, details },
      { status: 500 }
    );
  }
}
