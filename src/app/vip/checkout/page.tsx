// src/app/vip/checkout/page.tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import Header from "@/components/Header";
import { useAuth } from "@/lib/AuthContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VipOrder = {
  id: string;
  uid: string;
  email: string;
  planCode: string | null;
  amount: number;
  orderCode: string;
  paymentMethod: "momo" | "mb" | null;
  status: "created" | "pending" | "approved" | "rejected";
  createdAt: string | null;
  markedPaidAt: string | null;
  approvedAt: string | null;
};

export default function VipCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const orderId = searchParams.get("orderId");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<VipOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "mb" | null>(null);

  const momoQrImage =
    process.env.NEXT_PUBLIC_VIP_MOMO_QR_IMAGE || "/payments/momo-qr.png";
  const momoName = process.env.NEXT_PUBLIC_VIP_MOMO_NAME || "CHU TAI KHOAN";
  const momoPhone = process.env.NEXT_PUBLIC_VIP_MOMO_PHONE || "0900000000";

  const mbBankCode = process.env.NEXT_PUBLIC_VIP_MB_BANK_CODE || "MB";
  const mbAccountNo = process.env.NEXT_PUBLIC_VIP_MB_ACCOUNT_NO || "";
  const mbAccountName =
    process.env.NEXT_PUBLIC_VIP_MB_ACCOUNT_NAME || "CHU TAI KHOAN";

  const mbQrUrl = useMemo(() => {
    if (!order || !mbAccountNo) return "";
    return `https://img.vietqr.io/image/${mbBankCode}-${mbAccountNo}-compact2.png?amount=${order.amount}&addInfo=${encodeURIComponent(order.orderCode)}&accountName=${encodeURIComponent(mbAccountName)}`;
  }, [order, mbBankCode, mbAccountNo, mbAccountName]);

  const loadOrder = useCallback(async () => {
    try {
      if (!user || !orderId) return;

      const token = await user.getIdToken();
      const res = await fetch(`/api/vip/order?orderId=${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Không thể tải đơn VIP.");
        router.replace("/services");
        return;
      }

      setOrder(data);
      if (data.paymentMethod) {
        setPaymentMethod(data.paymentMethod);
      }
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi tải đơn VIP.");
      router.replace("/services");
    } finally {
      setLoading(false);
    }
  }, [user, orderId, router]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth/login?next=/services");
      return;
    }

    if (!orderId) {
      router.replace("/services");
      return;
    }

    void loadOrder();
  }, [authLoading, user, orderId, loadOrder, router]);

  useEffect(() => {
    if (!order || order.status !== "pending") return;

    const timer = setInterval(() => {
      void loadOrder();
    }, 5000);

    return () => clearInterval(timer);
  }, [order, loadOrder]);

  const onMarkPaid = async () => {
    try {
      if (!user || !orderId || !paymentMethod) {
        alert("Vui lòng chọn phương thức thanh toán.");
        return;
      }

      setSubmitting(true);

      const token = await user.getIdToken();
      const res = await fetch("/api/vip/mark-paid", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Không thể ghi nhận thanh toán.");
        return;
      }

      alert("Đã ghi nhận. Admin sẽ duyệt giao dịch của bạn.");
      await loadOrder();
    } catch (err) {
      console.error(err);
      alert("Có lỗi khi xác nhận đã chuyển khoản.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <Header />
      <div className="wrap py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold grad-text mb-4 text-center">
            Thanh toán VIP
          </h1>
          <p className="text-gray-300 text-center mb-10">
            Chọn phương thức thanh toán, quét QR và chuyển khoản đúng nội dung.
          </p>

          {loading ? (
            <div className="text-center text-white">Đang tải đơn VIP...</div>
          ) : !order ? (
            <div className="text-center text-red-400">Không tìm thấy đơn VIP.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-semibold text-white mb-5">Thông tin đơn</h2>

                <div className="space-y-3 text-gray-200">
                  <div>
                    <span className="font-semibold">Mã đơn:</span> {order.orderCode}
                  </div>
                  <div>
                    <span className="font-semibold">Gói:</span> VIP tháng
                  </div>
                  <div>
                    <span className="font-semibold">Giá:</span>{" "}
                    {order.amount.toLocaleString("vi-VN")}đ
                  </div>
                  <div>
                    <span className="font-semibold">Trạng thái:</span>{" "}
                    {order.status === "created" && "Chưa xác nhận thanh toán"}
                    {order.status === "pending" && "Đang chờ admin duyệt"}
                    {order.status === "approved" && "Đã kích hoạt VIP"}
                    {order.status === "rejected" && "Đã bị từ chối"}
                  </div>
                </div>

                {order.status !== "approved" && (
                  <>
                    <h3 className="text-xl font-semibold text-white mt-8 mb-4">
                      Chọn phương thức
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setPaymentMethod("momo")}
                        className={`rounded-2xl border p-4 text-white transition ${
                          paymentMethod === "momo"
                            ? "border-pink-500 bg-pink-500/20"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        MoMo
                      </button>

                      <button
                        onClick={() => setPaymentMethod("mb")}
                        className={`rounded-2xl border p-4 text-white transition ${
                          paymentMethod === "mb"
                            ? "border-blue-500 bg-blue-500/20"
                            : "border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        MB Bank
                      </button>
                    </div>
                  </>
                )}

                {order.status === "approved" && (
                  <>
                    <div className="mt-8 rounded-2xl bg-green-500/15 border border-green-500/30 p-4 text-green-300">
                      Gói VIP đã được kích hoạt cho tài khoản của bạn.
                    </div>

                    <button
                      onClick={() => router.push("/dashboard")}
                      className="mt-4 w-full rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
                    >
                      Vào Dashboard
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-semibold text-white mb-5">Quét mã thanh toán</h2>

                {!paymentMethod && order.status !== "approved" && (
                  <div className="text-gray-300">
                    Hãy chọn MoMo hoặc MB để hiện QR thanh toán.
                  </div>
                )}

                {paymentMethod === "momo" && order.status !== "approved" && (
                  <div className="space-y-4">
                    <img
                      src={momoQrImage}
                      alt="MoMo QR"
                      className="w-full max-w-xs mx-auto rounded-2xl bg-white p-3"
                    />

                    <div className="space-y-2 text-gray-200">
                      <div><span className="font-semibold">Ví:</span> MoMo</div>
                      <div><span className="font-semibold">Tên:</span> {momoName}</div>
                      <div><span className="font-semibold">SĐT:</span> {momoPhone}</div>
                      <div><span className="font-semibold">Số tiền:</span> {order.amount.toLocaleString("vi-VN")}đ</div>
                      <div><span className="font-semibold">Nội dung chuyển khoản:</span> {order.orderCode}</div>
                    </div>
                  </div>
                )}

                {paymentMethod === "mb" && order.status !== "approved" && (
                  <div className="space-y-4">
                    {mbQrUrl ? (
                      <img
                        src={mbQrUrl}
                        alt="MB QR"
                        className="w-full max-w-xs mx-auto rounded-2xl bg-white p-3"
                      />
                    ) : (
                      <div className="text-red-400">
                        Bạn chưa cấu hình NEXT_PUBLIC_VIP_MB_ACCOUNT_NO.
                      </div>
                    )}

                    <div className="space-y-2 text-gray-200">
                      <div><span className="font-semibold">Ngân hàng:</span> MB Bank</div>
                      <div><span className="font-semibold">Số tài khoản:</span> {mbAccountNo}</div>
                      <div><span className="font-semibold">Chủ tài khoản:</span> {mbAccountName}</div>
                      <div><span className="font-semibold">Số tiền:</span> {order.amount.toLocaleString("vi-VN")}đ</div>
                      <div><span className="font-semibold">Nội dung chuyển khoản:</span> {order.orderCode}</div>
                    </div>
                  </div>
                )}

                {order.status !== "approved" && (
                  <button
                    onClick={onMarkPaid}
                    disabled={!paymentMethod || submitting}
                    className="mt-8 w-full text-center bg-gradient-to-r from-blue-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-pink-600 transition-colors shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Đang ghi nhận..." : "Tôi đã chuyển khoản"}
                  </button>
                )}

                {order.status === "pending" && (
                  <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-yellow-200">
                    Hệ thống đang chờ admin duyệt. Trang này sẽ tự cập nhật khi VIP được bật.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}