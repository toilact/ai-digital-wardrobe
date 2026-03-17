"use client";

import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "@/components/LogoutButton";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, type UserProfile } from "@/lib/profile";
import Link from "next/link";
import Header from "@/components/Header";

function emailPrefix(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

function initialsFrom(name?: string | null, email?: string | null) {
  const base = (name || "").trim() || emailPrefix(email) || "U";
  const parts = base.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b) || "U";
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;

      try {
        const p = await getUserProfile(user.uid);

        if (!p) {
          router.replace("/onboarding");
          return;
        }

        setProfile(p);
        setCheckingProfile(false);
      } catch (e) {
        console.error(e);
        router.replace("/onboarding");
        return;
      }
    };

    if (!loading && user) run();
  }, [loading, user, router]);

  if (loading || checkingProfile) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  const uname = emailPrefix(user.email);
  const initials = initialsFrom(user.displayName, user.email);

  return (
    <main>
      <Header />
      <div className="wrap">
        <div className="dashboard-container pt-5">
          <div className="hero-left text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
              Tủ đồ thông minh của bạn
            </h1>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {/* CARD 1: Upload vào tủ đồ */}
            <Link href="/wardrobe/upload" className="card group">
              <div className="media">
                <img src="./scan_clothes_image.png" alt="Upload vào tủ đồ" />
                <span className="badge" title="AI parse">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.2 5.6L20 10l-5.8 2.4L12 18l-2.2-5.6L4 10l5.8-2.4L12 2z" stroke="currentColor" strokeWidth="1.6" /></svg>
                  Tách đồ (AI)
                </span>
              </div>

              <div className="content bg-white/5 border border-white/10 backdrop-blur-md rounded-b-2xl">
                <h3 className="title font-bold text-white/90">Upload vào tủ đồ</h3>
                <p className="desc text-white/60">
                  Chụp/Chọn ảnh quần áo, AI tự tách từng item: áo, quần, váy, giày… xuất PNG nền trong suốt.
                </p>

                <div className="meta">
                  <span className="pill bg-white/10 text-white/80 border-white/10">PNG alpha</span>
                  <span className="pill bg-white/10 text-white/80 border-white/10">Mask clean</span>
                </div>

                <div className="actions mt-4">
                  <button className="btn rounded-xl px-4 py-2 font-semibold border border-white/10 bg-white/5 text-white/80 group-hover:bg-white/10 transition">
                    Upload →
                  </button>
                  <span className="hint">1 click • preview ngay</span>
                </div>
              </div>
            </Link>

            {/* CARD 2: Gợi ý outfit */}
            <Link href="/outfit-suggest" className="card group">
              <div className="media">
                <img src="./AI_suggestions.png" alt="Gợi ý outfit" />
                <span className="badge" title="AI suggestions">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 7h16v13H4V7z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  Gợi ý
                </span>
              </div>

              <div className="content bg-white/5 border border-white/10 backdrop-blur-md rounded-b-2xl">
                <h3 className="title font-bold text-white/90">Gợi ý outfit</h3>
                <p className="desc text-white/60">
                  Chatbot gợi ý theo địa điểm, thời tiết hoặc đi cùng ai. Tìm outfit hoàn hảo cho bất kỳ dịp nào.
                </p>

                <div className="meta">
                  <span className="pill bg-white/10 text-white/80 border-white/10">Batch save</span>
                  <span className="pill bg-white/10 text-white/80 border-white/10">AI Suggest</span>
                  <span className="pill bg-white/10 text-white/80 border-white/10">Real-time</span>
                </div>

                <div className="actions mt-4">
                  <button className="btn rounded-xl px-4 py-2 font-semibold border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 text-white hover:border-cyan-300/40 transition">
                    Nhân gợi ý →
                  </button>
                  <span className="hint">gọn • sạch • nhanh</span>
                </div>
              </div>
            </Link>

            {/* CARD 3: Xem tủ đồ */}
            <Link href="/wardrobe" className="card group">
              <div className="media">
                <img src="./wardrobe_image.png" alt="Xem tủ đồ" />
                <span className="badge" title="Wardrobe gallery">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 6h7v7H4V6zM13 6h7v7h-7V6zM4 15h7v3H4v-3zM13 15h7v3h-7v-3z" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  Xem tủ đồ
                </span>
              </div>

              <div className="content bg-white/5 border border-white/10 backdrop-blur-md rounded-b-2xl">
                <h3 className="title font-bold text-white/90">Xem tủ đồ</h3>
                <p className="desc text-white/60">
                  Danh sách đồ đã lưu hiển thị đẹp như lookbook: filter theo loại, kéo mượt, load nhanh.
                </p>

                <div className="meta">
                  <span className="pill bg-white/10 text-white/80 border-white/10">Filter</span>
                  <span className="pill bg-white/10 text-white/80 border-white/10">Lazy load</span>
                  <span className="pill bg-white/10 text-white/80 border-white/10">Fast UX</span>
                </div>

                <div className="actions mt-4">
                  <button className="btn rounded-xl px-4 py-2 font-semibold border border-white/10 bg-white/5 text-white/80 group-hover:bg-white/10 transition">
                    Mở tủ →
                  </button>
                  <span className="hint">lookbook vibe</span>
                </div>
              </div>
            </Link>
          </section>

          {/* ✅ Drawer profile */}
          <ProfileDrawer
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            user={{ email: user.email, displayName: user.displayName, photoURL: user.photoURL }}
            profile={profile}
          />
        </div>
      </div>
    </main>
  );
}
