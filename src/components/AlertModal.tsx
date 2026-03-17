"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AlertModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ isOpen, message, onClose }: AlertModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-6 max-h-[60vh] overflow-y-auto pr-2 text-sm text-white/90">
          {message}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-cyan-500/20 px-5 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/30"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
