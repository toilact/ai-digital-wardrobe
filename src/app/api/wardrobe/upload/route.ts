import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

function uploadBufferToCloudinary(buffer: Buffer, folder: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ secure_url: result.secure_url!, public_id: result.public_id! });
      }
    );
    stream.end(buffer);
  });
}

// Mock kết quả tách đồ theo hướng F (Parsing + phụ kiện)
// Sau này bạn thay block này bằng gọi Python AI service thật.
function mockAnalyzeF() {
  return [
    { category: "outerwear", label: "blazer", confidence: 0.91 },
    { category: "top", label: "shirt", confidence: 0.86 },
    { category: "bottom", label: "pants", confidence: 0.89 },
    { category: "shoes", label: "shoes", confidence: 0.81 },
    { category: "accessories", label: "watch", confidence: 0.74 },
  ];
}

export async function POST(req: Request) {
  try {
    // Check env Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ ok: false, message: "Missing Cloudinary env vars" }, { status: 500 });
    }

    const admin = getAdmin();

    // mode=analyze | store (default)
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "store";

    // 1) Verify user
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing Authorization token" }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // 2) Read form data
    const form = await req.formData();
    const file = form.get("file") as File | null;

    // category/color vẫn nhận, nhưng mode=analyze thì chưa cần
    const category = (form.get("category") as string) || "Không rõ";
    const color = (form.get("color") as string) || "Không rõ";

    if (!file) return NextResponse.json({ ok: false, message: "Missing file" }, { status: 400 });
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ ok: false, message: "Only image files are allowed" }, { status: 400 });
    }

    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) return NextResponse.json({ ok: false, message: "File too large (max 5MB)" }, { status: 400 });

    // 3) Upload to Cloudinary (để lấy URL cho AI/console)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const folder = `wardrobe/${uid}`;
    const { secure_url, public_id } = await uploadBufferToCloudinary(buffer, folder);

    // ✅ MODE ANALYZE: không lưu DB, chỉ trả kết quả tách đồ
    if (mode === "analyze") {
      const items = mockAnalyzeF();

      return NextResponse.json({
        ok: true,
        mode,
        original: {
          imageUrl: secure_url,
          cloudinaryPublicId: public_id,
        },
        items,
        debug: { filename: file.name, size: file.size, type: file.type },
      });
    }

    // ✅ MODE STORE (giữ như cũ): lưu 1 item vào Firestore
    const docRef = await admin.firestore().collection("wardrobeItems").add({
      uid,
      imageUrl: secure_url,
      cloudinaryPublicId: public_id,
      category,
      color,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      mode,
      itemId: docRef.id,
      imageUrl: secure_url,
      cloudinaryPublicId: public_id,
      category,
      color,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, message: err?.message || "Upload failed" }, { status: 500 });
  }
}
