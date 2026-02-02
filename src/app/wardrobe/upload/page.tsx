"use client";

import WardrobeUploader from "@/components/WardrobeUploader";

export default function WardrobeUploadPage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold mb-4">Thêm đồ vào tủ</h1>
      <WardrobeUploader />
    </main>
  );
}
