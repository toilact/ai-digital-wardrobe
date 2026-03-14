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
import Header from "@/components/Header";
import { FiAtSign, FiCheckCircle, FiLock, FiUser } from "react-icons/fi";

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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    const uname = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!uname) return alert("Nhập tên đăng nhập.");
    if (!/^[a-z0-9_-]{3,32}$/.test(uname)) {
      return alert(
        "Tên đăng nhập chỉ gồm chữ thường, số, gạch dưới hoặc gạch ngang (3-32 ký tự)."
      );
    }

    if (!normalizedEmail) return alert("Nhập email.");
    if (!isValidEmail(normalizedEmail)) return alert("Email không hợp lệ.");

    if (!pass) return alert("Nhập mật khẩu.");
    if (pass.length < 6) return alert("Mật khẩu phải từ 6 ký tự trở lên.");
    if (pass !== confirm) return alert("Mật khẩu nhập lại không khớp.");

    setLoading(true);

    try {
      if (!db || !auth) {
        throw new Error("Firebase chưa được khởi tạo!");
      }

      const unameRef = doc(db, "usernames", uname);
      const unameSnap = await getDoc(unameRef);

      if (unameSnap.exists()) {
        alert("Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.");
        return;
      }

      const cred = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        pass
      );

      const displayName = name.trim();
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      await setDoc(unameRef, {
        uid: cred.user.uid,
        email: normalizedEmail,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", cred.user.uid), {
        username: uname,
        displayName: displayName || null,
        email: normalizedEmail,
        createdAt: serverTimestamp(),
        isVIP: false,
        itemQuantity: 0,
        outfitGenerationsToday: 0,
        outfitGenerationDate: "",
      });

      router.replace("/onboarding");
    } catch (err) {
      alert(firebaseMsg(err));
      console.error(err);
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
          <div className="relative w-full max-w-[620px] overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.05] p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-2xl md:p-6">
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
                <h1 className="register-title mt-2 text-[40px] font-semibold tracking-tight md:text-[34px]">
                  Đăng ký
                </h1>

                <p className="mx-auto mt-1 max-w-[460px] text-sm leading-7 text-white/60 md:text-[15px]">
                  Tạo tài khoản để bắt đầu xây dựng tủ đồ số, nhận gợi ý outfit
                  và cá nhân hóa trải nghiệm AI Digital Wardrobe.
                </p>
              </div>

              <div className="mt-6 rounded-[26px] border border-white/10 bg-black/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] md:p-5">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/75">
                      Tên hiển thị <span className="text-white/40">(tuỳ chọn)</span>
                    </label>
                    <div className="group flex h-13 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-14">
                      <FiUser className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="text"
                        placeholder="Ví dụ: Nguyễn Văn A"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

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
                        autoComplete="username"
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/75">
                      Email
                    </label>
                    <div className="group flex h-13 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-14">
                      <FiAtSign className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="email"
                        placeholder="Nhập email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
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
                        placeholder="Tối thiểu 6 ký tự"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/75">
                      Nhập lại mật khẩu
                    </label>
                    <div className="group flex h-13 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 transition focus-within:border-cyan-300/35 focus-within:bg-white/[0.05] md:h-14">
                      <FiCheckCircle className="mr-3 shrink-0 text-lg text-white/35 group-focus-within:text-cyan-200" />
                      <input
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-transparent text-white outline-none placeholder:text-white/28"
                      />
                    </div>
                  </div>

                  <button
                    onClick={onRegister}
                    disabled={loading}
                    className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 text-base font-semibold text-white shadow-[0_12px_35px_rgba(59,130,246,.28)] transition hover:scale-[1.01] hover:shadow-[0_18px_45px_rgba(99,102,241,.30)] disabled:cursor-not-allowed disabled:opacity-60 md:h-14"
                  >
                    {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                  </button>
                </div>

                <p className="mt-5 text-center text-sm text-white/55">
                  Đã có tài khoản?{" "}
                  <Link
                    href="/auth/login"
                    className="font-semibold text-cyan-300 transition hover:text-cyan-200 hover:underline"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .register-title {
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