"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

function firebaseMsg(err: unknown) {
  const e = err as AuthError;
  const code = (e?.code ?? "").toString();

  switch (code) {
    case "auth/email-already-in-use":
      return "Email này đã được sử dụng. Hãy đăng nhập hoặc dùng email khác.";
    case "auth/invalid-email":
      return "Email không hợp lệ.";
    case "auth/weak-password":
      return "Mật khẩu quá yếu. Firebase yêu cầu ít nhất 6 ký tự.";
    case "auth/operation-not-allowed":
      return "Email/Password chưa được bật trong Firebase Authentication.";
    case "auth/network-request-failed":
      return "Lỗi mạng. Kiểm tra kết nối internet.";
    default:
      return e?.message || "Đăng ký thất bại (không rõ lý do).";
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    // Validate trước cho chắc
    if (!email.trim() || !pass) return alert("Nhập email và mật khẩu.");
    if (pass.length < 6) return alert("Mật khẩu phải từ 6 ký tự trở lên.");
    if (pass !== confirm) return alert("Mật khẩu nhập lại không khớp.");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        pass
      );

      // set displayName nếu có
      const displayName = name.trim();
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      // Đợi auth state cập nhật, rồi chuyển trang
      router.replace("/dashboard");
    } catch (err) {
      alert(firebaseMsg(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm border rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Đăng ký</h1>

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Tên hiển thị (tuỳ chọn)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Mật khẩu (>= 6 ký tự)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="new-password"
        />

        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Nhập lại mật khẩu"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        <button
          onClick={onRegister}
          disabled={loading}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>

        <p className="text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Link className="underline" href="/auth/login">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
