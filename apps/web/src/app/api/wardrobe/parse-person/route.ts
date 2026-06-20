import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdmin } from "@/lib/firebaseAdmin";
import { parsePersonOnAi } from "@/lib/wardrobe/aiClient";
import { withTimeout } from "@/lib/wardrobe/withTimeout";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function getBearerToken(req: Request) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

async function uploadSource(buffer: Buffer, uid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `wardrobe/${uid}/_sources`, resource_type: "image" },
      (err, result) =>
        err || !result
          ? reject(err || new Error("Cloudinary source upload failed: no result"))
          : resolve(result.public_id!),
    );
    stream.on("error", reject);
    stream.end(buffer);
  });
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
    const { uid } = await getAdmin().auth().verifyIdToken(token);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) return NextResponse.json({ ok: false, message: "Missing file" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const [out, sourceImageId] = await Promise.all([
      parsePersonOnAi(new Blob([buffer])),
      withTimeout(uploadSource(buffer, uid), 310000, "Cloudinary source upload timeout"),
    ]);
    return NextResponse.json({ ...out, sourceImageId });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || "parse-person failed" }, { status: 500 });
  }
}
