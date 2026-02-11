"use client";

import { useAuth } from "@/lib/AuthContext";
import LogoutButton from "@/components/LogoutButton";
import ProfileDrawer from "@/components/ProfileDrawer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, type UserProfile } from "@/lib/profile";
import Link from "next/link";

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

  // ✅ drawer profile
  const [profileOpen, setProfileOpen] = useState(false);

  // 1) Chưa login -> về trang /
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // 2) Đã login -> kiểm tra profile
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
        // nếu lỗi Firestore thì vẫn cho qua để demo
        setCheckingProfile(false);
      }
    };

    if (!loading && user) run();
  }, [loading, user, router]);

  if (loading || checkingProfile) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  const uname = emailPrefix(user.email);
  const initials = initialsFrom(user.displayName, user.email);

  return (
    <div className="dashboard-container">
      <header className="hero">
        <div className="hero-left">
          <h1>
            <span className="grad">AI Digital Wardrobe</span>
            <br />
            Tủ đồ thông minh của bạn
          </h1>
        </div>

        <div className="hero-right">
          {/* ✅ nút tròn profile */}
          <button
            onClick={() => setProfileOpen(true)}
            className="w-11 h-11 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 overflow-hidden flex items-center justify-center"
            aria-label="Open profile"
            title="Xem profile"
          >
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-white/90">{initials}</span>
            )}
          </button>

          <div className="user-info">
            <div className="user-name">Xin chào {user.displayName || uname}</div>
            <div className="user-email">@{uname}</div>
          </div>

          <LogoutButton />
        </div>
      </header>

      <section className="grid">
        {/* CARD 1: Upload vào tủ đồ */}
        <Link href="/wardrobe/upload" className="card">
          <div className="media">
            <img
              src="https://images.unsplash.com/photo-1520975958225-20f61f86a1c0?auto=format&fit=crop&w=1400&q=80"
              alt="Upload vào tủ đồ"
            />
            <span className="badge" title="AI parse">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2l2.2 5.6L20 10l-5.8 2.4L12 18l-2.2-5.6L4 10l5.8-2.4L12 2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Tách đồ (AI)
            </span>
          </div>

          <div className="content">
            <h3 className="title">Upload vào tủ đồ</h3>
            <p className="desc">
              Chụp/Chọn ảnh quần áo, AI tự tách từng item: áo, quần, váy, giày…
              xuất PNG nền trong suốt để dùng lại.
            </p>

            <div className="meta">
              <span className="pill">PNG alpha</span>
              <span className="pill">Mask clean</span>
              <span className="pill">Crop gọn</span>
            </div>

            <div className="actions">
              <button className="btn">
                Upload
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <span className="hint">1 click • preview ngay</span>
            </div>
          </div>
        </Link>

        {/* CARD 2: Gợi ý outfit */}
        <Link href="/outfit-suggest" className="card">
          <div className="media">
            <img
              src="https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1400&q=80"
              alt="Gợi ý outfit"
            />
            <span className="badge" title="AI suggestions">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16v13H4V7z" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Gợi ý
            </span>
          </div>

          <div className="content">
            <h3 className="title">Gợi ý outfit</h3>
            <p className="desc">
              Chatbot gợi ý theo thời tiết, địa điểm, hoặc đi cùng ai. Tìm outfit
              hoàn hảo cho bất kỳ dịp nào.
            </p>

            <div className="meta">
              <span className="pill">Batch save</span>
              <span className="pill">AI Suggest</span>
              <span className="pill">Real-time</span>
            </div>

            <div className="actions">
              <button className="btn primary">
                Nhận gợi ý
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
              <span className="hint">gọn • sạch • nhanh</span>
            </div>
          </div>
        </Link>

        {/* CARD 3: Xem tủ đồ */}
        <Link href="/wardrobe" className="card">
          <div className="media">
            <img
              src="https://images.unsplash.com/photo-1520975682031-a0b3b7a4c86c?auto=format&fit=crop&w=1400&q=80"
              alt="Xem tủ đồ"
            />
            <span className="badge" title="Wardrobe gallery">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6h7v7H4V6zM13 6h7v7h-7V6zM4 15h7v3H4v-3zM13 15h7v3h-7v-3z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
              Xem tủ đồ
            </span>
          </div>

          <div className="content">
            <h3 className="title">Xem tủ đồ</h3>
            <p className="desc">
              Danh sách đồ đã lưu hiển thị đẹp như lookbook: filter theo loại/màu,
              kéo mượt, load nhanh.
            </p>

            <div className="meta">
              <span className="pill">Filter</span>
              <span className="pill">Lazy load</span>
              <span className="pill">Fast UX</span>
            </div>

            <div className="actions">
              <button className="btn">
                Mở tủ
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 17l10-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path
                    d="M9 7h8v8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
  );
}
