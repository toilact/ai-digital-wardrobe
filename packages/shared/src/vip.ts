// src/lib/vip.ts
export const VIP_PLAN_CODE = "vip_monthly";
export const VIP_PRICE = 25000;
export const VIP_DURATION_DAYS = 30;

export type PaymentMethod = "momo" | "mb";
export type VipOrderStatus = "created" | "pending" | "approved" | "rejected";

export function buildVipOrderCode() {
  const now = new Date();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `VIP-${y}${m}${d}-${hh}${mm}${ss}-${rand}`;
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export function toDateSafe(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) return value;

  if (typeof (value as { toDate?: unknown })?.toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }

  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function hasActiveVip(
  account?: { isVIP?: boolean; vipExpiresAt?: unknown | null } | null
) {
  if (!account?.isVIP) return false;

  const expiresAt = toDateSafe(account.vipExpiresAt);

  // Backward-compatible với user cũ chỉ có isVIP=true mà chưa có vipExpiresAt
  if (!expiresAt) return true;

  return expiresAt.getTime() > Date.now();
}