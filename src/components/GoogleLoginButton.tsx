"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function GoogleLoginButton() {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      window.location.href = "/dashboard";
    } catch (e) {
      console.error(e);
      alert("Login failed");
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="px-5 py-3 rounded bg-black text-white"
    >
      Login with Google
    </button>
  );
}
