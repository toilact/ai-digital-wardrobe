import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

export async function GET(req: Request) {
  try {
    const admin = getAdmin();
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });

    const { uid } = await admin.auth().verifyIdToken(token);

    const snap = await admin
      .firestore()
      .collection("wardrobeItems")
      .where("uid", "==", uid)
      .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, message: e?.message || "List failed" }, { status: 500 });
  }
}
