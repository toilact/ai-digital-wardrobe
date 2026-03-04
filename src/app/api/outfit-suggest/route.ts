import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import { generateVisualGemini } from "@/lib/llm/geminiVisual";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserProfile, type UserProfile } from "@/lib/profile";

export const runtime = "nodejs";

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export async function POST(req: Request) {
  try {

    const admin = getAdmin();
    const adminDb = admin.firestore();
    const body = await req.json();

    const message: string = String(body?.message ?? "").trim();
    const selectedItemIds: string[] = Array.isArray(body?.selectedItemIds) ? body.selectedItemIds : [];
    const rawHistory = Array.isArray(body?.history) ? body.history : [];

    const uid = String(body?.idUser ?? "").trim();

    if (!message) return NextResponse.json({ ok: false, message: "Empty message" }, { status: 400 });

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userProfile = userDoc.exists ? (userDoc.data() as UserProfile) : null;


    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_KT!);
    const systemPrompt = `
      Bạn là chuyên viên thời trang của AI-DIGITAL-WARDROBE.
      - Nếu tin nhắn yêu cầu phối đồ/outfit cho dịp/thời tiết/style/điểm đến cụ thể: TRẢ LỜI DUY NHẤT CHỮ 'EVENT'.
      - Nếu là chào hỏi/tư vấn chung: Trả lời thân thiện.
      - Nếu người dùng yêu cầu tạo/gợi ý outfit mà không cung cấp đủ thông tin về dịp/thời tiết/style/điểm đến, hãy hỏi lại để lấy thêm thông tin.
      - Luôn ưu tiên hiểu ý định của người dùng dựa trên nội dung tin nhắn, không chỉ dựa vào từ khóa đơn lẻ.
      - Nếu người dùng càn tư vấn về thời trang thì tư vấn thân thiện.
      Ví dụ:
      + "Tôi muốn một outfit cho buổi hẹn hò tối nay ở nhà hàng sang trọng" => "EVENT"
      + "Tôi nên mặc gì hôm nay?" => "EVENT"
      + "Tôi muốn phối đồ đi biển" => "EVENT"
      + "Xin chào, bạn có thể giúp tôi phối đồ không?" => Trả lời thân thiện, không phải "EVENT"
      + "đi biển" => "EVENT"
      + "đi chợ nên chọn phong cách nào?" => trả lời thân thiện, tư vấn cho người dùng, không phải "EVENT" 
      + "đi/tham gia  điểm đến/sự kiện nên mặc ... hay ... ? " => tư vấn thân thiện, không phải "EVENT"

      Thông tin vóc dáng người dùng: ${JSON.stringify(userProfile || "Chưa có")}.
    `.trim();


    let historyForAI = rawHistory
      .map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(msg.content || "") }],
      })) as any[];

    if (historyForAI.length > 0 && historyForAI[0].role === 'model') {
      historyForAI.shift();
    }


    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-3-flash",
      systemInstruction: systemPrompt, // Dùng prompt ở mục 1
    });




    const chat = model.startChat({ history: historyForAI });
    const result = await chat.sendMessage(message);
    const aiText = result.response.text();

    const isEvent = aiText === "EVENT";



    if (isEvent) {

      let items: any[] = [];


      if (selectedItemIds.length === 0) {

        const snap = await adminDb.collection("wardrobeItems")
          .where("uid", "==", uid)
          .get();

        items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {

        const docRefs = selectedItemIds.map(id => adminDb.collection("wardrobeItems").doc(id));

        const docs = await adminDb.getAll(...docRefs);

        items = docs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() }));
      }

      const validImages = (await Promise.all(items.map(async (it) => {
        try {
          const r = await fetch(it.imageUrl);
          const buf = await r.arrayBuffer();
          return { id: it.id, url: it.imageUrl, png_base64: Buffer.from(buf).toString("base64") };
        } catch (e) { return null; }
      }))).filter(img => img !== null);


      const out = await generateVisualGemini({
        userMessage: message,
        profile: userProfile,
        images: validImages,
      });

      const restResponse = await fetch("https://api.infip.pro/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.INFIP_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "img4",
          prompt: out.imagen_prompt,
          n: 1, size: "1024x1024", response_format: "url"
        })
      });

      const restData = await restResponse.json();
      const imageUrl = restData.data?.[0]?.url || "";

      return NextResponse.json({
        ok: true,
        reply: {
          note: out.note,
          outfit: out.outfit,
          images: [{ url: imageUrl }]
        }
      });

    } else {
      // --- LUỒNG CHAT BÌNH THƯỜNG ---
      // Trả về văn bản AI đã phản hồi ở bước 4
      return NextResponse.json({
        ok: true,
        reply: {
          note: aiText,
          intent: "CHAT"
        }
      });
    }

  } catch (e: any) {
    console.error("API Route Error:", e);
    return NextResponse.json({ ok: false, message: e?.code || "Server error" }, { status: 500 });
  }
}