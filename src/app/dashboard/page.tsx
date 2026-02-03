"use client";

import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "@/components/LogoutButton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/profile";
import Link from "next/link";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [checkingProfile, setCheckingProfile] = useState(true);

  // 1) Chưa login -> về trang /
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // 2) Đã login -> kiểm tra profile trong Firestore
  useEffect(() => {
    const run = async () => {
      if (!user) return;

      try {
        const profile = await getUserProfile(user.uid);

        // Nếu chưa có profile -> bắt onboarding
        if (!profile) {
          router.replace("/onboarding");
          return;
        }

        // Có profile -> cho vào dashboard
        setCheckingProfile(false);
      } catch (e) {
        console.error(e);
        // nếu lỗi Firestore thì vẫn cho qua để demo
        setCheckingProfile(false);
      }
    };

    if (!loading && user) run();
  }, [loading, user, router]);

  if (loading || checkingProfile) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Xin chào {user.displayName}</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>

        <LogoutButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/wardrobe/upload"
          className="rounded-xl border p-4 hover:bg-gray-50 transition"
        >
          <h2 className="text-lg font-semibold">📸 Upload vào tủ đồ</h2>
          <p className="text-sm text-gray-500 mt-1">
            Chụp/Chọn ảnh quần áo để lưu vào CSDL
          </p>
        </Link>

        <Link
          href="/wardrobe"
          className="rounded-xl border p-4 hover:bg-gray-50 transition"
        >
          <h2 className="text-lg font-semibold">🧥 Xem tủ đồ</h2>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách đồ đã lưu (lọc theo loại/màu)
          </p>
        </Link>

        <Link
          href="/chat"
          className="rounded-xl border p-4 hover:bg-gray-50 transition"
        >
          <h2 className="text-lg font-semibold">🤖 Gợi ý outfit</h2>
          <p className="text-sm text-gray-500 mt-1">
            Chatbot gợi ý theo thời tiết/địa điểm/đi cùng ai
          </p>
        </Link>
      </div>
    </main>
  );
}
