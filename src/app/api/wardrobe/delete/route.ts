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

export async function DELETE(req: Request) {
    try {
        const admin = getAdmin();
        const token = getBearerToken(req);
        if (!token) return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });

        const { uid } = await admin.auth().verifyIdToken(token);

        const body = await req.json();
        const id = body?.id as string | undefined;
        const publicId = body?.publicId as string | undefined;

        if (!id) return NextResponse.json({ ok: false, message: "Missing item id" }, { status: 400 });

        const docRef = admin.firestore().collection("wardrobeItems").doc(id);
        const snap = await docRef.get();
        if (!snap.exists) return NextResponse.json({ ok: false, message: "Item not found" }, { status: 404 });

        const data = snap.data() as any;
        if (data.uid !== uid) return NextResponse.json({ ok: false, message: "Not allowed" }, { status: 403 });

        const pid = publicId || data.cloudinaryPublicId;
        if (pid) {
            try {
                await cloudinary.uploader.destroy(pid, { resource_type: "image" });
            } catch (e) {
                console.warn("Cloudinary destroy warning:", e);
            }
        }

        await docRef.delete();

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ ok: false, message: e?.message || "Delete failed" }, { status: 500 });
    }
}
