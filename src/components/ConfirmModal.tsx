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
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

            <div className="relative max-w-lg w-full bg-white rounded-lg shadow-xl p-6">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <div className="text-sm text-gray-700 mb-4">{message}</div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 rounded border hover:bg-gray-50 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? "Đang xóa..." : "Xóa"}
                    </button>
                </div>
            </div>
        </div>
    );
}
