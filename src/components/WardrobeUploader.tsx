"use client";

import { useAuth } from "@/lib/AuthContext";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function WardrobeUploader() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Áo");
  const [color, setColor] = useState("Đen");
  const [uploading, setUploading] = useState(false);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const onUpload = async () => {
    if (!user) return;
    if (!file) return alert("Chọn ảnh trước đã.");

    setUploading(true);
    try {
      // 1) Upload lên Storage theo UID
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}.${ext}`;
      const storagePath = `wardrobe/${user.uid}/${filename}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // 2) Lưu metadata vào Firestore
      await addDoc(collection(db, "wardrobeItems"), {
        uid: user.uid,
        imageUrl,
        storagePath,
        category,
        color,
        createdAt: serverTimestamp(),
      });

      alert("Đã thêm vào tủ đồ ✅");
      setFile(null);

      // Option: sau upload chuyển sang trang list tủ
      router.push("/wardrobe");
    } catch (e) {
      console.error(e);
      alert("Upload thất bại. Kiểm tra Storage/Rules.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  return (
    <div className="max-w-xl space-y-4">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {previewUrl && (
        <div className="border rounded-xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="preview" className="w-full rounded-lg" />
        </div>
      )}

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

      <button
        onClick={onUpload}
        disabled={!file || uploading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {uploading ? "Đang upload..." : "Thêm vào tủ đồ"}
      </button>
    </div>
  );
}
