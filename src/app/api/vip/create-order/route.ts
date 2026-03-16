// src/app/api/vip/create-order/route.ts
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";
import {
  VIP_PLAN_CODE,
  VIP_PRICE,
  buildVipOrderCode,
  hasActiveVip,
} from "@/lib/vip";

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

    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email || "";

    const db = admin.firestore();
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : null;

    if (hasActiveVip(userData)) {
      return NextResponse.json(
        { error: "Tài khoản của bạn đang là VIP rồi." },
        { status: 400 }
      );
    }

    const orderCode = buildVipOrderCode();

    const orderRef = await db.collection("vipOrders").add({
      uid,
      email,
      planCode: VIP_PLAN_CODE,
      amount: VIP_PRICE,
      orderCode,
      paymentMethod: null,
      status: "created",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      orderId: orderRef.id,
      orderCode,
      amount: VIP_PRICE,
    });
  } catch (err) {
    console.error("create vip order error:", err);
    return NextResponse.json(
      { error: "Không thể tạo đơn VIP." },
      { status: 500 }
    );
  }
}