"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import LogoutButton from "@/components/LogoutButton";

type WardrobeItem = {
  id: string;
  imageUrl: string;
  category?: string;
  color?: string;
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
        alert(data?.message || "Xóa thất bại");
        return;
      }

      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e) {
      console.error(e);
      alert("Xóa thất bại (lỗi mạng hoặc API).");
    } finally {
      setDeletingId(null);
      setConfirmLoading(false);
      setConfirmOpen(false);
      setPendingId(null);
      setPendingPublicId(undefined);
    }
  };

  return (
    <main className="min-h-screen p-6 space-y-6">
      <header className="hero">
        <div className="hero-left">
          <h1>
            <span className="grad">AI Digital Wardrobe</span>
          </h1>
        </div>


      </header>

      <div className="flex items-center justify-between gap-3">
        <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded border">
          ← Quay lại Dashboard
        </button>

        <h1 className="text-xl font-semibold">Tủ đồ của bạn</h1>

        <Link href="/wardrobe/upload" className="px-3 py-2 rounded bg-black text-white">
          + Thêm đồ
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto py-1">
        {CATEGORIES.map((c) => {
          const count = grouped[c.key]?.length ?? 0;
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              className={`px-3 py-2 rounded-full border text-sm whitespace-nowrap transition
                ${active ? "bg-black text-white border-black" : "bg-white text-black border-gray-200 hover:bg-gray-50"}`}
            >
              {c.label} <span className={`${active ? "opacity-80" : "opacity-60"}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {activeList.length === 0 ? (
        <div className="border rounded-xl p-6 text-gray-600">
          Chưa có món nào trong mục <b>{activeLabel}</b>.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {activeList.map((it) => (
            <div key={it.id} className="border rounded-xl overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt="item" className="w-full h-64 object-cover" />
              <div className="p-3 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{it.category || "Không rõ"}</div>
                    <div className="text-gray-500">{it.color || "Không rõ"}</div>
                  </div>
                  <button
                    onClick={() => openConfirm(it.id, it.cloudinaryPublicId)}
                    disabled={deletingId === it.id}
                    className="ml-3 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
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
    </main>
  );
}
