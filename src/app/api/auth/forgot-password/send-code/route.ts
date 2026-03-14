import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { getAdmin } from "@/lib/firebaseAdmin";
import { sendPasswordResetCodeEmail } from "@/lib/mailer";

export const runtime = "nodejs";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = (body?.username || "").trim().toLowerCase();

    if (!/^[a-z0-9_-]{3,32}$/.test(username)) {
      return NextResponse.json(
        { error: "Tên đăng nhập không hợp lệ." },
        { status: 400 }
      );
    }

    const admin = getAdmin();
    const db = admin.firestore();

    const resetRef = db.collection("passwordResetCodes").doc(username);
    const existingSnap = await resetRef.get();

    if (existingSnap.exists) {
      const lastSentAt = existingSnap.get("lastSentAt");
      if (lastSentAt?.toMillis && Date.now() - lastSentAt.toMillis() < 60_000) {
        return NextResponse.json(
          { error: "Vui lòng chờ 60 giây trước khi gửi lại mã." },
          { status: 429 }
        );
      }
    }

    const usernameSnap = await db.collection("usernames").doc(username).get();

    const genericOk = NextResponse.json({
      ok: true,
      message:
        "Nếu tài khoản tồn tại và đã có email đăng ký, mã xác nhận đã được gửi.",
    });

    if (!usernameSnap.exists) {
      return genericOk;
    }

    const data = usernameSnap.data() || {};
    const uid = typeof data.uid === "string" ? data.uid : "";
    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

    if (!uid || !email) {
      return genericOk;
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = hashCode(code);
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + 10 * 60 * 1000
    );

    const payload = {
      uid,
      email,
      codeHash,
      attempts: 0,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
      await Promise.all([
        resetRef.set(payload, { merge: true }),
        sendPasswordResetCodeEmail(email, code),
      ]);
    } catch (mailErr: unknown) {
      console.error("Send mail error:", {
        message: mailErr instanceof Error ? mailErr.message : String(mailErr),
        name: mailErr instanceof Error ? mailErr.name : "UnknownError",
      });

      await resetRef.delete().catch(() => undefined);

      return NextResponse.json(
        { error: "Không gửi được email xác nhận." },
        { status: 500 }
      );
    }

    return genericOk;
  } catch (err) {
    console.error("Forgot password send-code fatal error:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi gửi mã xác nhận." },
      { status: 500 }
    );
  }
}