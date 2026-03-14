import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isLegacyLocalEmail(email?: string | null) {
  return typeof email === "string" && email.trim().toLowerCase().endsWith("@adw.local");
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
    const currentAuthEmail = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isLegacyLocalEmail(currentAuthEmail)) {
      return NextResponse.json({ ok: true, synced: false, reason: "not-legacy" });
    }

    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "Không tìm thấy hồ sơ người dùng." },
        { status: 404 }
      );
    }

    const profile = userDoc.data() || {};
    const nextEmail =
      typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";
    const nextDisplayName =
      typeof profile.displayName === "string" ? profile.displayName.trim() : "";

    if (!isValidEmail(nextEmail)) {
      return NextResponse.json(
        { error: "Email trong hồ sơ người dùng không hợp lệ." },
        { status: 400 }
      );
    }

    await admin.auth().updateUser(uid, {
      email: nextEmail,
      ...(nextDisplayName ? { displayName: nextDisplayName } : {}),
    });

    return NextResponse.json({ ok: true, synced: true, email: nextEmail });
  } catch (err: unknown) {
    const code =
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof (err as { code?: unknown }).code === "string"
        ? (err as { code: string }).code
        : "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email thật này đã được dùng cho tài khoản khác." },
        { status: 409 }
      );
    }

    console.error("Sync auth email error:", err);
    return NextResponse.json(
      { error: "Không thể đồng bộ email tài khoản." },
      { status: 500 }
    );
  }
}
