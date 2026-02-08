"use client";

import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/components/ConfirmModal";
import LogoutButton from "@/components/LogoutButton";

export default function WardrobePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingPublicId, setPendingPublicId] = useState<string | undefined>(undefined);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setFetching(true);

      const idToken = await user.getIdToken();
      const res = await fetch("/api/wardrobe/list", {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      const data = await res.json();
      setItems(data.items || []);
      setFetching(false);
    };

    if (!loading && user) run();
  }, [loading, user]);

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
        // show alert for now
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

      <div className="flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="px-3 py-2 rounded border">
          ← Quay lại Dashboard
        </button>
        <h1 className="text-xl font-semibold">Tủ đồ của bạn</h1>
        <Link href="/wardrobe/upload" className="px-3 py-2 rounded bg-black text-white">
          + Thêm đồ
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="border rounded-xl p-6 text-gray-600">Chưa có món nào trong tủ đồ.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {items.map((it) => (
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
