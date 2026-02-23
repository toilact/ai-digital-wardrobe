// "use client";

// import { signOut } from "firebase/auth";
// import { auth } from "@/lib/firebase";
// import { useRouter } from "next/navigation";

// export default function LogoutButton() {
//   const router = useRouter();

//   const handleLogout = async () => {
//     await signOut(auth);
//     router.push("/");
//   };

//   return (
//     <button
//       onClick={handleLogout}
//       className="px-4 py-2 rounded bg-red-500 text-white"
//     >
//       Đăng xuất
//     </button>
//   );
// }



"use client";

import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "11px 16px",
        borderRadius: "14px",
        border: "1px solid rgba(255, 255, 255, .12)",
        background: "rgba(255, 255, 255, .05)",
        color: "rgba(255, 255, 255, .92)",
        textDecoration: "none",
        transition: "transform .14s ease, background .14s ease, border-color .14s ease",
        fontWeight: 550,
        fontSize: "13px",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.background = "rgba(255, 255, 255, .08)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, .22)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.background = "rgba(255, 255, 255, .05)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, .12)";
      }}
    >
      Đăng xuất

    </button>
  );
}