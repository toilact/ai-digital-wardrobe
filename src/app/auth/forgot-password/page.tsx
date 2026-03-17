"use client";

import Header from "@/components/Header";
import AlertModal from "@/components/AlertModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiArrowRight, FiKey, FiLock, FiMail, FiUser } from "react-icons/fi";

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
  const [errorSend, setErrorSend] = useState("");
  const [errorReset, setErrorReset] = useState("");
  const [alertMsg, setAlertMsg] = useState("");

  const onSendCode = async () => {
    setErrorSend("");
    const uname = username.trim().toLowerCase();

    if (!uname) {
      setErrorSend("Nhập tên đăng nhập.");
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
      setErrorSend(err?.message || "Không gửi được mã xác nhận.");
    } finally {
      setLoadingSend(false);
    }
  };

  const onResetPassword = async () => {
    setErrorReset("");
    setMessage("");
    const uname = username.trim().toLowerCase();

    if (!uname) return setErrorReset("Nhập tên đăng nhập.");
    if (!code) return setErrorReset("Nhập mã xác nhận.");
    if (!newPassword) return setErrorReset("Nhập mật khẩu mới.");
    if (newPassword.length < 6) {
      return setErrorReset("Mật khẩu mới phải có ít nhất 6 ký tự.");
    }
    if (newPassword !== confirmPassword) {
      return setErrorReset("Mật khẩu nhập lại không khớp.");
    }

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

      setAlertMsg("Đặt lại mật khẩu thành công. Hãy đăng nhập lại.");
    } catch (err: any) {
      setErrorReset(err?.message || "Không đặt lại được mật khẩu.");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <main className="relative overflow-hidden text-white">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#060816_0%,#0a1224_42%,#14081f_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-70 bg-[radial-gradient(circle_at_15%_18%,rgba(56,189,248,.18),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(217,70,239,.16),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,.10),transparent_32%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:58px_58px]" />

      <Header />
      <AlertModal 
        isOpen={!!alertMsg} 
        message={alertMsg} 
        onClose={() => {
          const msg = alertMsg;
          setAlertMsg("");
          if (msg.includes("thành công")) {
            router.push("/auth/login");
          }
        }} 
      />

      <section className="wrap">
        <div className="mx-auto flex min-h-[calc(100svh-165px)] items-center justify-center px-4 py-2 md:py-3">
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl md:p-6">
            <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-2 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/adw-logo-clean.png"
                  alt="AI Digital Wardrobe"
                  className="h-auto w-[180px] object-contain md:w-[200px]"
                  draggable={false}
                />
              </div>

              <div className="text-center">
                <h1 className="forgot-title mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">
                  Quên mật khẩu
                </h1>

                <p className="mx-auto mt-1 max-w-[450px] text-sm leading-7 text-white/60 md:text-[15px]">
                  Nhập tên đăng nhập để nhận mã xác nhận qua email đã đăng ký,
                  sau đó đặt lại mật khẩu mới cho tài khoản của bạn.
                </p>
              </div>

              <div className="mt-4 rounded-[20px] border border-white/10 bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/75">
                      Tên đăng nhập
                    </label>
                    <div className="group flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-12">
                      <FiUser className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="text"
                        placeholder="Nhập tên đăng nhập"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  {errorSend && <p className="text-sm text-red-500">{errorSend}</p>}

                  <button
                    onClick={onSendCode}
                    disabled={loadingSend}
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_12px_35px_rgba(59,130,246,.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(99,102,241,.30)] disabled:cursor-not-allowed disabled:opacity-60 md:h-12"
                  >
                    {loadingSend ? (
                      "Đang gửi mã..."
                    ) : sent ? (
                      "Gửi lại mã"
                    ) : (
                      <>
                        Gửi mã xác nhận
                        <FiMail className="transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  {message ? (
                    <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-2 text-sm leading-6 text-emerald-200/90">
                      {message}
                    </div>
                  ) : null}

                  <div className="my-1 flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs font-medium uppercase tracking-[0.24em] text-white/35">
                      Cập nhật mật khẩu
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/75">
                      Mã xác nhận
                    </label>
                    <div className="group flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-12">
                      <FiKey className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="text"
                        placeholder="Nhập mã 6 chữ số"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/75">
                      Mật khẩu mới
                    </label>
                    <div className="group flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-12">
                      <FiLock className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="password"
                        placeholder="Tối thiểu 6 ký tự"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-white/75">
                      Nhập lại mật khẩu mới
                    </label>
                    <div className="group flex h-11 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-12">
                      <FiLock className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  {errorReset && <p className="text-sm text-red-500">{errorReset}</p>}

                  <button
                    onClick={onResetPassword}
                    disabled={loadingReset}
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-base font-semibold text-white shadow-[0_12px_35px_rgba(16,185,129,.22)] transition hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(20,184,166,.24)] disabled:cursor-not-allowed disabled:opacity-60 md:h-12"
                  >
                    {loadingReset ? "Đang cập nhật..." : "Tiếp tục"}
                    {!loadingReset && (
                      <FiArrowRight className="transition group-hover:translate-x-0.5" />
                    )}
                  </button>
                </div>

                <p className="mt-3 text-center text-sm text-white/55">
                  Nhớ lại mật khẩu rồi?{" "}
                  <Link
                    href="/auth/login"
                    className="font-semibold text-cyan-300 transition hover:text-cyan-200 hover:underline"
                  >
                    Quay về đăng nhập
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .forgot-title {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #e9d5ff 22%,
            #67e8f9 48%,
            #c4b5fd 72%,
            #ffffff 100%
          );
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: titleShine 5s ease-in-out infinite;
          filter: drop-shadow(0 0 10px rgba(103, 232, 249, 0.1));
        }

        @keyframes titleShine {
          0% {
            background-position: 0% 50%;
            filter: drop-shadow(0 0 8px rgba(103, 232, 249, 0.08));
          }
          50% {
            background-position: 100% 50%;
            filter: drop-shadow(0 0 18px rgba(192, 132, 252, 0.18));
          }
          100% {
            background-position: 0% 50%;
            filter: drop-shadow(0 0 8px rgba(103, 232, 249, 0.08));
          }
        }
      `}</style>
    </main>
  );
}