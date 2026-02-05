"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  type AuthError,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

function firebaseMsg(err: unknown) {
  const e = err as AuthError;
  const code = (e?.code ?? "").toString();

  switch (code) {
    case "auth/email-already-in-use":
      return "Tài khoản này đã được sử dụng. Hãy đăng nhập hoặc dùng thông tin khác.";
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
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    const uname = username.trim().toLowerCase();

    if (!uname) return alert("Nhập tên đăng nhập.");
    if (!/^[a-z0-9_-]{3,32}$/.test(uname))
      return alert(
        "Tên đăng nhập chỉ gồm chữ thường, số, gạch dưới hoặc gạch ngang (3-32 ký tự)."
      );
    if (!pass) return alert("Nhập mật khẩu.");
    if (pass.length < 6) return alert("Mật khẩu phải từ 6 ký tự trở lên.");
    if (pass !== confirm) return alert("Mật khẩu nhập lại không khớp.");

    setLoading(true);
    try {
      // 1) Check username đã tồn tại chưa (Firestore)
      const unameRef = doc(db, "usernames", uname);
      const unameSnap = await getDoc(unameRef);
      if (unameSnap.exists()) {
        return alert("Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.");
      }

      // 2) Tạo email giả để dùng với Firebase Auth
      const fakeEmail = `${uname}@adw.local`;

      // 3) Create user
      const cred = await createUserWithEmailAndPassword(auth, fakeEmail, pass);

      // 4) Update displayName (optional)
      const displayName = name.trim();
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      // 5) Lưu mapping username -> uid & profile cơ bản
      await setDoc(unameRef, {
        uid: cred.user.uid,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", cred.user.uid), {
        username: uname,
        displayName: displayName || null,
        createdAt: serverTimestamp(),
      });

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
        <h1 className="text-3xl font-semibold text-center mb-1">
          AI Digital Wardrobe
        </h1>
        <h2 className="text-2xl font-semibold text-center">Đăng ký</h2>

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

        <p className="text-sm text-gray-600 text-center">
          Đã có tài khoản?{" "}
          <Link className="underline" href="/auth/login">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
