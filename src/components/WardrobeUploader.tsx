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
  onUploadSuccess,
}: {
  onUploadingChange?: (v: boolean) => void;
  onUploadSuccess?: () => void;
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
    if (!user) return;

    // parse single image when index provided, otherwise parse all uploaded files
    const indices: number[] = typeof index === "number" ? [index] : files.map((_, i) => i);
    if (indices.length === 0) return alert("Không có ảnh để tách.");

    setParsing(true);
    onUploadingChange?.(true);

    try {
      const idToken = await user.getIdToken();
      let allItems: ParsedItem[] = [];

      for (const idx of indices) {
        const fileToParse = files[idx];
        const formData = new FormData();
        formData.append("file", fileToParse);

        try {
          const res = await fetch("/api/wardrobe/parse", {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` },
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) {
            console.error("PARSE FAIL for file index", idx, data);
            continue;
          }

          const items: ParsedItem[] = data.items || [];
          allItems = allItems.concat(items);
        } catch (e) {
          console.error("Parse request failed for index", idx, e);
          continue;
        }
      }

      setParsedItems(allItems);

      // mặc định chọn hết
      const nextSelected: Record<number, boolean> = {};
      allItems.forEach((_, idx) => (nextSelected[idx] = true));
      setSelected(nextSelected);

      if (allItems.length === 0) alert("Không phát hiện được item nào 😢");
    } catch (e) {
      console.error(e);
      alert("Tách đồ thất bại (lỗi mạng hoặc API).");
    } finally {
      setParsing(false);
      onUploadingChange?.(false);
    }
  };

  const onUploadSelected = async () => {
    if (!user) return;

    // Bắt buộc phải tách trước
    if (parsedItems.length === 0) {
      return alert("Bạn cần tách đồ trước khi upload.");
    }

    // Lấy đúng các item đã tick
    const picked = parsedItems
      .map((it, idx) => ({ it, idx }))
      .filter(({ idx }) => !!selected[idx])
      .map(({ it }) => ({
        type: it.type || category,
        // phòng trường hợp base64 có prefix "data:image/png;base64,..."
        image_png_base64: it.image_png_base64?.includes(",")
          ? it.image_png_base64.split(",")[1]
          : it.image_png_base64,
      }));

    if (picked.length === 0) return alert("Bạn chưa chọn item nào để ném vào tủ.");

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const idToken = await user.getIdToken();

      // ✅ Gửi thẳng những item đã chọn lên /confirm để lưu
      const res = await fetch("/api/wardrobe/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: picked }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.message || "Confirm thất bại.");
        console.error("CONFIRM FAIL:", data);
        return;
      }

      // clear all files/state since we parsed/uploaded across all images
      setFiles([]);
      setActiveIndex(null);
      setParsedItems([]);
      setSelected({});

      // notify parent that upload succeeded (parent will show success toast and navigate)
      onUploadSuccess?.();
    } catch (e) {
      console.error(e);
      alert("Confirm thất bại (lỗi mạng hoặc API).");
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
          disabled={files.length === 0 || parsing || uploading}
          className="px-4 py-2 rounded border text-white bg-white/5 border-white/20 hover:bg-white/10 disabled:opacity-50"
        >
          {parsing ? "Đang tách..." : "Tách đồ"}
        </button>

        <button
          onClick={() => onUploadSelected()}
          disabled={parsedItems.length === 0 || uploading || parsing || Object.values(selected).every((v) => !v)}
          className="px-4 py-2 rounded border text-white bg-gradient-to-r from-indigo-500/30 to-pink-500/20 border-indigo-400/20 hover:from-indigo-500/40 hover:to-pink-500/30 disabled:opacity-50"
        >
          {uploading ? "Đang đưa vào tủ đồ..." : "Đưa vào tủ đồ"}
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
            * con bò Chí Thành đẹp trai
          </div>
        </div>
      )}
    </div>
  );
}
