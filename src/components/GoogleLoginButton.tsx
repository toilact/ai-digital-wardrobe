"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import AlertModal from "./AlertModal";

export default function GoogleLoginButton() {
  const router = useRouter();
  const [alertMsg, setAlertMsg] = useState("");

  const handleLogin = async () => {
    if (!auth) {
      setAlertMsg("Firebase chưa được khởi tạo!");
      return;
    }

    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    router.push("/dashboard");
  };

  return (
    <>
      <button
        onClick={handleLogin}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white transition hover:border-white/15 hover:bg-white/[0.08]"
      >
        <FcGoogle className="text-2xl" />
        <span className="font-medium text-white/85">Tiếp tục với Google</span>
      </button>
      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </>
  );
}