"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { hasActiveVip } from "@/lib/profile";

function emailPrefix(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

/* ── Feature card data ─────────────────────── */
const features = [
  {
    href: "/wardrobe/upload",
    badge: "Tách đồ (AI)",
    badgeIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 opacity-95" aria-hidden="true">
        <path d="M12 2l2.2 5.6L20 10l-5.8 2.4L12 18l-2.2-5.6L4 10l5.8-2.4L12 2z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    image: "/scan_clothes_image.png",
    title: "Upload vào tủ đồ",
    desc: "Chụp/Chọn ảnh quần áo, AI tự tách từng item: áo, quần, váy, giày… xuất PNG nền trong suốt.",
    pills: ["PNG alpha", "Mask clean", "Crop gọn"],
    cta: "Upload",
    hint: "1 click • preview ngay",
    accent: "indigo",
    gradient: "from-indigo-500/40 to-cyan-500/20",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]",
  },
  {
    href: "/outfit-suggest",
    badge: "Gợi ý",
    badgeIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 opacity-95" aria-hidden="true">
        <path d="M4 7h16v13H4V7z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    image: "/AI_suggestions.png",
    title: "Gợi ý outfit",
    desc: "Chatbot gợi ý theo địa điểm, thời tiết hoặc đi cùng ai. Tìm outfit hoàn hảo cho bất kỳ dịp nào.",
    pills: ["Batch save", "AI Suggest", "Real-time"],
    cta: "Nhận gợi ý",
    hint: "gọn • sạch • nhanh",
    accent: "fuchsia",
    gradient: "from-fuchsia-500/40 to-pink-500/20",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.15)]",
    primary: true,
  },
  {
    href: "/wardrobe",
    badge: "Xem tủ đồ",
    badgeIcon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 opacity-95" aria-hidden="true">
        <path d="M4 6h7v7H4V6zM13 6h7v7h-7V6zM4 15h7v3H4v-3zM13 15h7v3h-7v-3z" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
    image: "/wardrobe_image.png",
    title: "Xem tủ đồ",
    desc: "Danh sách đồ đã lưu hiển thị đẹp như lookbook: filter theo loại, kéo mượt, load nhanh.",
    pills: ["Filter", "Lazy load", "Fast UX"],
    cta: "Mở tủ",
    hint: "lookbook vibe",
    accent: "emerald",
    gradient: "from-emerald-500/40 to-teal-500/20",
    borderGlow: "group-hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]",
  },
];



export default function Dashboard() {
  const { user, loading, profile, account } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/");
      } else if (!profile) {
        router.replace("/onboarding");
      }
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (loading || !user || !profile) {
      setMounted(false);
      return;
    }
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [loading, user, profile]);

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
  if (!user || !profile) return null;

  const displayName = account?.displayName || user.displayName || emailPrefix(user.email);
  const vipActive = hasActiveVip(account ?? profile ?? null);


  return (
    <main className="min-h-screen relative text-white overflow-hidden">
      {/* ── Background layers ──────────── */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#070812] via-[#0b1020] to-[#0a0f18]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(ellipse_1200px_650px_at_15%_-5%,rgba(99,102,241,0.32),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-55 bg-[radial-gradient(ellipse_900px_520px_at_85%_10%,rgba(236,72,153,0.22),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-45 bg-[radial-gradient(ellipse_1000px_600px_at_50%_110%,rgba(34,197,94,0.14),transparent_55%)]" />
      {/* Grid overlay */}
      <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />

      {/* Floating ambient orbs */}
      <div className="pointer-events-none absolute -left-40 top-24 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.12] blur-[80px] animate-[drift_10s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute -right-48 top-44 w-[450px] h-[450px] rounded-full bg-pink-500/[0.10] blur-[80px] animate-[drift_12s_ease-in-out_infinite_alternate-reverse]" />

      <div className="max-w-[1200px] mx-auto px-5 md:px-8 pt-6 pb-16">
        {/* ── Hero Section ─────────────── */}
        <section className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          {/* Welcome bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                {vipActive && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide
                    bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                    ♛ VIP
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                <span className="text-white/90">Xin chào, </span>
                <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
                  {displayName}
                </span>
              </h1>
              <p className="text-white/50 mt-2 text-base md:text-lg max-w-xl">
                Quản lý tủ đồ thông minh và nhận gợi ý outfit bằng AI
              </p>
            </div>
          </div>
        </section>

        {/* ── Section Title ────────────── */}
        <section className={`transition-all duration-700 delay-150 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-pink-500" />
              <h2 className="text-xl md:text-2xl font-bold text-white/90">Tủ đồ thông minh</h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>
        </section>

        {/* ── Feature Cards Grid ───────── */}
        <section className={`grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          {features.map((f, idx) => (
            <Link
              key={f.href}
              href={f.href}
              className={`group relative rounded-[22px] overflow-hidden
                border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm
                shadow-[0_20px_60px_rgba(0,0,0,0.4)]
                transition-all duration-700
                ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
                hover:border-white/[0.16] hover:-translate-y-2
                ${f.borderGlow}`}
              style={{ transitionDelay: `${360 + idx * 90}ms` }}
            >
              {/* Card top glow */}
              <div className={`absolute inset-0 -z-[1] opacity-0 group-hover:opacity-100 transition-opacity duration-500
                bg-gradient-to-b ${f.gradient} to-transparent`} />

              {/* Image area */}
              <div className="relative h-[200px] lg:h-[220px] overflow-hidden bg-[#080b14]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.image}
                  alt={f.title}
                  className="w-full h-full object-cover scale-[1.02]
                    group-hover:scale-110 transition-transform duration-500 ease-out
                    filter saturate-[1.05] contrast-[1.05] group-hover:saturate-[1.15] group-hover:contrast-[1.1]"
                />
                {/* Image gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/40 to-transparent pointer-events-none" />

                {/* Badge */}
                <span className="absolute left-3.5 top-3.5 z-10 inline-flex items-center gap-2 px-3 py-2 rounded-full
                  bg-black/40 border border-white/[0.14] backdrop-blur-md text-white/90 text-xs font-medium">
                  {f.badgeIcon}
                  {f.badge}
                </span>
              </div>

              {/* Content area */}
              <div className="relative p-5 pt-4 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-white/92 mb-2">{f.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed mb-4 flex-1">{f.desc}</p>

                {/* Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {f.pills.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.04] text-white/65 text-[11px] font-medium"
                    >
                      {p}
                    </span>
                  ))}
                </div>

                {/* CTA row */}
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                      ${f.primary
                        ? "border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 text-white group-hover:border-cyan-300/40 group-hover:shadow-[0_8px_24px_rgba(99,102,241,0.2)]"
                        : "border border-white/[0.10] bg-white/[0.04] text-white/80 group-hover:bg-white/[0.08] group-hover:border-white/[0.18]"
                      }`}
                  >
                    {f.cta}
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                  <span className="text-white/40 text-xs hidden sm:inline">{f.hint}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>


      </div>

      {/* Subtle scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 7px)",
          backgroundSize: "100% 8px",
        }}
      />
    </main>
  );
}
