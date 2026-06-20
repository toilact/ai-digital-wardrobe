
"use client";

import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LogoutButton({ onClose }: { onClose?: () => void }) {
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      if (onClose) onClose();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full justify-center"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "14px 16px",
        borderRadius: "14px",
        border: "1px solid rgba(239, 68, 68, 0.3)", // red-500/30
        background: "rgba(239, 68, 68, 0.15)", // red-500/15
        color: "rgba(248, 113, 113, 1)", // red-400
        textDecoration: "none",
        transition: "transform .14s ease, background .14s ease, border-color .14s ease",
        fontWeight: 600,
        fontSize: "14px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
        e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
      }}
    >
      Đăng xuất
    </button>
  );
}