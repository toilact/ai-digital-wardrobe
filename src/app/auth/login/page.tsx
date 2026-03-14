"use client";

import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import Header from "@/components/Header";

async function getLoginEmails(username: string) {
  const fallbackEmail = `${username}@adw.local`;

  if (!db) {
    return [fallbackEmail];
  }

  const usernameSnap = await getDoc(doc(db, "usernames", username));
  const mappedEmail = usernameSnap.exists()
    ? (usernameSnap.data()?.email as string | undefined)?.trim().toLowerCase()
    : "";

  return Array.from(
    new Set([mappedEmail, fallbackEmail].filter(Boolean))
  );
}

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!username || !pass) return alert("Nhập tên đăng nhập và mật khẩu");

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
    <main>
      <Header />
      <div className="wrap">
        <div className="mt-20 flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-[400px] bg-gray-900 rounded-xl p-6 shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-light text-white mb-2 tracking-tight">
              Đăng nhập
            </h2>

            <div className="w-full space-y-4">
              <div className="relative m-2">
                <input
                  type="text"
                  placeholder="Tên đăng nhập"
                  value={username}
                  className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white rounded"
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="relative m-2">
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full border border-gray-300 p-3 outline-none focus:border-blue-400 bg-gray-800 text-white rounded"
                />
              </div>

              <div className="flex justify-end px-2 -mt-2">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-400 hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              <div className="m-2">
                <button
                  onClick={onLogin}
                  disabled={loading}
                  className="w-full bg-[#4a90e2] text-white p-3 font-semibold hover:bg-blue-600 transition-colors rounded"
                >
                  {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>
              </div>
            </div>

            <div className="w-full flex items-center my-6">
              <div className="flex-1 h-[1px] bg-gray-200"></div>
              <span className="px-3 text-xs text-gray-400 uppercase">Hoặc</span>
              <div className="flex-1 h-[1px] bg-gray-200"></div>
            </div>

            <div className="pt-2 border-t border-gray-700 w-full">
              <GoogleLoginButton />
            </div>

            <div className="flex gap-4 text-sm text-white mt-4">
              <Link href="/auth/register" className="hover:underline">
                Đăng ký
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
