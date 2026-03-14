"use client";

import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { FiArrowRight, FiLock, FiUser } from "react-icons/fi";

async function getLoginEmails(username: string) {
  const fallbackEmail = `${username}@adw.local`;

  if (!db) {
    return [fallbackEmail];
  }

  const usernameSnap = await getDoc(doc(db, "usernames", username));
  const mappedEmail = usernameSnap.exists()
    ? (usernameSnap.data()?.email as string | undefined)?.trim().toLowerCase()
    : "";

  return Array.from(new Set([mappedEmail, fallbackEmail].filter(Boolean)));
}

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!username || !pass) {
      alert("Nhập tên đăng nhập và mật khẩu");
      return;
    }

    setLoading(true);

    if (!auth) {
      alert("Firebase chưa được khởi tạo!");
      setLoading(false);
      return;
    }

    try {
      const uname = username.trim().toLowerCase();
      const loginEmails = await getLoginEmails(uname);
      let lastError: unknown = null;

      for (const loginEmail of loginEmails) {
        try {
          await signInWithEmailAndPassword(auth, loginEmail, pass);
          router.push("/");
          return;
        } catch (err) {
          lastError = err;
          const code = ((err as AuthError)?.code ?? "").toString();

          if (
            code &&
            code !== "auth/invalid-credential" &&
            code !== "auth/user-not-found"
          ) {
            throw err;
          }
        }
      }

      throw lastError;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative overflow-hidden text-white">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#060816_0%,#0a1224_42%,#14081f_100%)]" />
      <div className="absolute inset-0 -z-20 opacity-70 bg-[radial-gradient(circle_at_15%_18%,rgba(56,189,248,.18),transparent_28%),radial-gradient(circle_at_84%_18%,rgba(217,70,239,.16),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,.10),transparent_32%)]" />
      <div className="absolute inset-0 -z-20 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:58px_58px]" />

      <Header />

      <section className="wrap">
        <div className="mx-auto flex min-h-[calc(100svh-165px)] items-center justify-center px-4 py-3 md:py-4">
          <div className="relative w-full max-w-[575px] overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl md:p-6">
            <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative z-10">
              <div className="mb-4 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/adw-logo-clean.png"
                  alt="AI Digital Wardrobe"
                  className="h-auto w-[220px] object-contain md:w-[238px]"
                  draggable={false}
                />
              </div>

              <div className="text-center">
                <h1 className="login-title mt-2 text-[40px] font-semibold tracking-tight md:text-[34px]">
                  Đăng nhập
                </h1>

                <p className="mx-auto mt-1 max-w-[420px] text-sm leading-7 text-white/60 md:text-[15px]">
                  {/* Tiếp tục quản lý tủ đồ, nhận gợi ý outfit thông minh và đồng bộ
                  trải nghiệm thời trang số của bạn. */}
                </p>
              </div>

              <div className="mt-6 rounded-[26px] border border-white/10 bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] md:p-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/75">
                      Tên đăng nhập
                    </label>
                    <div className="group flex h-13 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-14">
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

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/75">
                      Mật khẩu
                    </label>
                    <div className="group flex h-13 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-14">
                      <FiLock className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="password"
                        placeholder="Nhập mật khẩu"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1 text-sm">
                    <Link
                      href="/auth/forgot-password"
                      className="font-medium text-cyan-300 transition hover:text-cyan-200 hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>

                  <button
                    onClick={onLogin}
                    disabled={loading}
                    className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_12px_35px_rgba(59,130,246,.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(99,102,241,.30)] disabled:cursor-not-allowed disabled:opacity-60 md:h-14"
                  >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    {!loading && (
                      <FiArrowRight className="transition group-hover:translate-x-0.5" />
                    )}
                  </button>
                </div>

                <div className="my-5 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs font-medium uppercase tracking-[0.24em] text-white/35">
                    Hoặc
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <GoogleLoginButton />

                <p className="mt-4 text-center text-sm text-white/55">
                  Chưa có tài khoản?{" "}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-fuchsia-300 transition hover:text-fuchsia-200 hover:underline"
                  >
                    Đăng ký ngay
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .login-title {
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