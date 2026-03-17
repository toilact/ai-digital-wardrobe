"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "./AlertModal";

type ParsedItem = {
  type: string;
  imageDataUrl: string;
  image_png_base64: string;
  sourceFileIndex: number;
};

const TYPE_OPTIONS = ["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"] as const;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [alertMsg, setAlertMsg] = useState("");

  // click-point per source file
  const [points, setPoints] = useState<Record<number, { x: number; y: number }>>({});

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  const onAddFiles = (newFiles: File[]) => {
    const imgs = newFiles.filter((f) => f.type.startsWith("image/"));
    setFiles((s) => [...s, ...imgs]);
    setParsedItems([]);
    setSelected({});
  };

  const onRemoveFile = (idx: number) => {
    setFiles((s) => s.filter((_, i) => i !== idx));
    setParsedItems([]);
    setSelected({});
    setPoints((p) => {
      const next: Record<number, { x: number; y: number }> = {};
      Object.entries(p).forEach(([k, v]) => {
        const i = Number(k);
        if (i < idx) next[i] = v;
        else if (i > idx) next[i - 1] = v;
      });
      return next;
    });
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (list.length) onAddFiles(list);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    const list = ev.dataTransfer.files
      ? Array.from(ev.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
      : [];
    if (list.length) onAddFiles(list);
  };

  const handleDragOver = (ev: React.DragEvent) => ev.preventDefault();

  const pickPointForIndex = (ev: React.MouseEvent<HTMLDivElement>, idx: number) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = clamp01((ev.clientX - rect.left) / rect.width);
    const y = clamp01((ev.clientY - rect.top) / rect.height);
    setPoints((p) => ({ ...p, [idx]: { x, y } }));
  };

  const clearPointForIndex = (idx: number) => {
    setPoints((p) => {
      const next = { ...p };
      delete next[idx];
      return next;
    });
  };

  const labelOne = async (idToken: string, item: ParsedItem) => {
    try {
      const res = await fetch("/api/wardrobe/label-item", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_png_base64: item.image_png_base64 }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) return item;

      const category = data?.label?.category;
      return {
        ...item,
        type: category || item.type,
      };
    } catch {
      return item;
    }
  };

  const onParse = async (index?: number) => {
    if (!user) return;

    const indices = typeof index === "number" ? [index] : files.map((_, i) => i);
    if (indices.length === 0) return setAlertMsg("Không có ảnh để tách.");

    setParsing(true);
    onUploadingChange?.(true);

    const errors: Array<{ idx: number; status: number; msg: string; raw?: any }> = [];

    try {
      const idToken = await user.getIdToken();

      // VPS nhỏ: chạy tuần tự để tránh dồn RAM khi MobileSAM + OpenCV + PNG cùng lúc
      const PARSE_CONCURRENCY = 1;
      const resultsByFileIndex: Record<number, ParsedItem[]> = {};
      let cursor = 0;

      const parseOne = async (idx: number) => {
        const fileToParse = files[idx];
        const formData = new FormData();
        formData.append("file", fileToParse, fileToParse.name);

        const pt = points[idx];
        if (pt) {
          formData.append("x", String(pt.x));
          formData.append("y", String(pt.y));
        }

        const res = await fetch("/api/wardrobe/parse", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
          body: formData,
        });

        const raw = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }));
        if (!res.ok || !raw?.ok) {
          errors.push({
            idx,
            status: res.status,
            msg: raw?.message || "Parse failed",
            raw,
          });
          return;
        }

        const items = Array.isArray(raw?.items) ? raw.items : [];
        resultsByFileIndex[idx] = items.map((it: any) => ({
          type: it.type || "Khác",
          imageDataUrl:
            typeof it.imageDataUrl === "string"
              ? it.imageDataUrl
              : `data:image/png;base64,${it.image_png_base64}`,
          image_png_base64: it.image_png_base64,
          sourceFileIndex: idx,
        }));
      };

      const workers = Array.from({ length: Math.min(PARSE_CONCURRENCY, indices.length) }, async () => {
        while (true) {
          const i = cursor++;
          if (i >= indices.length) break;
          await parseOne(indices[i]);
        }
      });

      await Promise.all(workers);

      const allItems = indices.flatMap((idx) => resultsByFileIndex[idx] || []);
      setParsedItems(allItems);
      setSelected(
        Object.fromEntries(allItems.map((_, idx) => [idx, true])) as Record<number, boolean>
      );

      if (errors.length > 0) {
        console.error("PARSE ERRORS:", errors);
      }

      // Auto-label chạy tuần tự để giảm tải VPS
      void (async () => {
        const shouldLabel = (t?: string) => !t || t === "item" || t === "Khác";

        const concurrency = 1;
        let c = 0;

        const workers = Array.from({ length: concurrency }, async () => {
          while (true) {
            const i = c++;
            if (i >= allItems.length) break;
            if (!shouldLabel(allItems[i].type)) continue;

            const labeled = await labelOne(idToken, allItems[i]);

            setParsedItems((prev) => {
              if (i < 0 || i >= prev.length) return prev;
              const next = prev.slice();
              next[i] = labeled;
              return next;
            });
          }
        });

        await Promise.all(workers);
      })();
    } catch (e) {
      console.error(e);
      setAlertMsg("Tách đồ thất bại (lỗi mạng hoặc API).");
    } finally {
      setParsing(false);
      onUploadingChange?.(false);
    }
  };

  const updateItem = (idx: number, patch: Partial<ParsedItem>) => {
    setParsedItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const onUploadSelected = async () => {
    if (!user) return;
    if (parsedItems.length === 0) return setAlertMsg("Bạn cần tách đồ trước khi upload.");

    const picked = parsedItems
      .map((it, idx) => ({ it, idx }))
      .filter(({ idx }) => !!selected[idx])
      .map(({ it }) => ({
        type: it.type,
        image_png_base64: it.image_png_base64?.includes(",")
          ? it.image_png_base64.split(",")[1]
          : it.image_png_base64,
      }));

    if (picked.length === 0) return setAlertMsg("Bạn chưa chọn item nào để thêm vào tủ.");

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/wardrobe/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: picked }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlertMsg(data?.message || "Thêm vào tủ thất bại.");
        console.error("CONFIRM FAIL:", data);
        return;
      }

      setFiles([]);
      setParsedItems([]);
      setSelected({});
      setPoints({});
      onUploadSuccess?.();
    } catch (e) {
      console.error(e);
      setAlertMsg("Thêm vào tủ thất bại (lỗi mạng hoặc API).");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <div className="max-w-5xl space-y-4 relative">
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
          <div className="font-medium text-white/90">Ảnh sắp tách ({files.length})</div>
          <div className="text-xs text-white/50">
            Mỗi ảnh có clickpoint riêng. Bạn có thể chấm tất cả ảnh trước rồi bấm <b>Tách tất cả</b>.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((f, idx) => {
              const pt = points[idx];

              return (
                <div key={`${f.name}-${idx}`} className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-white/70">
                    <div className="truncate">{f.name}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(idx);
                      }}
                      disabled={parsing || uploading}
                      className="rounded-full px-2 py-1 bg-black/40 text-white"
                    >
                      ×
                    </button>
                  </div>

                  <div
                    className="relative border-t border-white/10 cursor-crosshair bg-white/5"
                    onClick={(e) => pickPointForIndex(e, idx)}
                    title="Click để chọn điểm thuộc món đồ bạn muốn tách"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrls[idx]}
                      alt={f.name}
                      className="w-full h-56 object-contain pointer-events-none"
                    />

                    {pt && (
                      <div
                        className="absolute w-3 h-3 rounded-full border border-white bg-indigo-500/80"
                        style={{
                          left: `${pt.x * 100}%`,
                          top: `${pt.y * 100}%`,
                          transform: "translate(-50%,-50%)",
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 p-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPointForIndex(idx);
                      }}
                      disabled={!pt || parsing || uploading}
                      className="px-2 py-1 rounded border border-white/10 hover:bg-white/10 text-xs text-white/80 disabled:opacity-50"
                    >
                      Xoá điểm
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void onParse(idx);
                      }}
                      disabled={parsing || uploading}
                      className="ml-auto px-2 py-1 rounded border border-white/10 hover:bg-white/10 text-xs text-white/80 disabled:opacity-50"
                    >
                      Tách ảnh này
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-white/50">
            * Nếu muốn tách chuẩn đúng món, hãy click đúng lên món đồ trong từng ảnh trước khi bấm Tách.
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => void onParse()}
          disabled={files.length === 0 || parsing || uploading}
          className="px-4 py-2 rounded-xl border font-semibold border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition disabled:opacity-50"
        >
          {parsing ? "Đang tách..." : "Tách tất cả"}
        </button>

        <button
          onClick={onUploadSelected}
          disabled={parsedItems.length === 0 || uploading || parsing || Object.values(selected).every((v) => !v)}
          className="ml-auto px-4 py-2 rounded-xl font-semibold border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 text-white hover:border-cyan-300/40 transition disabled:opacity-50 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
        >
          {uploading ? "Đang thêm vào tủ..." : "Thêm vào tủ đồ"}
        </button>
      </div>

      {parsedItems.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium text-white/90">Kết quả tách ({parsedItems.length})</div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {parsedItems.map((it, idx) => (
              <div key={idx} className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageDataUrl} alt={`parsed-${idx}`} className="w-full h-56 object-contain bg-white/5" />
                  <label className="absolute top-2 left-2 flex items-center gap-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
                    <input
                      type="checkbox"
                      checked={!!selected[idx]}
                      onChange={(e) => setSelected((s) => ({ ...s, [idx]: e.target.checked }))}
                    />
                    Chọn
                  </label>
                </div>

                <div className="p-3 space-y-2">
                  <div className="text-xs text-white/50">Ảnh nguồn #{it.sourceFileIndex + 1}</div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60 w-10">Loại</span>
                    <select
                      value={it.type}
                      onChange={(e) => updateItem(idx, { type: e.target.value })}
                      className="flex-1 rounded bg-black/30 border border-white/10 px-2 py-2 text-sm text-white"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </div>
  );
}