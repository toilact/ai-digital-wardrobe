"use client";

import { useEffect } from "react";
import type { UserAccount, UserProfile } from "@/lib/profile";
import LogoutButton from "./LogoutButton";

function emailPrefix(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

function initialsFrom(name?: string | null, email?: string | null) {
  const base = (name || "").trim() || emailPrefix(email) || "U";
  const parts = base.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "U").toUpperCase();
  const b = (parts[1]?.[0] || "").toUpperCase();
  return (a + b) || "U";
}

function genderLabel(g: UserProfile["gender"] | undefined) {
  if (g === "male") return "Nam";
  if (g === "female") return "Nữ";
  return "—";
}

function Row({ label, value }: { label: string; value?: unknown }) {
  const display = value === undefined || value === null || value === "" ? "—" : String(value);
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/10 last:border-b-0">
      <div className="text-sm text-white/60">{label}</div>
      <div className="text-sm text-white/90 text-right max-w-[60%] break-words">{display}</div>
    </div>
  );
}

export default function ProfileDrawer({
  open,
  onClose,
  user,
  account,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  user: {
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    username?: string | null;
  } | null;
  account?: UserAccount | null;
  profile: UserProfile | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const resolvedEmail = account?.email || profile?.email || user?.email || "";
  const uname =
    account?.username ||
    profile?.username ||
    user?.username ||
    emailPrefix(resolvedEmail);
  const resolvedDisplayName =
    account?.displayName || profile?.displayName || user?.displayName || uname;
  const initials = initialsFrom(resolvedDisplayName, resolvedEmail);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/55 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      />

      <div
        className={`absolute right-0 top-0 h-full w-[380px] max-w-[92vw] bg-neutral-950 border-l border-white/10
        transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-semibold text-white/90">{initials}</span>
              )}
            </div>

            <div className="leading-tight">
              <div className="text-white font-semibold">{resolvedDisplayName || "Tài khoản"}</div>
              <div className="text-xs text-white/60">{resolvedEmail || "—"}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100%-80px)]">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/90 mb-2">Tài khoản</div>
            <Row label="Tên hiển thị" value={resolvedDisplayName} />
            <Row label="Email" value={resolvedEmail} />
            <Row label="Tên đăng nhập" value={uname ? `${uname}` : "—"} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white/90 mb-2">Thông tin cá nhân</div>

            <Row label="Giới tính" value={genderLabel(profile?.gender)} />
            <Row label="Tuổi" value={profile?.age} />
            <Row label="Chiều cao (cm)" value={profile?.heightCm} />
            <Row label="Cân nặng (kg)" value={profile?.weightKg} />
            <Row label="Vòng 1 (cm)" value={profile?.bustCm} />
            <Row label="Vòng 2 (cm)" value={profile?.waistCm} />
            <Row label="Vòng 3 (cm)" value={profile?.hipCm} />
          </div>


          <a
            href="/onboarding"
            className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium transition-colors"
          >
            Tùy chỉnh thông tin
          </a>

          <div className="pt-4 border-t border-white/10">
            <LogoutButton onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
