import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const username = (body?.username || "").trim().toLowerCase();
    const code = (body?.code || "").trim();
    const newPassword = body?.newPassword || "";

    if (!/^[a-z0-9_-]{3,32}$/.test(username)) {
      return NextResponse.json(
        { error: "Tên đăng nhập không hợp lệ." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Mã xác nhận phải gồm 6 chữ số." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const admin = getAdmin();
    const db = admin.firestore();
    const resetRef = db.collection("passwordResetCodes").doc(username);
    const resetSnap = await resetRef.get();

    if (!resetSnap.exists) {
      return NextResponse.json(
        { error: "Không tìm thấy yêu cầu đặt lại mật khẩu. Hãy gửi mã lại." },
        { status: 400 }
      );
    }

    const data = resetSnap.data() || {};
    const uid = typeof data.uid === "string" ? data.uid : "";
    const codeHash = typeof data.codeHash === "string" ? data.codeHash : "";
    const attempts = typeof data.attempts === "number" ? data.attempts : 0;
    const expiresAt = data.expiresAt;

    if (!uid || !codeHash || !expiresAt?.toMillis) {
      await resetRef.delete().catch(() => undefined);
      return NextResponse.json(
        { error: "Yêu cầu đặt lại mật khẩu không hợp lệ. Hãy gửi mã lại." },
        { status: 400 }
      );
    }

    if (Date.now() > expiresAt.toMillis()) {
      await resetRef.delete().catch(() => undefined);
      return NextResponse.json(
        { error: "Mã xác nhận đã hết hạn. Hãy gửi mã mới." },
        { status: 400 }
      );
    }

    if (attempts >= 5) {
      await resetRef.delete().catch(() => undefined);
      return NextResponse.json(
        { error: "Bạn đã nhập sai quá nhiều lần. Hãy gửi mã mới." },
        { status: 400 }
      );
    }

    if (hashCode(code) !== codeHash) {
      await resetRef.update({
        attempts: attempts + 1,
      });

      return NextResponse.json(
        { error: "Mã xác nhận không đúng." },
        { status: 400 }
      );
    }

    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    await resetRef.delete().catch(() => undefined);

    return NextResponse.json({
      ok: true,
      message: "Đặt lại mật khẩu thành công.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi đặt lại mật khẩu." },
      { status: 500 }
    );
  }
}