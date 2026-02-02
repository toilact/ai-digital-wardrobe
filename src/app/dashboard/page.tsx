"use client";

import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "@/components/LogoutButton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [loading, user, router]);

  if (loading) return <div className="p-6">Loading...</div>;
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
