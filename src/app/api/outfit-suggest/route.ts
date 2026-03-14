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

// helper that streams newline-delimited JSON pieces to the client
function sendStep(controller: ReadableStreamDefaultController, obj: any) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
}

export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const admin = getAdmin();
        const adminDb = admin.firestore();
        const body = await req.json();

        const message: string = String(body?.message ?? "").trim();
        const selectedItemIds: string[] = Array.isArray(body?.selectedItemIds) ? body.selectedItemIds : [];
        const rawHistory = Array.isArray(body?.history) ? body.history : [];
        const uid = String(body?.idUser ?? "").trim();

        if (!message) {
          sendStep(controller, { ok: false, message: "Empty message" });
          controller.close();
          return;
        }

        sendStep(controller, { stage: "thinking" });

        const userDoc = await adminDb.collection("users").doc(uid).get();
        const userProfile = userDoc.exists ? (userDoc.data() as UserProfile) : null;

        const systemPrompt = `
      Bạn là chuyên viên thời trang của AI-DIGITAL-WARDROBE.
      - Nếu tin nhắn yêu cầu phối đồ/outfit cho dịp/thời tiết/style/điểm đến cụ thể: TRẢ LỜI DUY NHẤT CHỮ 'EVENT'.
      - Nếu là chào hỏi/tư vấn chung: Trả lời thân thiện.
      - Nếu người dùng yêu cầu tạo/gợi ý outfit mà không cung cấp đủ thông tin về dịp/thời tiết/style/điểm đến, hãy hỏi lại để lấy thêm thông tin.
      - Luôn ưu tiên hiểu ý định của người dùng dựa trên nội dung tin nhắn, không chỉ dựa vào từ khóa đơn lẻ.
      - Nếu người dùng cần tư vấn về thời trang thì tư vấn thân thiện.
      Ví dụ:
      + "Tôi muốn một outfit cho buổi hẹn hò tối nay ở nhà hàng sang trọng" => "EVENT"
      + "Tôi nên mặc gì hôm nay?" => "hỏi thêm về sự kiện/thời tiết/điểm đến cụ thể"
      + "Tôi muốn phối đồ đi biển" => "EVENT"
      + "Xin chào, bạn có thể giúp tôi phối đồ không?" => Trả lời thân thiện, không phải "EVENT"
      + "đi biển" => "EVENT"
      + "đi chợ nên chọn phong cách nào?" => trả lời thân thiện, tư vấn cho người dùng, không phải "EVENT"
      + "đi/tham gia  điểm đến/sự kiện nên mặc ... hay ... ? " => tư vấn thân thiện, không phải "EVENT"
      + "Gợi ý outfit đi học (gọn gàng, dễ thương)" => "EVENT"

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

        const geminiKeys = [
          process.env.GEMINI_API_KEY_KT!,
          process.env.GEMINI_API_KEY!,
        ].filter(Boolean);

        let aiText = "";
        let lastError: any = null;

        for (const apiKey of geminiKeys) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
              model: process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview",
              systemInstruction: systemPrompt,
            });
            const chat = model.startChat({ history: historyForAI });
            const result = await chat.sendMessage(message);
            aiText = result.response.text();
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn("Gemini API key failed, trying next:", err.message?.slice(0, 120));
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (lastError) {
          throw lastError;
        }

        const isEvent = aiText === "EVENT";

        if (isEvent) {
          // --- VIP & QUOTA CHECK ---
          const isVIP = !!userProfile?.isVIP;
          const limit = isVIP ? 5 : 1;
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

          let currentGenerations = userProfile?.outfitGenerationsToday || 0;
          let lastGenerationDate = userProfile?.outfitGenerationDate || "";

          // Reset quota if a new day
          if (lastGenerationDate !== today) {
            currentGenerations = 0;
            lastGenerationDate = today;
          }

          if (currentGenerations >= limit) {
            sendStep(controller, {
              ok: false,
              message: `Bạn đã sử dụng hết lượt gợi ý trang phục hôm nay. ${isVIP ? 'Tài khoản VIP' : 'Tài khoản thường'} có tối đa ${limit} lượt/ngày.`
            });
            controller.close();
            return;
          }
          // --------------------------------

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

          if (items.length === 0) {
            sendStep(controller, { ok: false, message: "Bạn chưa có đồ trong tủ đồ. Vui lòng thêm đồ vào tủ đồ trước khi yêu cầu gợi ý outfit." });
            controller.close();
            return;
          }

          const hasTop = items.some(item => item.category === "Áo");
          const hasBottom = items.some(item => item.category === "Quần");

          if (!hasTop || !hasBottom) {
            sendStep(controller, { ok: false, message: "Bạn cần có ít nhất 1 áo và 1 quần trong tủ đồ để tạo outfit." });
            controller.close();
            return;
          }

          if (items.length > 20) {
            console.log(`Too many items (${items.length}), limiting to 20 for performance.`);
            items = items.slice(0, 20);
          }

          console.time("download_images");
          const validImages = (await Promise.all(items.map(async (it: any) => {
            try {
              const r = await fetch(it.imageUrl);
              if (!r.ok) return null;
              const buf = await r.arrayBuffer();
              return { id: it.id, url: it.imageUrl, png_base64: Buffer.from(buf).toString("base64") };
            } catch (e) { return null; }
          }))).filter((img): img is { id: string; url: string; png_base64: string } => img !== null);
          console.timeEnd("download_images");

          if (validImages.length === 0) {
            sendStep(controller, { ok: false, message: "Không thể tải được hình ảnh từ tủ đồ của bạn." });
            controller.close();
            return;
          }

          sendStep(controller, { stage: "analyzing_clothes" });
          console.time("gemini_visual");
          const out = await generateVisualGemini({
            userMessage: message,
            profile: userProfile,
            images: validImages,
          });
          console.timeEnd("gemini_visual");

          sendStep(controller, { stage: "generating_outfit" });
          console.log("Generating image with Infip API for:", out.outfit);
          console.time("infip_gen");
          let sizeModels = ["img4", "img3"];
          let aspectModels = ["flux-schnell", "flux2-klein-9b", "flux2-klein-4b", "flux2-dev", "lucid-origin", "phoenix", "sdxl", "sdxl-lite", "dreamshaper"];
          let imageUrl = "";
          try {
            let infipResponse: any = null;
            let success = false;
            let lastErrorText = "";

            for (const model of sizeModels) {
              infipResponse = await fetch("https://api.infip.pro/v1/images/generations", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${process.env.INFIP_API_KEY}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  model: model,
                  prompt: out.imagen_prompt,
                  n: 1,
                  size: "1024x1024",
                  response_format: "url"
                })
              });
              if (infipResponse.ok) {
                success = true;
                break;
              } else {
                lastErrorText = await infipResponse.text();
              }
            }

            if (!success) {
              for (const model of aspectModels) {
                infipResponse = await fetch("https://api.infip.pro/v1/images/generations", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${process.env.INFIP_API_KEY}`,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    model: model,
                    prompt: out.imagen_prompt,
                    n: 1,
                    aspect: "square",
                    response_format: "url"
                  })
                });
                if (infipResponse.ok) {
                  success = true;
                  break;
                } else {
                  lastErrorText = await infipResponse.text();
                }
              }
            }

            if (success && infipResponse) {
              const data = await infipResponse.json();
              imageUrl = data.data?.[0]?.url || "";
              console.log("Infip API OK, url:", imageUrl);
            } else {
              console.error("Infip API All Models Failed:", lastErrorText);
            }
          } catch (imgErr: any) {
            console.error("Infip Error (Fallback to text):", imgErr.message || imgErr);
          }
          console.timeEnd("infip_gen");

          // --- UPDATE USER QUOTA ---
          await adminDb.collection("users").doc(uid).update({
            outfitGenerationsToday: currentGenerations + 1,
            outfitGenerationDate: lastGenerationDate
          });
          // --------------------------------

          sendStep(controller, {
            ok: true,
            reply: {
              note: out.note,
              outfit: out.outfit,
              images: imageUrl ? [{ url: imageUrl }] : [],
              stage: "outfit_generated",
            },
          });
        } else {
          sendStep(controller, {
            ok: true,
            reply: {
              note: aiText,
              intent: "CHAT",
              stage: "chat_only",
            },
          });
        }

        controller.close();
      } catch (e: any) {
        console.error("API Route Error:", e);
        let statusCode = 500;
        let errorMessage = "Server error";
        if (e?.message?.includes("503") || e?.code === 503) {
          statusCode = 503;
          errorMessage = "Service Unavailable";
        } else if (e?.message?.includes("quota") || e?.message?.includes("429") || e?.message?.includes("rate limit")) {
          statusCode = 429;
          errorMessage = "Quota Exceeded";
        }
        sendStep(controller, { ok: false, message: errorMessage });
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}