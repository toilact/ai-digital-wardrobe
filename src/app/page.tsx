"use client";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc"; // Cần cài: npm install react-icons
import GoogleLoginButton from "@/components/GoogleLoginButton";

export default function Home() {

  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !pass) return alert("Nhập email và mật khẩu");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      router.push("/dashboard");
    } catch (e: any) {
      alert(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="min-h-screen bg-[#FFFDD0] flex items-center justify-center">


      <div className="w-full max-w-[400px] bg-white p-12 shadow-2xl flex flex-col items-center">

        <h1 className="text-3xl font-semibold mb-5">AI Digital Wardrobe</h1>
        {/* Tiêu đề Log-in */}
        <h2 className="text-3xl font-light text-gray-600 mb-2 tracking-tight">
          Đăng nhập
        </h2>

        {/* Form nhập liệu */}
        <div className="w-full space-y-4">
          <div className="relative m-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative m-2">
            <input
              type="password"
              placeholder="Mật khẩu"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400"
            />
          </div>

          {/* Nút Login xanh dương */}
          <button
            onClick={onLogin}
            disabled={loading}
            className="w-full bg-[#4a90e2] text-white py-3 font-semibold hover:bg-blue-600 transition-colors">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </div>

        {/* Dòng kẻ ngang hoặc chữ OR */}
        <div className="w-full flex items-center my-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="px-3 text-xs text-gray-400 uppercase">Hoặc</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        {/* Nút Đăng nhập bằng Google */}

        <div className="pt-2 border-t">
          <GoogleLoginButton />
        </div>

        {/* Link chuyển hướng */}
        <div className="flex gap-4 text-sm text-gray-500">
          <Link href="/auth/register" className="hover:underline">Đăng ký</Link>
        </div>
      </div>
    </main>
  );
}
