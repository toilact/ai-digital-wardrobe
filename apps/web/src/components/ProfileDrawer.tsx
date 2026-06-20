"use client";

import { useEffect } from "react";
import type { UserAccount, UserProfile } from "@/lib/profile";
import { hasActiveVip } from "@/lib/profile";
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

function InfoRow({ label, value, icon }: { label: string; value?: unknown; icon?: string }) {
  const display = value === undefined || value === null || value === "" ? "—" : String(value);
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 group/row">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-base opacity-60">{icon}</span>}
        <span className="text-sm text-white/55 font-medium">{label}</span>
      </div>
      <span className="text-sm text-white/90 font-semibold tabular-nums">{display}</span>
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

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const resolvedEmail = account?.email || profile?.email || user?.email || "";
  const uname =
    account?.username ||
    profile?.username ||
    user?.username ||
    emailPrefix(resolvedEmail);
  const resolvedDisplayName =
    account?.displayName || profile?.displayName || user?.displayName || uname;
  const initials = initialsFrom(resolvedDisplayName, resolvedEmail);
  const vipActive = hasActiveVip(account ?? profile ?? null);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute right-0 top-0 h-full w-[400px] max-w-[94vw]
        transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #0c1025 0%, #0a0e1a 40%, #100818 100%)",
        }}
      >
        {/* Animated gradient border on left edge */}
        <div
          className="absolute left-0 top-0 w-[2px] h-full"
          style={{
            background: "linear-gradient(180deg, rgba(99,102,241,0.7) 0%, rgba(236,72,153,0.6) 50%, rgba(34,197,94,0.5) 100%)",
          }}
        />

        {/* Ambient glow effects */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -left-16 w-48 h-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 -right-10 w-40 h-40 rounded-full bg-emerald-500/8 blur-3xl" />

        {/* Header Section */}
        <div className="relative p-6 pb-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10
                       hover:border-white/20 text-white/70 hover:text-white transition-all duration-200 flex items-center justify-center z-10"
            aria-label="Close"
          >
            ✕
          </button>

          {/* Profile info */}
          <div className="flex flex-col items-center pt-2 pb-1">
            {/* Avatar with glow ring */}
            <div className="relative mb-4">
              <div
                className="absolute -inset-1 rounded-full opacity-75 blur-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.8), rgba(236,72,153,0.6), rgba(34,197,94,0.5))",
                }}
              />
              <div className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-br from-indigo-500 via-pink-500 to-emerald-400">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0c1025] flex items-center justify-center">
                  {user?.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white/90">{initials}</span>
                  )}
                </div>
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0c1025] shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            </div>

            {/* Name & email */}
            <h3 className="text-lg font-bold text-white/95 text-center">
              {resolvedDisplayName || "Tài khoản"}
            </h3>
            <p className="text-sm text-white/50 mt-0.5">{resolvedEmail || "—"}</p>

            {/* VIP / Regular Badge */}
            <div className="mt-3">
              {vipActive ? (
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold
                  bg-gradient-to-r from-indigo-500 via-pink-500 to-emerald-500
                  text-white shadow-[0_0_16px_rgba(236,72,153,0.4)]">
                  <span className="text-base leading-none">♛</span> VIP
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold
                  bg-white/5 border border-white/10 text-white/60">
                  Tài khoản thường
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-5 pb-6" style={{ height: "calc(100% - 260px)" }}>
          {/* Account Info Card */}
          <div className="mb-4">
            <div className="rounded-2xl p-[1px] bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-transparent">
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs tracking-[0.15em] text-indigo-300/80 font-semibold uppercase">Tài khoản</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/20 to-transparent" />
                </div>
                <InfoRow icon="👤" label="Tên hiển thị" value={resolvedDisplayName} />
                <div className="h-px bg-white/[0.06]" />
                <InfoRow icon="✉️" label="Email" value={resolvedEmail} />
                <div className="h-px bg-white/[0.06]" />
                <InfoRow icon="🔑" label="Tên đăng nhập" value={uname || "—"} />
              </div>
            </div>
          </div>

          {/* Body Metrics Card */}
          <div className="mb-4">
            <div className="rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/25 via-emerald-500/15 to-transparent">
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs tracking-[0.15em] text-cyan-300/80 font-semibold uppercase">Thông tin cá nhân</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/20 to-transparent" />
                </div>
                <InfoRow icon="⚧" label="Giới tính" value={genderLabel(profile?.gender)} />
                <div className="h-px bg-white/[0.06]" />
                <InfoRow icon="🎂" label="Tuổi" value={profile?.age} />
                <div className="h-px bg-white/[0.06]" />
                <InfoRow icon="📏" label="Chiều cao" value={profile?.heightCm ? `${profile.heightCm} cm` : undefined} />
                <div className="h-px bg-white/[0.06]" />
                <InfoRow icon="⚖️" label="Cân nặng" value={profile?.weightKg ? `${profile.weightKg} kg` : undefined} />

                {/* 3 vòng - show only if any have values */}
                {(profile?.bustCm || profile?.waistCm || profile?.hipCm) && (
                  <>
                    <div className="h-px bg-white/[0.06] mt-1" />
                    <div className="mt-2 pt-1">
                      <div className="text-[11px] text-white/40 font-medium mb-1 uppercase tracking-wider">Số đo 3 vòng</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[11px] text-white/40 mb-0.5">V1</div>
                          <div className="text-sm font-semibold text-white/85">{profile?.bustCm || "—"}</div>
                        </div>
                        <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[11px] text-white/40 mb-0.5">V2</div>
                          <div className="text-sm font-semibold text-white/85">{profile?.waistCm || "—"}</div>
                        </div>
                        <div className="text-center py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                          <div className="text-[11px] text-white/40 mb-0.5">V3</div>
                          <div className="text-sm font-semibold text-white/85">{profile?.hipCm || "—"}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mt-5">
            <a
              href="/onboarding"
              className="group relative block w-full rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/50 via-fuchsia-500/40 to-cyan-500/50
                         hover:from-indigo-500/70 hover:via-fuchsia-500/60 hover:to-cyan-500/70 transition-all duration-300"
            >
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#0c1025]/90 px-4 py-3.5
                              group-hover:bg-[#0c1025]/70 transition-colors duration-300">
                <span className="text-sm">✏️</span>
                <span className="font-semibold text-white/90 text-sm">Tùy chỉnh thông tin</span>
              </div>
            </a>

            <div className="pt-3 border-t border-white/[0.06]">
              <LogoutButton onClose={onClose} />
            </div>
          </div>
        </div>

        {/* Subtle scanline overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 1px, transparent 7px)",
            backgroundSize: "100% 8px",
          }}
        />
      </div>
    </div>
  );
}
