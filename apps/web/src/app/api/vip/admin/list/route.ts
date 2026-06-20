// src/app/api/vip/admin/list/route.ts
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import { toDateSafe } from "@/lib/vip";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || "";
}

function isVipAdminEmail(email?: string | null) {
  const allow = (process.env.VIP_ADMIN_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  return !!email && allow.includes(email.toLowerCase());
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);

    if (!isVipAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "Bạn không phải admin VIP." }, { status: 403 });
    }

    const db = admin.firestore();
    const snap = await db.collection("vipOrders").orderBy("createdAt", "desc").limit(50).get();

    const orders = snap.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        uid: data.uid || "",
        email: data.email || "",
        orderCode: data.orderCode || "",
        planCode: data.planCode || "",
        amount: data.amount || 0,
        paymentMethod: data.paymentMethod || null,
        status: data.status || "created",
        createdAt: toDateSafe(data.createdAt)?.toISOString() || null,
        markedPaidAt: toDateSafe(data.markedPaidAt)?.toISOString() || null,
        approvedAt: toDateSafe(data.approvedAt)?.toISOString() || null,
      };
    });

    return NextResponse.json({ ok: true, orders });
  } catch (err) {
    console.error("list vip orders error:", err);
    return NextResponse.json(
      { error: "Không thể tải danh sách đơn VIP." },
      { status: 500 }
    );
  }
}