// src/app/api/wardrobe/confirm/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/firebaseAdmin";
import { hasActiveVip } from "@/lib/vip";

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

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function optimizeTransparentImage(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  return await sharp(buffer)
    .resize({
      width: 800,
      height: 800,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 85,
      effort: 4,
    })
    .toBuffer();
}

function uploadBufferToCloudinary(buffer: Buffer, folder: string) {
  const startMs = Date.now();
  console.log(`[confirm] starting Cloudinary upload, size=${Math.round(buffer.length / 1024)}KB, folder=${folder}`);

  const task = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "webp",
        timeout: 300000,
        overwrite: false,
        unique_filename: true,
      },
      (err, result) => {
        const elapsed = Date.now() - startMs;
        if (err || !result) {
          console.error(`[confirm] Cloudinary upload FAILED after ${elapsed}ms:`, err);
          return reject(err || new Error("Cloudinary upload failed"));
        }
        console.log(`[confirm] Cloudinary upload OK in ${elapsed}ms, url=${result.secure_url}`);
        resolve({
          secure_url: result.secure_url!,
          public_id: result.public_id!,
        });
      }
    );

    stream.on("error", (e) => {
      console.error(`[confirm] Cloudinary stream error after ${Date.now() - startMs}ms:`, e);
      reject(e);
    });
    stream.end(buffer);
  });

  return withTimeout(task, 310000, "Cloudinary upload timeout");
}

type CatKey = "Áo" | "Quần" | "Váy" | "Đầm" | "Giày" | "Khác";

function normalizeCategory(raw: string): CatKey {
  const s = (raw || "").trim().toLowerCase();

  if (["ao", "áo", "shirt", "top", "tshirt", "tee", "hoodie", "jacket", "coat", "sweater", "blouse"].some((k) => s.includes(k))) {
    return "Áo";
  }
  if (["quan", "quần", "pants", "trousers", "jeans", "shorts"].some((k) => s.includes(k))) {
    return "Quần";
  }
  if (["vay", "váy", "skirt"].some((k) => s.includes(k))) {
    return "Váy";
  }
  if (["dam", "đầm", "dress", "gown", "onepiece"].some((k) => s.includes(k))) {
    return "Đầm";
  }
  if (["giay", "giày", "shoe", "shoes", "sneaker", "boot", "boots", "sandal"].some((k) => s.includes(k))) {
    return "Giày";
  }
  return "Khác";
}

type InputItem = {
  type?: string;
  image_png_base64?: string;
};

type PreparedUpload = {
  rawType: string;
  category: CatKey;
  imageUrl: string;
  cloudinaryPublicId: string;
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx], idx);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

export async function POST(req: Request) {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ ok: false, message: "Missing Cloudinary env vars" }, { status: 500 });
    }

    const admin = getAdmin();
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, message: "Missing Authorization token" }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json().catch(() => ({} as any));
    const items = Array.isArray(body?.items) ? (body.items as InputItem[]) : [];

    if (items.length === 0) {
      return NextResponse.json({ ok: false, message: "Missing items" }, { status: 400 });
    }

    const prepared = await mapLimit(items, 1, async (it, idx) => {
      const rawType = String(it?.type || "unknown");
      const category = normalizeCategory(rawType);

      const b64 =
        typeof it?.image_png_base64 === "string"
          ? (it.image_png_base64.includes(",") ? it.image_png_base64.split(",")[1] : it.image_png_base64)
          : "";

      if (!b64) throw new Error(`Missing image_png_base64 at item ${idx}`);

      const originalBuffer = Buffer.from(b64, "base64");
      const optimizedBuffer = await optimizeTransparentImage(originalBuffer);

      console.log("[confirm] uploading", {
        idx,
        category,
        originalKB: Math.round(originalBuffer.length / 1024),
        optimizedKB: Math.round(optimizedBuffer.length / 1024),
      });

      const folder = `wardrobe/${uid}/${category}`;
      const { secure_url, public_id } = await uploadBufferToCloudinary(optimizedBuffer, folder);

      return {
        rawType,
        category,
        imageUrl: secure_url,
        cloudinaryPublicId: public_id,
      } satisfies PreparedUpload;
    });

    const db = admin.firestore();

    // Limit Check
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const isVIP = hasActiveVip(userData);
    const currentQuantity = typeof userData?.itemQuantity === "number" ? userData.itemQuantity : 0;
    const limit = isVIP ? 30 : 15;

    if (currentQuantity + items.length > limit) {
      return NextResponse.json(
        { ok: false, message: `Vượt quá giới hạn lưu trữ. ${isVIP ? 'Tài khoản VIP' : 'Tài khoản thường'} tối đa được lưu ${limit} món đồ.` },
        { status: 400 }
      );
    }

    const batch = db.batch();
    const saved: any[] = [];

    for (const up of prepared) {
      const docRef = db.collection("wardrobeItems").doc();
      const doc = {
        uid,
        category: up.category,
        rawType: up.rawType,
        imageUrl: up.imageUrl,
        cloudinaryPublicId: up.cloudinaryPublicId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "sam+label",
      };

      batch.set(docRef, doc);
      saved.push({
        id: docRef.id,
        ...doc,
        createdAt: new Date().toISOString(),
      });
    }

    // Increment itemQuantity
    batch.update(userDocRef, {
      itemQuantity: admin.firestore.FieldValue.increment(saved.length)
    });

    await withTimeout(batch.commit(), 15000, "Firestore batch commit timeout");

    return NextResponse.json({ ok: true, items: saved, count: saved.length });
  } catch (e: any) {
    console.error("[confirm] failed:", {
      message: e?.message,
      name: e?.name,
      http_code: e?.http_code,
      stack: e?.stack,
    });

    return NextResponse.json(
      { ok: false, message: e?.message || "Confirm failed" },
      { status: 500 }
    );
  }
}