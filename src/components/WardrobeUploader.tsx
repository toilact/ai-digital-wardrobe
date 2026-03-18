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

const TYPE_EMOJI: Record<string, string> = {
  "Áo": "👕",
  "Quần": "👖",
  "Váy": "👗",
  "Đầm": "👗",
  "Giày": "👟",
  "Khác": "🧣",
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/* ── Parsing overlay ───────────────────────── */
function ParsingOverlay({ active, label }: { active: boolean; label: string }) {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-5 p-8 rounded-3xl
        bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl
        shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        {/* Animated ring */}
        <div className="relative w-20 h-20">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90 animate-[spin_1.6s_linear_infinite]">
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none"
              stroke="url(#ring-grad)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="140" strokeDashoffset="80"
            />
            <defs>
              <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="50%" stopColor="#e879f9" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
        </div>
        <div className="text-white/90 font-semibold text-lg">{label}</div>
        <div className="text-white/45 text-sm">AI đang phân tích hình ảnh của bạn…</div>
      </div>
    </div>
  );
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
  const [dragOver, setDragOver] = useState(false);

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [alertMsg, setAlertMsg] = useState("");

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
    setDragOver(false);
    const list = ev.dataTransfer.files
      ? Array.from(ev.dataTransfer.files).filter((f) => f.type.startsWith("image/"))
      : [];
    if (list.length) onAddFiles(list);
  };

  const handleDragOver = (ev: React.DragEvent) => {
    ev.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

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
      return { ...item, type: category || item.type };
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
          errors.push({ idx, status: res.status, msg: raw?.message || "Parse failed", raw });
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
      setSelected(Object.fromEntries(allItems.map((_, idx) => [idx, true])) as Record<number, boolean>);

      if (errors.length > 0) console.error("PARSE ERRORS:", errors);

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

  if (loading) return <div className="p-6 text-white/50">Đang tải...</div>;
  if (!user) return null;

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-8 relative">
      <ParsingOverlay active={parsing} label="Đang tách đồ..." />
      <ParsingOverlay active={uploading} label="Đang thêm vào tủ đồ..." />

      {/* ── Drop Zone ────────────────────────── */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-300
          ${dragOver
            ? "border-2 border-solid border-indigo-400/60 bg-indigo-500/[0.07] shadow-[0_0_40px_rgba(99,102,241,0.15)]"
            : "border-2 border-dashed border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.20]"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onInputChange}
          className="hidden"
        />

        {/* Background glow */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_600px_300px_at_50%_50%,rgba(99,102,241,0.12),transparent_70%)] pointer-events-none" />

        <div className="relative flex flex-col items-center gap-5 py-14 px-6 text-center">
          {/* Cloud upload icon */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 border border-white/[0.08]
            ${dragOver ? "scale-110 shadow-[0_0_30px_rgba(99,102,241,0.25)]" : ""}`}>
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-indigo-300" aria-hidden="true">
              <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div>
            <p className="text-lg font-semibold text-white/85">
              {dragOver ? "Thả ảnh vào đây!" : "Kéo thả ảnh vào đây"}
            </p>
            <p className="mt-1.5 text-sm text-white/45">
              hoặc <span className="text-indigo-300 font-medium">nhấn để chọn file</span> từ thiết bị
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {["JPG", "PNG", "WEBP", "HEIC"].map((fmt) => (
              <span key={fmt} className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-white/[0.08] bg-white/[0.03] text-white/50">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selected images grid ─────────────── */}
      {files.length > 0 && (
        <div className="space-y-4">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-fuchsia-500" />
              <div>
                <h3 className="text-base font-bold text-white/90">Ảnh đã chọn</h3>
                <p className="text-xs text-white/40 mt-0.5">Click vào ảnh để chọn điểm phân tách chính xác hơn</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm font-medium">
              {files.length} ảnh
            </span>
          </div>

          {/* Image cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((f, idx) => {
              const pt = points[idx];
              return (
                <div key={`${f.name}-${idx}`}
                  className="group rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all hover:border-white/[0.14]">

                  {/* Filename row */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06]">
                    <div className="truncate text-xs text-white/55 font-medium">📷 {f.name}</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveFile(idx); }}
                      disabled={parsing || uploading}
                      className="w-6 h-6 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 text-white/50 transition-all text-sm disabled:opacity-40"
                    >
                      ×
                    </button>
                  </div>

                  {/* Image preview with click point */}
                  <div
                    className="relative cursor-crosshair"
                    onClick={(e) => pickPointForIndex(e, idx)}
                    title="Click để chọn điểm thuộc món đồ bạn muốn tách"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrls[idx]}
                      alt={f.name}
                      className="w-full h-52 object-contain bg-[#060910] pointer-events-none"
                    />
                    {/* Point indicator */}
                    {pt && (
                      <div
                        className="absolute pointer-events-none"
                        style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%`, transform: "translate(-50%,-50%)" }}
                      >
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border-2 border-white shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 p-3 border-t border-white/[0.06]">
                    <button
                      onClick={(e) => { e.stopPropagation(); clearPointForIndex(idx); }}
                      disabled={!pt || parsing || uploading}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.07] text-xs text-white/60 disabled:opacity-30 transition"
                    >
                      Xoá điểm
                    </button>

                    {pt && (
                      <span className="text-[10px] text-indigo-300/70 font-medium">
                        ✓ {Math.round(pt.x * 100)}%, {Math.round(pt.y * 100)}%
                      </span>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); void onParse(idx); }}
                      disabled={parsing || uploading}
                      className="ml-auto px-3 py-1.5 rounded-lg border border-indigo-400/25 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs text-indigo-300 font-medium transition disabled:opacity-40"
                    >
                      Tách ảnh này
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tip */}
          <p className="text-xs text-white/35 pl-1">
            💡 Tip: Click đúng lên món đồ muốn tách trong ảnh để AI phân tách chính xác hơn
          </p>
        </div>
      )}

      {/* ── Parsed results ───────────────────── */}
      {parsedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-400" />
              <div>
                <h3 className="text-base font-bold text-white/90">Kết quả tách</h3>
                <p className="text-xs text-white/40 mt-0.5">Chọn item muốn lưu và điều chỉnh loại nếu cần</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm font-medium">
                {selectedCount}/{parsedItems.length} đã chọn
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {parsedItems.map((it, idx) => {
              const isSelected = !!selected[idx];
              return (
                <div key={idx}
                  className={`rounded-2xl overflow-hidden border backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-200
                    ${isSelected
                      ? "border-emerald-400/30 bg-emerald-500/[0.04] shadow-[0_0_20px_rgba(52,211,153,0.07)]"
                      : "border-white/[0.08] bg-white/[0.02] opacity-60"
                    }`}
                >
                  {/* Image */}
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.imageDataUrl}
                      alt={`parsed-${idx}`}
                      className="w-full h-52 object-contain bg-[#060910]"
                    />
                    {/* Checkbox overlay */}
                    <button
                      onClick={() => setSelected((s) => ({ ...s, [idx]: !s[idx] }))}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200
                        ${isSelected
                          ? "bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                          : "bg-black/40 border-white/20 hover:border-white/40"
                        }`}
                    >
                      {isSelected ? (
                        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden="true">
                          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-white/30" />
                      )}
                    </button>

                    {/* Source tag */}
                    <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] text-white/55 border border-white/10">
                      Ảnh #{it.sourceFileIndex + 1}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{TYPE_EMOJI[it.type] ?? "🧣"}</span>
                      <select
                        value={it.type}
                        onChange={(e) => updateItem(idx, { type: e.target.value })}
                        className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2.5 py-2 text-sm text-white/85 outline-none focus:border-indigo-400/40 transition"
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t} className="bg-[#0d1020] text-white">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action bar ───────────────────────── */}
      {(files.length > 0 || parsedItems.length > 0) && (
        <div className="sticky bottom-4 z-10 transition-all duration-500">
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/25 via-fuchsia-500/20 to-emerald-500/20">
            <div className="rounded-2xl bg-[#0b1022]/90 backdrop-blur-xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-white/50">
                {parsedItems.length > 0
                  ? <><span className="text-white/80 font-semibold">{selectedCount}</span> item được chọn để lưu</>
                  : <><span className="text-white/80 font-semibold">{files.length}</span> ảnh sẵn sàng để tách</>
                }
              </div>

              <div className="flex items-center gap-3">
                {/* Parse all button */}
                <button
                  onClick={() => void onParse()}
                  disabled={files.length === 0 || parsing || uploading}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/[0.10] bg-white/[0.05] text-white/80
                    hover:bg-white/[0.09] hover:border-white/[0.18] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {parsing ? "Đang tách…" : "✦ Tách tất cả"}
                </button>

                {/* Upload to wardrobe button */}
                <button
                  onClick={onUploadSelected}
                  disabled={parsedItems.length === 0 || uploading || parsing || Object.values(selected).every((v) => !v)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
                    border border-cyan-300/30 bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/30 to-cyan-400/25 text-white
                    hover:border-cyan-300/50 hover:shadow-[0_8px_24px_rgba(99,102,241,0.2)]
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {uploading ? "Đang lưu…" : "Lưu vào tủ đồ →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </div>
  );
}
