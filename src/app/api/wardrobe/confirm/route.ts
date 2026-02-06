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
  image_png_base64: string;
};

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
      const type = it.type || "unknown";
      const buf = Buffer.from(it.image_png_base64, "base64");

      const folder = `wardrobe/${uid}/${type}`;
      const { secure_url, public_id } = await uploadBufferToCloudinary(buf, folder);

      const docRef = db.collection("wardrobeItems").doc();
      const doc = {
        uid,
        category: type,
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
