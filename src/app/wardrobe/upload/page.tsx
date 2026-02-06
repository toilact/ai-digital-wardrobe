"use client";

import WardrobeUploader from "@/components/WardrobeUploader";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WardrobeUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FFFDD0] p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/dashboard")}
          disabled={isUploading}
          className={`px-3 py-2 rounded border hover:bg-black hover:text-white bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          ← Quay lại Dashboard
        </button>

        <h1 className="text-xl font-semibold">Upload vào tủ đồ</h1>

        <button
          onClick={() => router.push("/wardrobe")}
          disabled={isUploading}
          className={`px-3 py-2 rounded border hover:bg-black hover:text-white bg-white ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Xem tủ đồ →
        </button>
      </div>

      <WardrobeUploader onUploadingChange={setIsUploading} />
    </main>
  );
}
