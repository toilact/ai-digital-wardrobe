// src/components/VipBuyButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function VipBuyButton() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [creating, setCreating] = useState(false);

  const onBuy = async () => {
    try {
      if (loading) return;

      if (!user) {
        router.push("/auth/login?next=/services");
        return;
      }

      setCreating(true);

      const token = await user.getIdToken();
      const res = await fetch("/api/vip/create-order", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Không thể tạo đơn VIP.");
        return;
      }

      router.push(`/vip/checkout?orderId=${data.orderId}`);
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi tạo đơn VIP.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <button
      onClick={onBuy}
      disabled={creating || loading}
      className="w-full text-center bg-gradient-to-r from-blue-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-pink-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {creating ? "Đang tạo đơn..." : "Mua Vip Thôi Nào !"}
    </button>
  );
}