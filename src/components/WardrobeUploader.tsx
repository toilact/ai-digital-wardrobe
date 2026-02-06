"use client";

import { useAuth } from "@/lib/AuthContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
}

export default function WardrobeUploader({ onUploadingChange }: { onUploadingChange?: (v: boolean) => void }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const addFiles = (files: FileList | null) => {
    if (isUploading) return;
    if (!files) return;

    const newItems: UploadItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        newItems.push({
          id: `${Date.now()}-${i}`,
          file,
          preview: URL.createObjectURL(file),
          uploading: false,
        });
      }
    }
    setItems([...items, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
  };

  const removeItem = (id: string) => {
    if (isUploading) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const uploadAll = async () => {
    if (!user || items.length === 0) return;

    setIsUploading(true);
    onUploadingChange?.(true);
    setSuccessMessage("");
    setHasError(false);
    let successCount = 0;
    let failCount = 0;

    for (const item of items) {
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("category", "Áo"); // Default category
        formData.append("color", "Đen"); // Default color

        const idToken = await user.getIdToken();

        const res = await fetch("/api/wardrobe/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Upload failed:", data?.message);
          failCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        console.error("Upload error:", e);
        failCount++;
      }
    }

    setIsUploading(false);
    onUploadingChange?.(false);

    if (failCount > 0) {
      setHasError(true);
    }

    if (successCount > 0 && failCount === 0) {
      setSuccessMessage("✅ Thêm vào tủ đồ thành công");
      setTimeout(() => {
        router.push("/wardrobe");
      }, 1000);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all p-8 text-center ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"
          } ${dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
          }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          disabled={isUploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-2">
          <div className="text-4xl">📸</div>
          <div className="font-semibold text-gray-700">Kéo ảnh tại đây hoặc click để chọn</div>
          <div className="text-sm text-gray-500">Hỗ trợ upload nhiều ảnh</div>
        </div>
      </div>

      {/* Image Grid */}
      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {items.length} ảnh được chọn
            </h2>
            <button
              onClick={() => setItems([])}
              disabled={isUploading}
              className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xóa tất cả
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-square border border-gray-200"
              >
                {/* Image */}
                <img
                  src={item.preview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={uploadAll}
            disabled={items.length === 0 || isUploading}
            className="mt-6 w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {isUploading
              ? "Đang upload ảnh..."
              : `Đưa vào tủ đồ (${items.length} ảnh)`}
          </button>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg text-center text-green-700 font-semibold">
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {hasError && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg text-center text-red-700 font-semibold">
              ❌ Có lỗi khi tải một số ảnh
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-4">👗</div>
          <p>Chưa có ảnh nào được chọn</p>
        </div>
      )}
    </div>
  );
}
