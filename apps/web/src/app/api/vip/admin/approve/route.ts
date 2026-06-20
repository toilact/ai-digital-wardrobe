// src/app/api/vip/admin/approve/route.ts
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import {
  VIP_DURATION_DAYS,
  VIP_PLAN_CODE,
  addDays,
  toDateSafe,
} from "@/lib/vip";

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

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json(
        { error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const orderId = typeof body.orderId === "string" ? body.orderId : "";

    if (!orderId) {
      return NextResponse.json({ error: "Thiếu orderId." }, { status: 400 });
    }

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);

    if (!isVipAdminEmail(decoded.email)) {
      return NextResponse.json({ error: "Bạn không phải admin VIP." }, { status: 403 });
    }

    const db = admin.firestore();
    const orderRef = db.collection("vipOrders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Không tìm thấy đơn VIP." }, { status: 404 });
    }

    const orderData = orderSnap.data();
    if (!orderData) {
      return NextResponse.json({ error: "Dữ liệu đơn không hợp lệ." }, { status: 400 });
    }

    if (orderData.status === "approved") {
      return NextResponse.json({ ok: true, message: "Đơn đã được duyệt từ trước." });
    }

    const userRef = db.collection("users").doc(orderData.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const now = new Date();
    const currentVipEnd = toDateSafe(userData?.vipExpiresAt);
    const baseDate =
      currentVipEnd && currentVipEnd.getTime() > now.getTime() ? currentVipEnd : now;

    const nextVipExpiresAt = addDays(baseDate, VIP_DURATION_DAYS);

    const batch = db.batch();

    batch.set(
      userRef,
      {
        isVIP: true,
        vipPlan: VIP_PLAN_CODE,
        vipActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
        vipExpiresAt: nextVipExpiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    batch.update(orderRef, {
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: decoded.email || decoded.uid,
      vipExpiresAt: nextVipExpiresAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({
      ok: true,
      message: "Đã duyệt đơn và bật VIP.",
      vipExpiresAt: nextVipExpiresAt.toISOString(),
    });
  } catch (err) {
    console.error("approve vip order error:", err);
    return NextResponse.json(
      { error: "Không thể duyệt đơn VIP." },
      { status: 500 }
    );
  }
}