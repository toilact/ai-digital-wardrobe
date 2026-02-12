"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getUserProfile, upsertUserProfile } from "@/lib/profile";
import LogoutButton from "@/components/LogoutButton";

function emailPrefix(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

function MetricCard({
  code,
  title,
  range,
  unit,
  value,
  onChange,
  required,
}: {
  code: string;
  title: string;
  range: string;
  unit: string;
  value: number | "";
  onChange: (v: number | "") => void;
  required?: boolean;
}) {
  return (
    <div className="rounded-2xl p-[1px] bg-gradient-to-br from-cyan-400/35 via-fuchsia-400/30 to-emerald-400/20">
      <div className="relative cy-hud rounded-2xl border border-white/10 bg-black/30 backdrop-blur-xl px-5 py-4 shadow-[0_18px_55px_rgba(0,0,0,.35)] overflow-hidden">
        {/* tiny glow */}
        <div className="pointer-events-none absolute -inset-24 opacity-40 blur-3xl bg-[radial-gradient(circle,rgba(56,189,248,.35),transparent_60%)]" />

        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-[11px] tracking-[0.22em] text-white/55">{code}</span>
              {required ? (
                <span className="text-[11px] text-white/70 px-2 py-[2px] rounded-full border border-white/10 bg-white/5">
                  REQUIRED
                </span>
              ) : (
                <span className="text-[11px] text-white/55 px-2 py-[2px] rounded-full border border-white/10 bg-white/5">
                  OPTIONAL
                </span>
              )}
            </div>
            <div className="mt-2 text-white/90 font-semibold">{title}</div>
          </div>

          <div className="text-[11px] text-white/50 px-2 py-1 rounded-full border border-white/10 bg-white/5">
            {range}
          </div>
        </div>

        <div className="relative mt-4 flex items-end gap-3">
          <input
            className="cy-num w-full bg-transparent outline-none border-0 text-[40px] leading-none font-semibold text-white tracking-wide tabular-nums
                       focus:drop-shadow-[0_0_16px_rgba(56,189,248,.35)]"
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <span className="mb-[6px] text-xs font-semibold text-white/70 px-3 py-1 rounded-full border border-white/10 bg-white/5">
            {unit}
          </span>
        </div>

        {/* HUD corners */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-70
          [background:
          linear-gradient(to_right,rgba(34,211,238,.55),transparent_35%)_top_left/28px_1px_no-repeat,
          linear-gradient(to_bottom,rgba(34,211,238,.55),transparent_35%)_top_left/1px_28px_no-repeat,
          linear-gradient(to_left,rgba(168,85,247,.55),transparent_35%)_top_right/28px_1px_no-repeat,
          linear-gradient(to_bottom,rgba(168,85,247,.55),transparent_35%)_top_right/1px_28px_no-repeat,
          linear-gradient(to_right,rgba(34,211,238,.28),transparent_35%)_bottom_left/28px_1px_no-repeat,
          linear-gradient(to_top,rgba(34,211,238,.28),transparent_35%)_bottom_left/1px_28px_no-repeat,
          linear-gradient(to_left,rgba(236,72,153,.28),transparent_35%)_bottom_right/28px_1px_no-repeat,
          linear-gradient(to_top,rgba(236,72,153,.28),transparent_35%)_bottom_right/1px_28px_no-repeat]"
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [age, setAge] = useState<number>(18);
  const [heightCm, setHeightCm] = useState<number>(165);
  const [weightKg, setWeightKg] = useState<number>(55);

  const [bustCm, setBustCm] = useState<number | "">("");
  const [waistCm, setWaistCm] = useState<number | "">("");
  const [hipCm, setHipCm] = useState<number | "">("");

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      try {
        const p = await getUserProfile(user.uid);
        if (p) {
          router.replace("/dashboard");
          return;
        }
      } catch (e) {
        console.error(e);
      } finally {
        setChecking(false);
      }
    };
    if (!loading && user) run();
  }, [loading, user, router]);

  const uname = emailPrefix(user?.email);

  const ready = useMemo(() => {
    return age >= 10 && age <= 100 && heightCm >= 100 && heightCm <= 230 && weightKg >= 25 && weightKg <= 200;
  }, [age, heightCm, weightKg]);

  const validate = () => {
    if (age < 10 || age > 100) return "Tuổi không hợp lệ.";
    if (heightCm < 100 || heightCm > 230) return "Chiều cao không hợp lệ.";
    if (weightKg < 25 || weightKg > 200) return "Cân nặng không hợp lệ.";
    const nums = [bustCm, waistCm, hipCm].filter((x) => x !== "") as number[];
    if (nums.some((n) => n < 30 || n > 200)) return "Số đo 3 vòng không hợp lệ.";
    return null;
  };

  const onSave = async () => {
    if (!user) return;
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      await upsertUserProfile(user.uid, {
        age,
        heightCm,
        weightKg,
        bustCm: bustCm === "" ? 0 : bustCm,
        waistCm: waistCm === "" ? 0 : waistCm,
        hipCm: hipCm === "" ? 0 : hipCm,
      });
      router.replace("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Lưu thông tin thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || checking) return <div className="p-6 text-white/70">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      {/* Background (cyber giống dashboard) */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0b1020] via-[#0a0f18] to-[#12061a]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,.25),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(circle_at_85%_30%,rgba(168,85,247,.22),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-50 bg-[radial-gradient(circle_at_60%_85%,rgba(236,72,153,.16),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />

      {/* Top */}
      <header className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
                AI Digital Wardrobe
              </span>
              <div className="mt-1 text-white/80 text-lg md:text-xl font-medium">
                Profile Init Console
              </div>
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]" />
                Secure session
              </span>

              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                UID: {user.uid.slice(0, 6)}…{user.uid.slice(-4)}
              </span>

              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                  ready
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-300/20 bg-amber-400/10 text-amber-200"
                }`}
              >
                {ready ? "READY" : "CHECK"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <div className="text-white/90 font-semibold">Xin chào {user.displayName || uname}</div>
              <div className="text-white/50 text-sm">@{uname}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto w-full max-w-6xl px-6 pt-8 pb-10">
        <div className="cy-hud-panel rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,.45)] overflow-hidden">
          {/* Title strip */}
          <div className="px-7 py-6 border-b border-white/10">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.18em] text-white/60">
              SYSTEM / PROFILE
              <span className="px-2 py-[2px] rounded-full border border-white/10 bg-white/5 text-[11px] tracking-normal">
                CORE REQUIRED
              </span>
            </div>
            <div className="mt-3 text-2xl md:text-3xl font-semibold text-white">
              Nhập tất cả thông tin của bạn vào đây
            </div>
            <p className="mt-2 text-white/65">
              Chí Thành đẹp trai số 1 VN.
            </p>
          </div>

          {/* Cards */}
          <div className="px-7 pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                code="AGE"
                title="Tuổi"
                range="10–100"
                unit="years"
                value={age}
                onChange={(v) => setAge(v === "" ? 18 : v)}
                required
              />
              <MetricCard
                code="HEIGHT"
                title="Chiều cao"
                range="100–230"
                unit="cm"
                value={heightCm}
                onChange={(v) => setHeightCm(v === "" ? 165 : v)}
                required
              />
              <MetricCard
                code="WEIGHT"
                title="Cân nặng"
                range="25–200"
                unit="kg"
                value={weightKg}
                onChange={(v) => setWeightKg(v === "" ? 55 : v)}
                required
              />
            </div>

            {/* Optional toggle */}
            <button
              type="button"
              onClick={() => setAdvancedOpen((s) => !s)}
              className="mt-5 w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 font-semibold hover:bg-white/10 transition"
            >
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.7)]" />
              Measurements (tuỳ chọn) • Mở số đo 3 vòng
              <span className="ml-auto text-white/50">{advancedOpen ? "▾" : "▸"}</span>
            </button>

            {advancedOpen ? (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <MetricCard
                  code="BUST"
                  title="Vòng 1"
                  range="30–200"
                  unit="cm"
                  value={bustCm}
                  onChange={setBustCm}
                />
                <MetricCard
                  code="WAIST"
                  title="Vòng 2"
                  range="30–200"
                  unit="cm"
                  value={waistCm}
                  onChange={setWaistCm}
                />
                <MetricCard
                  code="HIP"
                  title="Vòng 3"
                  range="30–200"
                  unit="cm"
                  value={hipCm}
                  onChange={setHipCm}
                />
              </div>
            ) : null}
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 mt-6 border-t border-white/10 bg-[linear-gradient(to_top,rgba(9,12,20,.75),rgba(9,12,20,.25))] backdrop-blur-xl">
            <div className="px-7 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="text-xs text-white/55 leading-relaxed">
                {ready ? (
                  <span>
                    <span className="text-emerald-200 font-semibold">OK</span> • Lưu lại để AI bắt đầu gợi ý outfit.
                  </span>
                ) : (
                  <span>
                    <span className="text-amber-200 font-semibold">Chưa đủ</span> • Hãy nhập core metrics hợp lệ để tiếp tục.
                  </span>
                )}
              </div>

              <button
                onClick={onSave}
                disabled={saving || !ready}
                className="relative w-full sm:w-auto rounded-2xl px-5 py-3 font-semibold
                           border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20
                           hover:border-cyan-300/40 hover:shadow-[0_18px_60px_rgba(0,0,0,.45)]
                           transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Đang lưu..." : "Lưu & Tiếp tục"}
              </button>
            </div>
          </div>

          <div className="px-7 pb-6 pt-3 text-[11px] text-white/40">
            Tip: mày có thể để Measurements trống để demo nhanh, vẫn đủ “cyber vibe”.
          </div>
        </div>
      </main>
    </div>
  );
}
