"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/profile";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import AlertModal from "./AlertModal";

export default function GoogleLoginButton() {
  const router = useRouter();
  const [alertMsg, setAlertMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!auth) {
      setAlertMsg("Firebase chưa được khởi tạo!");
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if user already has a complete profile in Firestore
      const profile = await getUserProfile(result.user.uid);
      if (profile) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (e) {
      console.error("Google login failed:", e);
      setAlertMsg("Đăng nhập Google thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleLogin}
        disabled={loading}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white transition hover:border-white/15 hover:bg-white/[0.08] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <FcGoogle className="text-2xl" />
        <span className="font-medium text-white/85">
          {loading ? "Đang đăng nhập..." : "Tiếp tục với Google"}
        </span>
      </button>
      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </>
  );
}