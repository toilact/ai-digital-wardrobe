import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

function uploadBufferToCloudinary(buffer: Buffer, folder: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // PNG nền trong suốt giữ nguyên alpha
        format: "png",
      },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ secure_url: result.secure_url!, public_id: result.public_id! });
      }
    );
    stream.end(buffer);
  });
}

type AIItem = { type: string; image_png_base64: string };
type AIResponse = { ok: boolean; items: AIItem[] };

export async function POST(req: Request) {
  try {
    // env check
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ ok: false, message: "Missing Cloudinary env vars" }, { status: 500 });
    }

    const admin = getAdmin();

    // 1) Verify user
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing Authorization token" }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // 2) Read form data
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) return NextResponse.json({ ok: false, message: "Missing file" }, { status: 400 });
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image files are allowed" }, { status: 400 });
    }

    const MAX = 8 * 1024 * 1024; // full-body có thể nặng hơn chút
    if (file.size > MAX) return NextResponse.json({ ok: false, message: "File too large (max 8MB)" }, { status: 400 });

    // 3) Gọi ai-service để tách đồ
    const aiForm = new FormData();
    aiForm.append("file", file, file.name);

    const aiRes = await fetch(`${AI_SERVICE_URL}/parse`, {
      method: "POST",
      body: aiForm,
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      return NextResponse.json(
        { ok: false, message: "AI service failed", detail: t.slice(0, 600) },
        { status: 502 }
      );
    }

    const aiJson = (await aiRes.json()) as AIResponse;
    if (!aiJson.ok || !Array.isArray(aiJson.items)) {
      return NextResponse.json({ ok: false, message: "AI returned invalid response" }, { status: 502 });
    }

    // Nếu AI không tách được gì
    if (aiJson.items.length === 0) {
      return NextResponse.json({ ok: true, items: [], message: "No items detected" });
    }

    // 4) Upload từng item lên Cloudinary + Save Firestore
    const db = admin.firestore();
    const batch = db.batch();

    const savedItems: any[] = [];
    const baseFolder = `wardrobe/${uid}`;

    for (const it of aiJson.items) {
      const type = it.type || "unknown";
      const pngBuffer = Buffer.from(it.image_png_base64, "base64");

      // folder theo loại để dễ quản lý
      const folder = `${baseFolder}/${type}`;
      const { secure_url, public_id } = await uploadBufferToCloudinary(pngBuffer, folder);

      const docRef = db.collection("wardrobeItems").doc(); // tạo id trước để trả về list
      const doc = {
        uid,
        imageUrl: secure_url,
        cloudinaryPublicId: public_id,
        category: type, // dùng type làm category
        color: "Không rõ", // sau này bạn thêm model nhận màu thì update
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // optional debug
        source: "schp",
      };

      batch.set(docRef, doc);
      savedItems.push({ id: docRef.id, ...doc, createdAt: new Date().toISOString() });
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      items: savedItems,
      count: savedItems.length,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, message: err?.message || "Upload failed" }, { status: 500 });
  }
}
