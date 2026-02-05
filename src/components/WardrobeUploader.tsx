"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SegItem = {
  category: string;
  label: string;
  confidence: number;
};

type AnalyzeResult = {
  ok: boolean;
  mode?: string;
  original?: { imageUrl: string; cloudinaryPublicId: string };
  items?: SegItem[];
  debug?: any;
  message?: string;
};

export default function WardrobeUploader() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);

  // UI cũ (vẫn giữ)
  const [category, setCategory] = useState("Áo");
  const [color, setColor] = useState("Đen");
  const [uploading, setUploading] = useState(false);

  // mới: result console
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const onAnalyze = async () => {
    if (!user) return;
    if (!file) return alert("Chọn ảnh trước đã.");

    setAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      // gửi kèm cũng được, nhưng mode=analyze hiện chưa dùng
      formData.append("category", category);
      formData.append("color", color);

      const idToken = await user.getIdToken();

      const res = await fetch("/api/wardrobe/upload?mode=analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "Analyze thất bại.");
        return;
      }

      console.log("ANALYZE RESULT:", data);
      setResult(data);
    } catch (e) {
      console.error(e);
      alert("Analyze thất bại (lỗi mạng hoặc API).");
    } finally {
      setAnalyzing(false);
    }
  };

  const onUpload = async () => {
    if (!user) return;
    if (!file) return alert("Chọn ảnh trước đã.");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("color", color);

      const idToken = await user.getIdToken();

      const res = await fetch("/api/wardrobe/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.message || "Upload thất bại.");
        return;
      }

      console.log("UPLOAD RESULT:", data);
      alert("Đã thêm vào tủ đồ ✅");

      setFile(null);
      router.push("/wardrobe");
    } catch (e) {
      console.error(e);
      alert("Upload thất bại (lỗi mạng hoặc API).");
    } finally {
      setUploading(false);
    }
  };

  // drag & drop handlers
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setResult(null);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  return (
    <div className="max-w-xl space-y-4">
      {/* DROPZONE */}
      <div
        className="border-2 border-dashed rounded-xl p-4 cursor-pointer hover:bg-gray-50"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <div className="text-sm text-gray-700">
          Kéo & thả ảnh vào đây (hoặc bấm để chọn)
        </div>

        <input
          id="fileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />

        {file && (
          <div className="mt-2 text-xs text-gray-600">
            Đã chọn: <b>{file.name}</b> ({Math.round(file.size / 1024)} KB)
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="border rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="preview" className="w-full rounded-lg" />
        </div>
      )}

      {/* UI cũ: chọn loại/màu */}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Loại
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Áo</option>
            <option>Quần</option>
            <option>Váy</option>
            <option>Giày</option>
            <option>Phụ kiện</option>
          </select>
        </label>

        <label className="text-sm">
          Màu
          <select
            className="mt-1 w-full border rounded px-3 py-2"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          >
            <option>Đen</option>
            <option>Trắng</option>
            <option>Xanh</option>
            <option>Đỏ</option>
            <option>Be</option>
            <option>Khác</option>
          </select>
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onAnalyze}
          disabled={!file || analyzing || uploading}
          className="px-4 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
        >
          {analyzing ? "Đang phân tích..." : "Phân tích (AI)"}
        </button>

        <button
          onClick={onUpload}
          disabled={!file || uploading || analyzing}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {uploading ? "Đang upload..." : "Thêm vào tủ đồ"}
        </button>
      </div>

      {/* Console panel */}
      <div className="mt-2">
        <div className="font-semibold mb-2">Console (kết quả mô hình)</div>
        <pre className="bg-black text-green-200 rounded-xl p-3 text-xs overflow-x-auto min-h-[160px]">
{result ? JSON.stringify(result, null, 2) : "// Bấm “Phân tích (AI)” để xem mô hình tách được gì"}
        </pre>
      </div>
    </div>
  );
}
