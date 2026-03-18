"use client";
import WardrobeStylistChat from "@/components/WardrobeStylistChat";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OutfitSuggestPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

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
    <main className="fixed inset-x-0 bottom-0 top-24 z-20 overflow-hidden text-white">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#070812] via-[#0b1020] to-[#0a0f18]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(ellipse_1200px_650px_at_15%_-5%,rgba(99,102,241,0.32),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-55 bg-[radial-gradient(ellipse_900px_520px_at_85%_10%,rgba(236,72,153,0.22),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-45 bg-[radial-gradient(ellipse_1000px_600px_at_50%_110%,rgba(34,197,94,0.14),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className={`mx-auto h-full w-full max-w-[1300px] px-3 pb-3 pt-2 md:px-6 md:pb-6 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <WardrobeStylistChat mode="page" idUser={user.uid} />
      </div>
    </main>
  );
}
