"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import Header from "@/components/Header";
import AlertModal from "@/components/AlertModal";

type WardrobeItem = {
  id: string;
  imageUrl: string;
  category?: string;
  cloudinaryPublicId?: string;
  createdAt?: any;
};

const CATEGORIES = [
  { key: "ao", label: "Áo" },
  { key: "quan", label: "Quần" },
  { key: "vay", label: "Váy" },
  { key: "dam", label: "Đầm" },
  { key: "giay", label: "Giày" },
] as const;

type CatKey = (typeof CATEGORIES)[number]["key"];

function stripVN(s?: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function normalizeCategory(raw?: string): CatKey {
  const s = stripVN(raw);

  if (s.includes("giay") || s.includes("shoe") || s.includes("sneaker")) return "giay";
  if (s.includes("dam") || s.includes("dress") || s.includes("gown")) return "dam";
  if (s.includes("vay") || s.includes("skirt")) return "vay";
  if (s.includes("quan") || s.includes("pants") || s.includes("trouser") || s.includes("jean")) return "quan";
  if (s.includes("ao") || s.includes("shirt") || s.includes("tee") || s.includes("top") || s.includes("hoodie")) return "ao";

  return "ao";
}

export default function WardrobePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [fetching, setFetching] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingPublicId, setPendingPublicId] = useState<string | undefined>(undefined);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  const [activeCat, setActiveCat] = useState<CatKey>("ao");

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setFetching(true);

      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/wardrobe/list", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "List failed");
        setItems(data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };

    if (!loading && user) run();
  }, [loading, user]);

  const grouped = useMemo(() => {
    const g: Record<CatKey, WardrobeItem[]> = { ao: [], quan: [], vay: [], dam: [], giay: [] };

    for (const it of items) {
      const k = normalizeCategory(it.category);
      g[k].push(it);
    }

    for (const k of Object.keys(g) as CatKey[]) {
      g[k].sort((a, b) => {
        const ta = a.createdAt?.seconds ? a.createdAt.seconds : 0;
        const tb = b.createdAt?.seconds ? b.createdAt.seconds : 0;
        return tb - ta;
      });
    }

    return g;
  }, [items]);

  const activeList = grouped[activeCat] || [];
  const activeLabel = CATEGORIES.find((c) => c.key === activeCat)?.label || "Danh mục";

  if (loading || fetching) return <div className="p-6">Loading...</div>;
  if (!user) {
    router.replace("/");
    return null;
  }

  const openConfirm = (id: string, publicId?: string) => {
    setPendingId(id);
    setPendingPublicId(publicId);
    setConfirmOpen(true);
  };

  const deleteItemConfirmed = async () => {
    const id = pendingId;
    const publicId = pendingPublicId;
    if (!id || !user) return;

    try {
      setConfirmLoading(true);
      setDeletingId(id);

      const idToken = await user.getIdToken();
      const res = await fetch("/api/wardrobe/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ id, publicId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlertMsg(data?.message || "Xóa thất bại");
        return;
      }

      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      console.error(e);
      setAlertMsg("Xóa thất bại (lỗi mạng hoặc API).");
    } finally {
      setDeletingId(null);
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingId(null);
      setPendingPublicId(undefined);
    }
  };

  return (
    <main className="min-h-screen space-y-6 ">
      <Header />
      <div className="wrap ">
        <header className="mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button onClick={() => router.push("/dashboard")} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition">
              ← Dashboard
            </button>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
              Tủ đồ của bạn
            </h1>
            <Link href="/wardrobe/upload" className="px-4 py-2 rounded-xl font-semibold border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 text-white hover:border-cyan-300/40 transition shadow-[0_0_15px_rgba(56,189,248,0.15)]">
              + Thêm đồ
            </Link>
          </div>
        </header>
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto py-1">
          {CATEGORIES.map((c) => {
            const count = grouped[c.key]?.length ?? 0;
            const active = activeCat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className={`px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition
                ${active ? "bg-gradient-to-r from-sky-400/80 to-indigo-500/80 text-white border-transparent shadow-[0_0_15px_rgba(56,189,248,0.2)]" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"}`}
              >
                {c.label} <span className={`${active ? "opacity-90" : "opacity-50"}`}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {activeList.length === 0 ? (
          <div className="border border-white/10 bg-white/5 rounded-xl p-8 text-center text-white/60">
            Chưa có món nào trong mục <b className="text-white/80">{activeLabel}</b>.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {activeList.map((it) => (
              <div key={it.id} className="border border-white/10 bg-white/5 rounded-xl overflow-hidden relative shadow-lg hover:border-white/20 transition group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl} alt="item" className="w-full h-64 object-contain p-2" />
                <div className="p-4 bg-black/40 backdrop-blur-md text-sm border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-white/90">{it.category || "Không rõ"}</div>
                    </div>
                    <button
                      onClick={() => openConfirm(it.id, it.cloudinaryPublicId)}
                      disabled={deletingId === it.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition"
                    >
                      {deletingId === it.id ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmModal
          open={confirmOpen}
          message={<span>Bạn có chắc muốn xóa món này khỏi tủ đồ?</span>}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={deleteItemConfirmed}
          loading={confirmLoading}
        />
      </div>
      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </main>
  );
}
