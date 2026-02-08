"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState, useEffect, useRef } from "react";
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

  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState("Áo");
  const [color, setColor] = useState("Đen");

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const previewUrls = useMemo(() => {
    return files.map((f) => URL.createObjectURL(f));
  }, [files]);

  // pick multiple files (from input or drop)
  const onAddFiles = (newFiles: File[]) => {
    setFiles((s) => {
      const merged = [...s, ...newFiles];
      return merged;
    });
    // if no active, set first newly added as active
    setActiveIndex((cur) => (cur === null ? 0 : cur));
    setParsedItems([]);
    setSelected({});
  };

  const onRemoveFile = (idx: number) => {
    setFiles((s) => s.filter((_, i) => i !== idx));
    setParsedItems([]);
    setSelected({});
    setActiveIndex((cur) => {
      if (cur === null) return null;
      if (idx < cur) return cur - 1;
      if (idx === cur) return null;
      return cur;
    });
  };

  const onParse = async (index?: number) => {
    const idx = typeof index === "number" ? index : activeIndex;
    if (!user) return;
    if (idx === null || typeof idx !== "number") return alert("Chọn ảnh trước đã.");
    const fileToParse = files[idx];

    setParsing(true);
    try {
      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", fileToParse);

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

  const onUploadSelected = async (index?: number) => {
    const idx = typeof index === "number" ? index : activeIndex;
    if (!user) return;
    if (idx === null || typeof idx !== "number") return alert("Chọn ảnh trước đã.");
    const fileToUpload = files[idx];

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
      formData.append("file", fileToUpload);
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
      // remove the uploaded file from list
      setFiles((s) => s.filter((_, i) => i !== idx));
      setActiveIndex(null);
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

  // cleanup created object URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length) onAddFiles(list);
    // reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const list = ev.dataTransfer.files ? Array.from(ev.dataTransfer.files).filter((f) => f.type.startsWith("image/")) : [];
    if (list.length) onAddFiles(list);
  };

  const handleDragOver = (ev: React.DragEvent) => {
    ev.preventDefault();
  };

  return (
    <div className="max-w-xl space-y-4 relative">
      {/* overlay to block interaction when parsing/uploading */}
      {(parsing || uploading) && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-white">{parsing ? "Đang tách..." : "Đang xử lý..."}</div>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-dashed border-2 border-white/10 rounded-lg p-6 text-center cursor-pointer text-white/80 hover:bg-white/5"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onInputChange}
          className="hidden"
        />
        Kéo thả hình vào đây hoặc nhấn để chọn nhiều file
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Ảnh sắp tách ({files.length})</div>
          <div className="flex gap-3 overflow-x-auto py-2">
            {files.map((f, idx) => (
              <div
                key={idx}
                className={`relative border border-white/10 rounded-lg overflow-hidden w-36 flex-shrink-0 ${activeIndex === idx ? "ring-2 ring-indigo-400" : ""}`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(idx); }}
                  className="absolute top-1 right-1 z-20 bg-white/10 text-white rounded-full p-1"
                  aria-label="Xóa ảnh"
                >
                  ×
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrls[idx]}
                  alt={f.name}
                  className="w-full h-24 object-cover"
                  onClick={() => { setActiveIndex(idx); setParsedItems([]); setSelected({}); }}
                />
                <div className="p-2 text-xs truncate text-white/80" title={f.name}>{f.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* selects removed to match dark theme — category/color kept as defaults */}

      <div className="flex gap-2">
        <button
          onClick={() => onParse()}
          disabled={activeIndex === null || parsing || uploading}
          className="px-4 py-2 rounded border text-white bg-white/5 border-white/20 hover:bg-white/10 disabled:opacity-50"
        >
          {parsing ? "Đang tách..." : "Tách đồ"}
        </button>

        <button
          onClick={() => onUploadSelected()}
          disabled={activeIndex === null || uploading || parsing || (parsedItems.length > 0 && Object.values(selected).every((v) => !v))}
          className="px-4 py-2 rounded border text-white bg-gradient-to-r from-indigo-500/30 to-pink-500/20 border-indigo-400/20 hover:from-indigo-500/40 hover:to-pink-500/30 disabled:opacity-50"
        >
          {uploading ? "Đang ném..." : "Ném vào tủ đồ"}
        </button>
      </div>

      {parsedItems.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium">Kết quả tách ({parsedItems.length})</div>
          <div className="grid grid-cols-2 gap-3">
            {parsedItems.map((it, idx) => (
              <label key={idx} className="border border-white/10 rounded-xl p-2 cursor-pointer">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={!!selected[idx]}
                    onChange={(e) => setSelected((s) => ({ ...s, [idx]: e.target.checked }))}
                  />
                  <div className="text-xs opacity-70">{it.type}</div>
                </div>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageDataUrl} alt={it.type} className="w-full rounded-lg bg-white/5" />
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
