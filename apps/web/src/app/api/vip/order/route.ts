// src/app/api/vip/order/route.ts
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import { toDateSafe } from "@/lib/vip";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || "";
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
    const uid = decoded.uid;

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Thiếu orderId" }, { status: 400 });
    }

    const db = admin.firestore();
    const orderRef = db.collection("vipOrders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Không tìm thấy đơn VIP." }, { status: 404 });
    }

    const data = orderSnap.data();
    if (!data || data.uid !== uid) {
      return NextResponse.json({ error: "Không có quyền xem đơn này." }, { status: 403 });
    }

    return NextResponse.json({
      id: orderSnap.id,
      uid: data.uid,
      email: data.email || "",
      planCode: data.planCode || null,
      amount: data.amount || 0,
      orderCode: data.orderCode || "",
      paymentMethod: data.paymentMethod || null,
      status: data.status || "created",
      createdAt: toDateSafe(data.createdAt)?.toISOString() || null,
      markedPaidAt: toDateSafe(data.markedPaidAt)?.toISOString() || null,
      approvedAt: toDateSafe(data.approvedAt)?.toISOString() || null,
    });
  } catch (err) {
    console.error("get vip order error:", err);
    return NextResponse.json(
      { error: "Không thể tải đơn VIP." },
      { status: 500 }
    );
  }
}