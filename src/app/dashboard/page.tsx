"use client";

import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "@/components/LogoutButton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile } from "@/lib/profile";

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
        // nếu lỗi Firestore thì vẫn cho qua để demo, hoặc m muốn bắt quay lại cũng được
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
          <h1 className="text-2xl font-semibold">
            Xin chào {user.displayName}
          </h1>
          <p className="text-gray-500">{user.email}</p>
        </div>

        <LogoutButton />
      </div>

      <p>Dashboard nội dung ở đây…</p>
    </main>
  );
}
