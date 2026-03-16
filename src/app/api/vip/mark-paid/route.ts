// src/app/api/vip/mark-paid/route.ts
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || "";
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
    const paymentMethod = body.paymentMethod === "momo" || body.paymentMethod === "mb"
      ? body.paymentMethod
      : null;

    if (!orderId || !paymentMethod) {
      return NextResponse.json({ error: "Thiếu dữ liệu." }, { status: 400 });
    }

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const db = admin.firestore();
    const orderRef = db.collection("vipOrders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Không tìm thấy đơn VIP." }, { status: 404 });
    }

    const data = orderSnap.data();
    if (!data || data.uid !== uid) {
      return NextResponse.json({ error: "Không có quyền cập nhật đơn này." }, { status: 403 });
    }

    if (data.status === "approved") {
      return NextResponse.json({ ok: true, message: "Đơn đã được duyệt." });
    }

    await orderRef.update({
      paymentMethod,
      status: "pending",
      markedPaidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      message: "Đã ghi nhận yêu cầu thanh toán, đang chờ admin duyệt.",
    });
  } catch (err) {
    console.error("mark vip paid error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật trạng thái thanh toán." },
      { status: 500 }
    );
  }
}