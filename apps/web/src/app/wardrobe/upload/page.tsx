"use client";
import WardrobeUploader from "@/components/WardrobeUploader";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const FEATURE_CHIPS = ["Batch Upload", "Smart Segmentation", "Transparent PNG", "One-tap Save"];

const QUICK_NOTES = [
  { title: "Ảnh rõ chủ thể", desc: "Đặt món đồ chiếm khung hình lớn để AI nhận diện tốt hơn." },
  { title: "Click điểm tách", desc: "Chọn đúng vị trí món đồ khi ảnh có nhiều lớp chồng nhau." },
  { title: "Lưu theo batch", desc: "Có thể chọn nhiều item rồi lưu cùng lúc vào tủ đồ." },
];

export default function WardrobeUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (showSuccess) {
      t = setTimeout(() => {
        setShowSuccess(false);
        setIsUploading(false);
        router.push("/wardrobe");
      }, 1400);
    }
    return () => { if (t) clearTimeout(t); };
  }, [showSuccess, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
          <span className="text-white/50 text-sm">Đang tải...</span>
        </div>
      </div>
    );
  }
  if (!user) return null;
  const mounted = !loading && !!user;

  return (
    <main className="min-h-screen relative text-white overflow-hidden [font-family:'Plus_Jakarta_Sans','Poppins',ui-sans-serif,system-ui]">
      {/* ── Background ───────────────────────── */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_0%_-10%,#1d2a64_0%,transparent_40%),radial-gradient(circle_at_100%_0%,#4f1d4d_0%,transparent_36%),radial-gradient(circle_at_50%_120%,#12453a_0%,transparent_45%),linear-gradient(135deg,#05070f_0%,#0b1328_55%,#060a16_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute inset-0 -z-10 opacity-[0.13] bg-[radial-gradient(ellipse_850px_320px_at_45%_0%,rgba(56,189,248,0.35),transparent_70%)]" />
      <div className="pointer-events-none absolute -left-32 top-28 w-[430px] h-[430px] rounded-full bg-cyan-500/[0.11] blur-[78px] animate-[drift_14s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute right-[-180px] top-40 w-[420px] h-[420px] rounded-full bg-rose-500/[0.12] blur-[84px] animate-[drift_16s_ease-in-out_infinite_reverse]" />

      <div className="max-w-[1180px] mx-auto px-4 md:px-7 pt-6 pb-20">

        {/* ── Header nav ───────────────────────── */}
        <header className={`mb-7 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push("/dashboard")}
              disabled={isUploading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-black/25 backdrop-blur-md text-white/75 hover:bg-black/40 hover:text-white transition text-sm ${isUploading ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => router.push("/wardrobe")}
              disabled={isUploading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border border-cyan-300/30 bg-gradient-to-r from-cyan-500/35 via-sky-500/20 to-fuchsia-500/25 text-white hover:border-cyan-300/55 transition shadow-[0_10px_28px_rgba(6,182,212,0.15)] ${isUploading ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              Xem tủ đồ
              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Main upload area ─────────────────── */}
        <section className={`transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="rounded-[30px] p-[1px] bg-gradient-to-r from-cyan-400/35 via-sky-300/25 to-emerald-300/35">
            <div className="rounded-[30px] bg-[#081326]/90 border border-white/[0.06] backdrop-blur-2xl p-4 md:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[11px] tracking-[0.18em] text-cyan-200/85 mb-3">
                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                    WARDROBE SCAN STUDIO
                  </div>
                  <h1 className="text-[clamp(1.6rem,3.6vw,2.6rem)] font-black leading-[1.02] tracking-[-0.02em]  text-white">
                    Upload vào tủ đồ
                  </h1>
                  <p className="mt-2 text-sm md:text-base text-white/60">
                    Kéo thả ảnh, AI tự tách và lưu item vào tủ đồ của bạn trong cùng một khu vực xử lý.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {FEATURE_CHIPS.map((chip) => (
                      <span key={chip} className="rounded-full border border-white/12 bg-black/25 px-3 py-1.5 text-xs font-medium text-white/75">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-6 lg:items-end lg:text-right lg:self-start lg:mt-2">
                  <p className="text-[11px] tracking-[0.2em] text-cyan-200/65">UPLOAD CONSOLE</p>
                  <h2 className="text-lg md:text-xl font-bold text-white/90 leading-tight">Khu vực xử lý ảnh AI</h2>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200/85">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    Ready to process
                  </span>
                </div>
              </div>

              <WardrobeUploader
                onUploadingChange={setIsUploading}
                onUploadSuccess={() => setShowSuccess(true)}
              />

              <div className="mt-2 pt-3 border-t border-white/[0.08] grid grid-cols-1 md:grid-cols-3 gap-3">
                {QUICK_NOTES.map((note) => (
                  <div key={note.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-4">
                    <div className="text-sm font-semibold text-white/85">{note.title}</div>
                    <p className="mt-1 text-xs text-white/55 leading-relaxed">{note.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Success toast ────────────────────── */}
        {showSuccess && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
            px-6 py-4 rounded-2xl bg-emerald-500/12 border border-emerald-300/35 backdrop-blur-xl
            shadow-[0_18px_60px_rgba(0,0,0,0.45)] animate-[fadeUp_0.42s_ease-out]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 text-sm">✓</span>
            <span className="text-sm font-semibold text-white/90">Đã lưu vào tủ đồ thành công!</span>
          </div>
        )}
      </div>

      {/* Scanline */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03] mix-blend-overlay"
        style={{ backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 6px)", backgroundSize: "100% 7px" }}
      />
    </main>
  );
}
