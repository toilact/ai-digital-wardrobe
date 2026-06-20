"use client";

import { useAuth } from "@/lib/AuthContext";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "./AlertModal";
import { SLOTS, categoryToSlot, type Slot } from "@/lib/wardrobe/itemSchema";
import type { ParsedGarment } from "@/lib/wardrobe/aiClient";
import {
  garmentsToReviewItems,
  reviewItemsToConfirmPayload,
  type ReviewItem,
} from "@/lib/wardrobe/uploadOrchestrator";

type ParsedItem = {
  type: string;
  imageDataUrl: string;
  image_png_base64: string;
  sourceFileIndex: number;
};

type Mode = "person" | "flat";

const TYPE_OPTIONS = ["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"] as const;

const TYPE_EMOJI: Record<string, string> = {
  "Áo": "👕",
  "Quần": "👖",
  "Váy": "👗",
  "Đầm": "👗",
  "Giày": "👟",
  "Khác": "🧣",
};

const SLOT_LABEL: Record<Slot, string> = {
  top: "Áo trên",
  bottom: "Quần/Chân váy",
  dress: "Đầm/Váy liền",
  outerwear: "Áo khoác",
  shoes: "Giày",
  bag: "Túi",
  accessory: "Phụ kiện",
};

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function stripDataUrl(s: string): string {
  return s?.includes(",") ? s.split(",")[1] : s;
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

  const [mode, setMode] = useState<Mode>("person");

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  // ── Flat-lay (single) mode state ─────────────
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [points, setPoints] = useState<Record<number, { x: number; y: number }>>({});

  // ── Person mode state ────────────────────────
  const [personFile, setPersonFile] = useState<File | null>(null);
  const personInputRef = useRef<HTMLInputElement | null>(null);
  const [personDragOver, setPersonDragOver] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);

  const previewUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  const personPreviewUrl = useMemo(
    () => (personFile ? URL.createObjectURL(personFile) : null),
    [personFile],
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  useEffect(() => {
    return () => {
      if (personPreviewUrl) URL.revokeObjectURL(personPreviewUrl);
    };
  }, [personPreviewUrl]);

  /* ──────────────────────────────────────────────
     FLAT-LAY MODE
     ────────────────────────────────────────────── */
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
        const lblWorkers = Array.from({ length: concurrency }, async () => {
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
        await Promise.all(lblWorkers);
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

    // Build STRUCTURED WardrobeItemInput payloads (Task 8 contract).
    const picked = parsedItems
      .map((it, idx) => ({ it, idx }))
      .filter(({ idx }) => !!selected[idx])
      .map(({ it }) => {
        const category = (TYPE_OPTIONS as readonly string[]).includes(it.type)
          ? it.type
          : "Khác";
        return {
          category,
          slot: categoryToSlot(category),
          subType: "",
          image_png_base64: stripDataUrl(it.image_png_base64),
          colors: null,
          formality: 0.5,
          styleTags: [],
          warmth: 0.5,
          embedding: [],
          embeddingModel: "clip-vit-b32",
          sourceImageId: null,
        };
      });

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

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setAlertMsg(typeof data?.message === "string" && data.message.length < 200 ? data.message : "Thêm vào tủ thất bại.");
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

  /* ──────────────────────────────────────────────
     PERSON MODE
     ────────────────────────────────────────────── */
  const onSetPersonFile = (f: File | null) => {
    setPersonFile(f);
    setReviewItems([]);
  };

  const onPersonInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    const img = list.find((f) => f.type.startsWith("image/"));
    if (img) onSetPersonFile(img);
    if (personInputRef.current) personInputRef.current.value = "";
  };

  const handlePersonDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    setPersonDragOver(false);
    const img = ev.dataTransfer.files
      ? Array.from(ev.dataTransfer.files).find((f) => f.type.startsWith("image/"))
      : null;
    if (img) onSetPersonFile(img);
  };

  const onParsePerson = async () => {
    if (!user || !personFile) return;
    setParsing(true);
    onUploadingChange?.(true);
    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", personFile, personFile.name);
      const res = await fetch("/api/wardrobe/parse-person", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const raw = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }));
      if (!res.ok || !raw?.ok) {
        setAlertMsg(
          typeof raw?.message === "string" && raw.message.length < 200
            ? raw.message
            : "Tách đồ từ ảnh người mặc thất bại.",
        );
        console.error("PARSE-PERSON FAIL:", raw);
        return;
      }
      const garments: ParsedGarment[] = Array.isArray(raw?.items) ? raw.items : [];
      if (garments.length === 0) {
        setAlertMsg("Không phát hiện được món đồ nào trong ảnh.");
        return;
      }
      const items = garmentsToReviewItems(garments, raw?.sourceImageId ?? null);
      setReviewItems(items);
    } catch (e) {
      console.error(e);
      setAlertMsg("Tách đồ thất bại (lỗi mạng hoặc API).");
    } finally {
      setParsing(false);
      onUploadingChange?.(false);
    }
  };

  const updateReviewItem = (id: string, patch: Partial<ReviewItem>) => {
    setReviewItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  // Fill formality/styleTags/warmth from label-item for KEPT items (bounded concurrency).
  const fillSemanticTags = async (idToken: string, items: ReviewItem[]): Promise<ReviewItem[]> => {
    const result = items.slice();
    const indices = result.map((_, i) => i).filter((i) => result[i].keep);
    const CONCURRENCY = 3;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, indices.length) }, async () => {
      while (true) {
        const k = cursor++;
        if (k >= indices.length) break;
        const i = indices[k];
        try {
          const res = await fetch("/api/wardrobe/label-item", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image_png_base64: stripDataUrl(result[i].image_png_base64) }),
          });
          if (!res.ok) continue;
          const data = await res.json().catch(() => ({}));
          const lbl = data?.label;
          if (!lbl) continue;
          result[i] = {
            ...result[i],
            formality: typeof lbl.formality === "number" ? lbl.formality : result[i].formality,
            styleTags: Array.isArray(lbl.styleTags) ? lbl.styleTags : result[i].styleTags,
            warmth: typeof lbl.warmth === "number" ? lbl.warmth : result[i].warmth,
          };
        } catch {
          // Tolerate failures — keep defaults.
        }
      }
    });
    await Promise.all(workers);
    return result;
  };

  const onSavePersonItems = async () => {
    if (!user) return;
    const kept = reviewItems.filter((it) => it.keep);
    if (kept.length === 0) return setAlertMsg("Bạn chưa giữ lại món đồ nào để lưu.");

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const idToken = await user.getIdToken();
      // Enrich semantic tags before confirm so saved items aren't all 0.5 defaults.
      const enriched = await fillSemanticTags(idToken, reviewItems);
      const payload = reviewItemsToConfirmPayload(enriched).map((it) => ({
        ...it,
        image_png_base64: stripDataUrl(it.image_png_base64),
      }));

      const res = await fetch("/api/wardrobe/confirm", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: payload }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      if (!res.ok) {
        setAlertMsg(typeof data?.message === "string" && data.message.length < 200 ? data.message : "Thêm vào tủ thất bại.");
        console.error("CONFIRM FAIL:", data);
        return;
      }

      onSetPersonFile(null);
      setReviewItems([]);
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
  const keptCount = reviewItems.filter((it) => it.keep).length;

  return (
    <div className="space-y-8 relative">
      <ParsingOverlay active={parsing} label="Đang tách đồ..." />
      <ParsingOverlay active={uploading} label="Đang thêm vào tủ đồ..." />

      {/* ── Mode toggle ───────────────────────── */}
      <div className="flex items-center gap-2 p-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] w-fit">
        {([
          { k: "person", label: "Ảnh người mặc", emoji: "🧍" },
          { k: "flat", label: "Ảnh lẻ", emoji: "👕" },
        ] as const).map(({ k, label, emoji }) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            disabled={parsing || uploading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40
              ${mode === k
                ? "bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/25 to-cyan-400/20 text-white border border-cyan-300/30 shadow-[0_4px_18px_rgba(99,102,241,0.18)]"
                : "text-white/55 hover:text-white/80 hover:bg-white/[0.04] border border-transparent"
              }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ PERSON MODE ══════════════════ */}
      {mode === "person" && (
        <div className="space-y-8">
          {/* Drop zone — single person photo */}
          <div
            onDrop={handlePersonDrop}
            onDragOver={(ev) => { ev.preventDefault(); setPersonDragOver(true); }}
            onDragLeave={() => setPersonDragOver(false)}
            onClick={() => personInputRef.current?.click()}
            className={`relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-300
              ${personDragOver
                ? "border-2 border-solid border-indigo-400/60 bg-indigo-500/[0.07] shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                : "border-2 border-dashed border-white/[0.12] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.20]"
              }`}
          >
            <input
              ref={personInputRef}
              type="file"
              accept="image/*"
              onChange={onPersonInputChange}
              className="hidden"
            />
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_600px_300px_at_50%_50%,rgba(99,102,241,0.12),transparent_70%)] pointer-events-none" />
            <div className="relative flex flex-col items-center gap-5 py-14 px-6 text-center">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 border border-white/[0.08]
                ${personDragOver ? "scale-110 shadow-[0_0_30px_rgba(99,102,241,0.25)]" : ""}`}>
                <span className="text-4xl">🧍</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-white/85">
                  {personDragOver ? "Thả ảnh vào đây!" : "Tải lên một ảnh người mặc đồ"}
                </p>
                <p className="mt-1.5 text-sm text-white/45">
                  AI sẽ tách từng món đồ trên người ra tự động
                </p>
              </div>
            </div>
          </div>

          {/* Person preview */}
          {personFile && personPreviewUrl && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-fuchsia-500" />
                  <div>
                    <h3 className="text-base font-bold text-white/90">Ảnh đã chọn</h3>
                    <p className="text-xs text-white/40 mt-0.5">Nhấn “Tách đồ” để AI phân tách các món</p>
                  </div>
                </div>
                <button
                  onClick={() => onSetPersonFile(null)}
                  disabled={parsing || uploading}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.07] text-xs text-white/60 disabled:opacity-30 transition"
                >
                  Xoá ảnh
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={personPreviewUrl}
                  alt={personFile.name}
                  className="w-full h-72 object-contain bg-[#060910]"
                />
              </div>
            </div>
          )}

          {/* Review grid */}
          {reviewItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-400" />
                  <div>
                    <h3 className="text-base font-bold text-white/90">Kết quả tách</h3>
                    <p className="text-xs text-white/40 mt-0.5">Giữ/bỏ từng món, chỉnh loại và vị trí nếu cần</p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm font-medium">
                  {keptCount}/{reviewItems.length} giữ lại
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {reviewItems.map((it) => (
                  <div key={it.id}
                    className={`rounded-2xl overflow-hidden border backdrop-blur-sm shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-200
                      ${it.keep
                        ? "border-emerald-400/30 bg-emerald-500/[0.04] shadow-[0_0_20px_rgba(52,211,153,0.07)]"
                        : "border-white/[0.08] bg-white/[0.02] opacity-60"
                      }`}
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${stripDataUrl(it.image_png_base64)}`}
                        alt={`garment-${it.id}`}
                        className="w-full h-52 object-contain bg-[#060910]"
                      />
                      <button
                        onClick={() => updateReviewItem(it.id, { keep: !it.keep })}
                        className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200
                          ${it.keep
                            ? "bg-emerald-500 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                            : "bg-black/40 border-white/20 hover:border-white/40"
                          }`}
                        title={it.keep ? "Bỏ món này" : "Giữ món này"}
                      >
                        {it.keep ? (
                          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden="true">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/30" />
                        )}
                      </button>
                      {it.colors && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[10px] text-white/70 border border-white/10">
                          <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: it.colors.hex }} />
                          {it.colors.nameVi}
                        </div>
                      )}
                    </div>

                    <div className="p-3 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{TYPE_EMOJI[it.category] ?? "🧣"}</span>
                        <select
                          value={it.category}
                          onChange={(e) => {
                            const category = e.target.value as ReviewItem["category"];
                            updateReviewItem(it.id, { category, slot: categoryToSlot(category) });
                          }}
                          className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2.5 py-2 text-sm text-white/85 outline-none focus:border-indigo-400/40 transition"
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t} className="bg-[#0d1020] text-white">{t}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-white/40 w-10">Vị trí</span>
                        <select
                          value={it.slot}
                          onChange={(e) => updateReviewItem(it.id, { slot: e.target.value as Slot })}
                          className="flex-1 rounded-lg bg-white/[0.05] border border-white/[0.08] px-2.5 py-2 text-sm text-white/85 outline-none focus:border-indigo-400/40 transition"
                        >
                          {SLOTS.map((s) => (
                            <option key={s} value={s} className="bg-[#0d1020] text-white">{SLOT_LABEL[s]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Person action bar */}
          {personFile && (
            <div className="sticky bottom-4 z-10 transition-all duration-500">
              <div className="rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/25 via-fuchsia-500/20 to-emerald-500/20">
                <div className="rounded-2xl bg-[#0b1022]/90 backdrop-blur-xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-white/50">
                    {reviewItems.length > 0
                      ? <><span className="text-white/80 font-semibold">{keptCount}</span> món được giữ để lưu</>
                      : <>Ảnh sẵn sàng để tách đồ</>
                    }
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void onParsePerson()}
                      disabled={parsing || uploading}
                      className="px-5 py-2.5 rounded-xl font-semibold text-sm border border-white/[0.10] bg-white/[0.05] text-white/80
                        hover:bg-white/[0.09] hover:border-white/[0.18] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {parsing ? "Đang tách…" : "✦ Tách đồ"}
                    </button>
                    <button
                      onClick={onSavePersonItems}
                      disabled={reviewItems.length === 0 || keptCount === 0 || uploading || parsing}
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
        </div>
      )}

      {/* ══════════════════ FLAT-LAY MODE ══════════════════ */}
      {mode === "flat" && (
        <div className="space-y-8">
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
        </div>
      )}

      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </div>
  );
}
