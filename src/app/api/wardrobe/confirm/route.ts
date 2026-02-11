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
      { folder, resource_type: "image", format: "png" },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({ secure_url: result.secure_url!, public_id: result.public_id! });
      }
    );
    stream.end(buffer);
  });
}

type ConfirmItem = {
  type: string; // nhãn người dùng đã chọn/sửa
  image_png_base64: string; // base64 png (có thể có prefix data:image/png;base64,...)
};

/** ---- Category normalize: chỉ 5 loại ---- */
type CatKey = "Áo" | "Quần" | "Váy" | "Đầm" | "Giày";

function stripVN(s?: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function normalizeCategory(typeRaw?: string): CatKey {
  const s = stripVN(typeRaw);

  if (s.includes("giay") || s.includes("shoe") || s.includes("sneaker")) return "Giày";
  if (s.includes("dam") || s.includes("dress") || s.includes("gown")) return "Đầm";
  if (s.includes("vay") || s.includes("skirt")) return "Váy";
  if (s.includes("quan") || s.includes("pants") || s.includes("trouser") || s.includes("jean")) return "Quần";
  if (s.includes("ao") || s.includes("shirt") || s.includes("tee") || s.includes("top") || s.includes("hoodie")) return "Áo";

  return "Áo";
}

export async function POST(req: Request) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ ok: false, message: "Missing Cloudinary env vars" }, { status: 500 });
    }

    const admin = getAdmin();

    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing Authorization token" }, { status: 401 });

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json();
    const items = (body?.items || []) as ConfirmItem[];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ ok: false, message: "Missing items" }, { status: 400 });
    }

    const db = admin.firestore();
    const batch = db.batch();
    const saved: any[] = [];

    for (const it of items) {
      const typeRaw = it.type || "unknown";
      const category = normalizeCategory(typeRaw);

      const b64 = it.image_png_base64?.includes(",")
        ? it.image_png_base64.split(",")[1]
        : it.image_png_base64;

      if (!b64) continue;

      const buf = Buffer.from(b64, "base64");

      // folder theo category chuẩn để nhìn Cloudinary gọn
      const folder = `wardrobe/${uid}/${category}`;
      const { secure_url, public_id } = await uploadBufferToCloudinary(buf, folder);

      const docRef = db.collection("wardrobeItems").doc();
      const doc = {
        uid,
        category, // ✅ luôn là 1 trong 5 loại
        rawType: typeRaw, // ✅ optional: debug
        color: "Không rõ",
        imageUrl: secure_url,
        cloudinaryPublicId: public_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "schp",
      };

      batch.set(docRef, doc);
      saved.push({ id: docRef.id, ...doc });
    }

    await batch.commit();
    return NextResponse.json({ ok: true, items: saved, count: saved.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "Confirm failed" }, { status: 500 });
  }
}
