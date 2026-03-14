"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");

  const onSendCode = async () => {
    const uname = username.trim().toLowerCase();

    if (!uname) {
      alert("Nhập tên đăng nhập.");
      return;
    }

    setLoadingSend(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: uname }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Không gửi được mã xác nhận.");
      }

      setSent(true);
      setMessage(
        data?.message ||
          "Nếu tài khoản tồn tại và đã có email đăng ký, mã xác nhận đã được gửi."
      );
    } catch (err: any) {
      alert(err?.message || "Không gửi được mã xác nhận.");
    } finally {
      setLoadingSend(false);
    }
  };

  const onResetPassword = async () => {
    const uname = username.trim().toLowerCase();

    if (!uname) return alert("Nhập tên đăng nhập.");
    if (!code) return alert("Nhập mã xác nhận.");
    if (!newPassword) return alert("Nhập mật khẩu mới.");
    if (newPassword.length < 6)
      return alert("Mật khẩu mới phải có ít nhất 6 ký tự.");
    if (newPassword !== confirmPassword)
      return alert("Mật khẩu nhập lại không khớp.");

    setLoadingReset(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: uname,
          code,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Không đặt lại được mật khẩu.");
      }

      alert("Đặt lại mật khẩu thành công. Hãy đăng nhập lại.");
      router.push("/auth/login");
    } catch (err: any) {
      alert(err?.message || "Không đặt lại được mật khẩu.");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <main>
      <Header />
      <div className="wrap">
        <div className="mt-20 flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-[420px] bg-gray-900 rounded-xl p-6 shadow-2xl">
            <h2 className="text-3xl font-light text-white mb-2 tracking-tight text-center">
              Quên mật khẩu
            </h2>

            <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
              Nhập tên đăng nhập để nhận mã xác nhận qua email đã đăng ký.
            </p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white rounded"
              />

              <button
                onClick={onSendCode}
                disabled={loadingSend}
                className="w-full bg-blue-500 text-white p-3 rounded font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
              >
                {loadingSend ? "Đang gửi mã..." : sent ? "Gửi lại mã" : "Gửi mã xác nhận"}
              </button>

              {message ? (
                <p className="text-sm text-green-400 leading-relaxed">{message}</p>
              ) : null}

              <hr className="border-gray-700 my-2" />

              <input
                type="text"
                placeholder="Mã xác nhận"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white rounded"
              />

              <input
                type="password"
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white rounded"
              />

              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white rounded"
              />

              <button
                onClick={onResetPassword}
                disabled={loadingReset}
                className="w-full bg-green-600 text-white p-3 rounded font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {loadingReset ? "Đang cập nhật..." : "Tiếp tục"}
              </button>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/auth/login"
                className="text-sm text-blue-400 hover:underline"
              >
                Quay về đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}