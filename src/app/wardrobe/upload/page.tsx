"use client";
import WardrobeUploader from "@/components/WardrobeUploader";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
export default function WardrobeUploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // ✅ Redirect phải nằm trong useEffect, không được router.replace trong render
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);
  // ✅ Hooks luôn phải chạy trước mọi return
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (showSuccess) {
      t = setTimeout(() => {
        setShowSuccess(false);
        setIsUploading(false);
        router.push("/wardrobe");
      }, 1000);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [showSuccess, router]);
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null; // đang redirect
  return (
    <main>
            <div className="wrap">
        <div className="dashboard-container">
          <div className="wrap pt-5">
            <header className="mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  disabled={isUploading}
                  className={`px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition ${isUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  ← Dashboard
                </button>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
                  Upload vào tủ đồ
                </h1>
                <button
                  onClick={() => router.push("/wardrobe")}
                  disabled={isUploading}
                  className={`px-4 py-2 rounded-xl font-semibold border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 text-white hover:border-cyan-300/40 transition shadow-[0_0_15px_rgba(56,189,248,0.15)] ${isUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  Xem tủ đồ →
                </button>
              </div>
            </header>
            <section style={{ marginTop: 18 }}>
              <div className="card">
                <div className="content">
                  <div className="mb-4">
                    <h3 className="title">Upload và tách đồ</h3>
                    <p className="desc">
                      Chọn ảnh, AI sẽ tự tách từng item và bạn có thể lưu vào tủ đồ.
                    </p>
                  </div>
                  <WardrobeUploader
                    onUploadingChange={setIsUploading}
                    onUploadSuccess={() => setShowSuccess(true)}
                  />
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
                    <div className="text-green-300 font-medium">
                      đưa vào tủ đồ thành công
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main >
  );
}