// src/app/admin/vip-orders/page.tsx
"use client";

import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState } from "react";

type VipOrder = {
  id: string;
  uid: string;
  email: string;
  orderCode: string;
  planCode: string;
  amount: number;
  paymentMethod: string | null;
  status: string;
  createdAt: string | null;
  markedPaidAt: string | null;
  approvedAt: string | null;
};

export default function AdminVipOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<VipOrder[]>([]);

  const loadOrders = async () => {
    try {
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/vip/admin/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Không thể tải đơn VIP.");
        return;
      }

      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi tải danh sách đơn VIP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void loadOrders();
  }, [authLoading, user]);

  const approveOrder = async (orderId: string) => {
    try {
      if (!user) return;

      const token = await user.getIdToken();
      const res = await fetch("/api/vip/admin/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Không thể duyệt đơn VIP.");
        return;
      }

      alert("Đã bật VIP thành công.");
      await loadOrders();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi duyệt đơn VIP.");
    }
  };

  return (
    <main>
      <Header />
      <div className="wrap py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold grad-text mb-6 text-center">
            Admin - Duyệt đơn VIP
          </h1>

          {authLoading || loading ? (
            <div className="text-center text-white">Đang tải...</div>
          ) : !user ? (
            <div className="text-center text-red-400">Vui lòng đăng nhập.</div>
          ) : orders.length === 0 ? (
            <div className="text-center text-gray-300">Chưa có đơn VIP nào.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg"
                >
                  <div className="grid md:grid-cols-2 gap-4 text-gray-200">
                    <div><span className="font-semibold">Mã đơn:</span> {order.orderCode}</div>
                    <div><span className="font-semibold">Email:</span> {order.email}</div>
                    <div><span className="font-semibold">UID:</span> {order.uid}</div>
                    <div><span className="font-semibold">Số tiền:</span> {order.amount.toLocaleString("vi-VN")}đ</div>
                    <div><span className="font-semibold">Phương thức:</span> {order.paymentMethod || "Chưa chọn"}</div>
                    <div><span className="font-semibold">Trạng thái:</span> {order.status}</div>
                    <div><span className="font-semibold">Tạo lúc:</span> {order.createdAt || "-"}</div>
                    <div><span className="font-semibold">Báo đã chuyển:</span> {order.markedPaidAt || "-"}</div>
                  </div>

                  {order.status !== "approved" && (
                    <button
                      onClick={() => approveOrder(order.id)}
                      className="mt-5 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                    >
                      Duyệt và bật VIP
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}