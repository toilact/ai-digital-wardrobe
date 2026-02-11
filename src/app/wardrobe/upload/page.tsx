"use client";

import WardrobeUploader from "@/components/WardrobeUploader";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import LogoutButton from "@/components/LogoutButton";

export default function WardrobeUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  useEffect(() => {
    let t: NodeJS.Timeout | null = null;
    if (showSuccess) {
      t = setTimeout(() => {
        setShowSuccess(false);
        setIsUploading(false);
        router.push("/wardrobe");
      }, 1000);
    }
    return () => { if (t) clearTimeout(t); };
  }, [showSuccess, router]);

  return (
    <div className="dashboard-container">
      <div className="wrap">
        <header className="hero">
          <div className="hero-left">
            <h1>
              <span className="grad">AI Digital Wardrobe</span>
              <br />
              Upload vào tủ đồ
            </h1>
          </div>

          <div className="hero-right">
            {/* <div className="user-info">
              <div className="user-name">Xin chào {user.displayName || (user.email || '').split('@')[0]}</div>
              <div className="user-email">@{(user.email || '').split('@')[0]}</div>
            </div> */}

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/dashboard")}
                disabled={isUploading}
                className={`px-3 py-2 rounded border bg-white/5 text-white hover:bg-white/10 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ← Dashboard
              </button>

              <button
                onClick={() => router.push("/wardrobe")}
                disabled={isUploading}
                className={`px-3 py-2 rounded border bg-white/5 text-white hover:bg-white/10 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Xem tủ đồ →
              </button>

              {/* <LogoutButton /> */}
            </div>
          </div>
        </header>

        <section style={{ marginTop: 18 }}>
          <div className="card">
            <div className="content">
              <div className="mb-4">
                <h3 className="title">Upload và tách đồ</h3>
                <p className="desc">Chọn ảnh, AI sẽ tự tách từng item và bạn có thể lưu vào tủ đồ.</p>
              </div>

              <WardrobeUploader onUploadingChange={setIsUploading} onUploadSuccess={() => setShowSuccess(true)} />
            </div>
          </div>
        </section>

        {/* full-screen overlay to block interactions while processing/parsing */}
        {isUploading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-50 flex flex-col items-center gap-3 p-6 rounded-lg bg-black/60 text-white">
              {!showSuccess ? (
                <>
                  <div className="loader w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-white/60" />
                  <div>Đang xử lý, xin chờ...</div>
                </>
              ) : (
                <div className="text-green-300 font-medium">đưa vào tủ đồ thành công</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
