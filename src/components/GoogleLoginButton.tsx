"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";

export default function GoogleLoginButton() {
  const router = useRouter();

  const handleLogin = async () => {
    if (!auth) {
      alert("Firebase chưa được khởi tạo!");
      return;
    }
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    router.push("/dashboard");
  };

  return (
    <button onClick={handleLogin} className="w-full flex items-center justify-center gap-3 border border-gray-300  bg-gray-700 py-1 px-3 hover:bg-gray-800 transition-all mb-2">
      <FcGoogle className="text-2xl" />
      <span className="text-white font-medium">Tiếp tục với Google</span>
    </button>
  );
}
