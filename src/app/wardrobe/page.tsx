"use client";

import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  imageUrl: string;
  category: string;
  color: string;
};

export default function WardrobePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "wardrobeItems"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      );
    });
  }, [user]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tủ đồ của bạn</h1>
        <Link className="px-4 py-2 rounded bg-black text-white" href="/wardrobe/upload">
          + Thêm đồ
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">Chưa có món nào. Bấm “Thêm đồ” để upload.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.imageUrl} alt={it.category} className="w-full h-48 object-cover" />
              <div className="p-3 text-sm">
                <div className="font-medium">{it.category}</div>
                <div className="text-gray-600">{it.color}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
