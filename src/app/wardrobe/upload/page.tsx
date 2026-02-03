"use client";

import WardrobeUploader from "@/components/WardrobeUploader";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

export default function WardrobeUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard")}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          ← Quay lại Dashboard
        </button>

        <h1 className="text-xl font-semibold">Upload vào tủ đồ</h1>

        <button
          onClick={() => router.push("/wardrobe")}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Xem tủ đồ →
        </button>
      </div>

      <WardrobeUploader />
    </main>
  );
}
