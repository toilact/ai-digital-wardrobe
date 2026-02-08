"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ParsedItem = {
  type: string;
  imageDataUrl: string;
  image_png_base64: string;
};

export default function WardrobeUploader({
  onUploadingChange,
}: {
  onUploadingChange?: (v: boolean) => void;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Áo");
  const [color, setColor] = useState("Đen");

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // reset khi đổi file
  const onPickFile = (f: File | null) => {
    setFile(f);
    setParsedItems([]);
    setSelected({});
  };

  const onParse = async () => {
    if (!user) return;
    if (!file) return alert("Chọn ảnh trước đã.");

    setParsing(true);
    try {
      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/wardrobe/parse", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.message || "Tách đồ thất bại.");
        console.error("PARSE FAIL:", data);
        return;
      }

      const items: ParsedItem[] = data.items || [];
      setParsedItems(items);

      // mặc định chọn hết
      const nextSelected: Record<number, boolean> = {};
      items.forEach((_, idx) => (nextSelected[idx] = true));
      setSelected(nextSelected);

      if (items.length === 0) alert("Không phát hiện được item nào 😢");
    } catch (e) {
      console.error(e);
      alert("Tách đồ thất bại (lỗi mạng hoặc API).");
    } finally {
      setParsing(false);
    }
  };

  const onUploadSelected = async () => {
    if (!user) return;
    if (!file) return alert("Chọn ảnh trước đã.");

    // demo nhanh: upload route hiện parse lại từ ảnh gốc
    // nên dù bạn chọn item nào, backend vẫn tách lại.
    // (mình giữ đúng yêu cầu demo nút + flow)
    const pickedCount = Object.values(selected).filter(Boolean).length;
    if (parsedItems.length > 0 && pickedCount === 0) {
      return alert("Bạn chưa chọn item nào để ném vào tủ.");
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("color", color);

      // (tuỳ chọn) gửi list index được chọn để sau này backend dùng
      // hiện tại backend upload chưa đọc cái này nên chưa có tác dụng
      formData.append(
        "selectedIndexes",
        JSON.stringify(
          Object.entries(selected)
            .filter(([, v]) => v)
            .map(([k]) => Number(k))
        )
      );

      const res = await fetch("/api/wardrobe/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.message || "Upload thất bại.");
        console.error("UPLOAD FAIL:", data);
        return;
      }

      alert(`Đã ném vào tủ đồ ✅ (${data.count || 0} items)`);
      setFile(null);
      setParsedItems([]);
      setSelected({});
      router.push("/wardrobe");
    } catch (e) {
      console.error(e);
      alert("Upload thất bại (lỗi mạng hoặc API).");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
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
        onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
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

      <div className="flex gap-2">
        <button
          onClick={onParse}
          disabled={!file || parsing || uploading}
          className="px-4 py-2 rounded bg-white border disabled:opacity-50"
        >
          {parsing ? "Đang tách..." : "Tách đồ"}
        </button>

        <button
          onClick={onUploadSelected}
          disabled={!file || uploading || parsing || (parsedItems.length > 0 && Object.values(selected).every((v) => !v))}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {uploading ? "Đang ném..." : "Ném vào tủ đồ"}
        </button>
      </div>

      {parsedItems.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Kết quả tách ({parsedItems.length})</div>
          <div className="grid grid-cols-2 gap-3">
            {parsedItems.map((it, idx) => (
              <label key={idx} className="border rounded-xl p-2 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={!!selected[idx]}
                    onChange={(e) => setSelected((s) => ({ ...s, [idx]: e.target.checked }))}
                  />
                  <div className="text-xs opacity-70">{it.type}</div>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageDataUrl} alt={it.type} className="w-full rounded-lg bg-gray-50" />
              </label>
            ))}
          </div>

          <div className="text-xs opacity-60">
            * Chí Thành đẹp trai
          </div>
        </div>
      )}
    </div>
  );
}
