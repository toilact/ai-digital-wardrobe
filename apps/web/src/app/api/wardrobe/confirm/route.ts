// src/app/api/wardrobe/confirm/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/firebaseAdmin";
import { hasActiveVip } from "@adw/shared";
import { withTimeout } from "@/lib/wardrobe/withTimeout";
import { WardrobeItemInputSchema, type WardrobeItemInput } from "@/lib/wardrobe/itemSchema";
import { buildItemDoc } from "@/lib/wardrobe/buildItemDoc";

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

type PreparedUpload = {
  validatedInput: WardrobeItemInput;
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
    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json({ ok: false, message: "Missing items" }, { status: 400 });
    }

    // Validate all items upfront before any upload work
    const validatedItems: WardrobeItemInput[] = [];
    for (let i = 0; i < rawItems.length; i++) {
      const result = WardrobeItemInputSchema.safeParse(rawItems[i]);
      if (!result.success) {
        return NextResponse.json(
          { ok: false, message: `Invalid item at index ${i}: ${result.error.issues.map((e) => e.message).join("; ")}` },
          { status: 400 }
        );
      }
      validatedItems.push(result.data);
    }

    const asciiCategories: Record<CatKey, string> = {
      "Áo": "ao",
      "Quần": "quan",
      "Váy": "vay",
      "Đầm": "dam",
      "Giày": "giay",
      "Khác": "khac",
    };

    const prepared = await mapLimit(validatedItems, 1, async (validatedInput, idx) => {
      const b64 = validatedInput.image_png_base64.includes(",")
        ? validatedInput.image_png_base64.split(",")[1]
        : validatedInput.image_png_base64;

      const originalBuffer = Buffer.from(b64, "base64");
      const optimizedBuffer = await optimizeTransparentImage(originalBuffer);

      const folderCategory = asciiCategories[validatedInput.category as CatKey] || "khac";
      const folder = `wardrobe/${uid}/${folderCategory}`;

      console.log("[confirm] uploading", {
        idx,
        category: validatedInput.category,
        originalKB: Math.round(originalBuffer.length / 1024),
        optimizedKB: Math.round(optimizedBuffer.length / 1024),
      });

      const { secure_url, public_id } = await uploadBufferToCloudinary(optimizedBuffer, folder);

      return {
        validatedInput,
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

    if (currentQuantity + validatedItems.length > limit) {
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
        ...buildItemDoc(uid, up.validatedInput, up.imageUrl, up.cloudinaryPublicId),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(docRef, doc);
      saved.push({
        id: docRef.id,
        ...doc,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Increment itemQuantity
    batch.set(userDocRef, {
      itemQuantity: admin.firestore.FieldValue.increment(saved.length)
    }, { merge: true });

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