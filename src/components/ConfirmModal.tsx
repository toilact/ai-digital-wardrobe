"use client";

import React from "react";

export default function ConfirmModal({
    open,
    title = "Xác nhận",
    message,
    onConfirm,
    onCancel,
    loading = false,
}: {
    open: boolean;
    title?: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

            <div className="relative max-w-lg w-full bg-[#121212] rounded-2xl shadow-2xl p-6 border border-white/10 m-4">
                <h3 className="text-xl font-semibold mb-3 text-white/90">{title}</h3>
                <div className="text-white/70 leading-relaxed mb-6">{message}</div>

                <div className="flex justify-end gap-3 mt-2">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl font-semibold bg-red-500/80 border border-red-500/50 text-white hover:bg-red-500 transition shadow-[0_0_15px_rgba(239,68,68,0.2)] disabled:opacity-50"
                    >
                        {loading ? "Đang xử lý..." : "Xác nhận"}
                    </button>
                </div>
            </div>
        </div>
    );
}
