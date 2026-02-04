"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  AuthError,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

function firebaseMsg(err: unknown) {
  const e = err as AuthError;
  const code = (e?.code ?? "").toString();

  switch (code) {
    case "auth/email-already-in-use":
      return "Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.";
    case "auth/invalid-email":
      return "Định dạng email nội bộ không hợp lệ.";
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
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    // Validate trước cho chắc
    const uname = username.trim().toLowerCase();
    if (!uname || !pass) return alert("Nhập tên đăng nhập và mật khẩu.");
    if (!/^[a-z0-9_\-]{3,32}$/.test(uname))
      return alert("Tên đăng nhập chỉ gồm chữ, số, gạch dưới hoặc gạch ngang (3-32 ký tự).");
    if (pass.length < 6) return alert("Mật khẩu phải từ 6 ký tự trở lên.");
    if (pass !== confirm) return alert("Mật khẩu nhập lại không khớp.");

    setLoading(true);
    try {

      // Tạo email giả để Firebase dùng làm identifier
      const fakeEmail = `${uname}@adw.local`;

      const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);

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
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#FFFDD0]">
      <div className="w-full max-w-sm shadow-2xl rounded-xl p-6 space-y-4 bg-white">
        <h1 className="text-3xl font-semibold text-center mb-5">AI Digital Wardrobe</h1>
        <h1 className="text-2xl font-semibold text-center">Đăng ký</h1>

        <input
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Tên hiển thị (tuỳ chọn)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <input
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Mật khẩu (>= 6 ký tự)"
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="new-password"
        />

        <input
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Nhập lại mật khẩu"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        <button
          onClick={onRegister}
          disabled={loading}
          className="w-full bg-[#00a400] text-white rounded py-2 disabled:opacity-50"
        >
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>

        <p className="text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Link className="underline" href="/">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
