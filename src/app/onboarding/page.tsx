"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { upsertUserProfile } from "@/lib/profile";
import AlertModal from "@/components/AlertModal";

function emailPrefix(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

type Gender = "male" | "female";

const STEPS = [
  { key: "welcome", label: "Chào bạn" },
  { key: "gender", label: "Giới tính" },
  { key: "basics", label: "Thông tin cơ bản" },
  { key: "measurements", label: "Số đo (tuỳ chọn)" },
] as const;

export default function OnboardingPage() {
  const { user, loading, profile, account, refreshProfile } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState<number>(18);
  const [heightCm, setHeightCm] = useState<number>(165);
  const [weightKg, setWeightKg] = useState<number>(55);

  const [bustCm, setBustCm] = useState<number | "">(0);
  const [waistCm, setWaistCm] = useState<number | "">(0);
  const [hipCm, setHipCm] = useState<number | "">(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setGender(profile.gender || "male");
      setAge(profile.age || 18);
      setHeightCm(profile.heightCm || 165);
      setWeightKg(profile.weightKg || 55);
      if (profile.bustCm) setBustCm(profile.bustCm);
      if (profile.waistCm) setWaistCm(profile.waistCm);
      if (profile.hipCm) setHipCm(profile.hipCm);
    }
    if (!loading) {
      setChecking(false);
      setTimeout(() => setMounted(true), 100);
    }
  }, [profile, loading]);

  const uname = account?.username || emailPrefix(account?.email || user?.email);
  const displayName = account?.displayName || user?.displayName || uname;

  const ready = useMemo(() => {
    return age >= 10 && age <= 100 && heightCm >= 100 && heightCm <= 230 && weightKg >= 25 && weightKg <= 200;
  }, [age, heightCm, weightKg]);

  const validate = () => {
    if (gender !== "male" && gender !== "female") return "Giới tính không hợp lệ.";
    if (age < 10 || age > 100) return "Tuổi không hợp lệ.";
    if (heightCm < 100 || heightCm > 230) return "Chiều cao không hợp lệ.";
    if (weightKg < 25 || weightKg > 200) return "Cân nặng không hợp lệ.";
    const nums = [bustCm, waistCm, hipCm].filter((x) => x !== "" && x !== 0) as number[];
    if (nums.some((n) => n < 30 || n > 200)) return "Số đo 3 vòng không hợp lệ.";
    return null;
  };

  const onSave = async () => {
    if (!user) return;
    const err = validate();
    if (err) return setAlertMsg(err);

    setSaving(true);
    try {
      await upsertUserProfile(user.uid, {
        gender,
        age,
        heightCm,
        weightKg,
        bustCm: bustCm === "" ? 0 : bustCm,
        waistCm: waistCm === "" ? 0 : waistCm,
        hipCm: hipCm === "" ? 0 : hipCm,
      });
      await refreshProfile();
      router.replace("/dashboard");
    } catch (e) {
      console.error(e);
      setAlertMsg("Lưu thông tin thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 2 && !ready) {
      setAlertMsg("Vui lòng nhập thông tin hợp lệ trước khi tiếp tục.");
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
    else onSave();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin" />
          <span className="text-white/50 text-sm">Đang tải...</span>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen relative text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#070812] via-[#0b1020] to-[#0a0f18]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,.22),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-55 bg-[radial-gradient(circle_at_85%_30%,rgba(168,85,247,.18),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-45 bg-[radial-gradient(circle_at_60%_85%,rgba(236,72,153,.14),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.06] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />

      <div className="max-w-2xl mx-auto px-5 py-8 md:py-14">
        {/* Header */}
        <div className={`text-center mb-8 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h1 className="text-3xl md:text-4xl font-bold">
            <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-emerald-300 bg-clip-text text-transparent">
              Thiết lập hồ sơ
            </span>
          </h1>
          <p className="text-white/50 mt-2 text-sm md:text-base">
            Giúp AI hiểu bạn hơn để gợi ý outfit chuẩn xác nhất
          </p>
        </div>

        {/* Progress bar */}
        <div className={`mb-8 transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center">
                <button
                  onClick={() => { if (i <= step) setStep(i); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                    ${i < step
                      ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                      : i === step
                        ? "bg-white/15 text-white border-2 border-indigo-400/60 shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                        : "bg-white/[0.06] text-white/30 border border-white/[0.08]"
                    }`}
                >
                  {i < step ? "✓" : i + 1}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 sm:w-16 md:w-20 h-0.5 mx-1 rounded transition-colors duration-300
                    ${i < step ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500" : "bg-white/[0.08]"}`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-white/40">
            Bước {step + 1}/{STEPS.length} — {STEPS[step].label}
          </div>
        </div>

        {/* Step content card */}
        <div className={`transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="rounded-3xl p-[1px] bg-gradient-to-br from-indigo-500/25 via-fuchsia-500/15 to-cyan-500/20">
            <div className="rounded-3xl bg-[#0c1025]/90 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

              {/* Step 0: Welcome */}
              {step === 0 && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-5">👋</div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white/92 mb-3">
                    Xin chào, {displayName}!
                  </h2>
                  <p className="text-white/55 text-base leading-relaxed max-w-md mx-auto mb-6">
                    Để AI có thể gợi ý trang phục phù hợp nhất, chúng mình cần biết thêm một chút về bạn. Chỉ mất khoảng <span className="text-cyan-300 font-semibold">30 giây</span> thôi!
                  </p>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto text-left">
                    <div className="flex items-center gap-3 text-sm text-white/65">
                      <span className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-xs">✨</span>
                      Gợi ý outfit theo size thực tế
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/65">
                      <span className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/20 flex items-center justify-center text-xs">🎯</span>
                      Phối đồ phù hợp vóc dáng
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/65">
                      <span className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-xs">🔒</span>
                      Thông tin được bảo mật hoàn toàn
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: Gender */}
              {step === 1 && (
                <div className="py-4">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">⚧️</div>
                    <h2 className="text-xl md:text-2xl font-bold text-white/90 mb-2">Giới tính của bạn</h2>
                    <p className="text-white/45 text-sm">Giúp AI đề xuất trang phục phù hợp hơn</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                    <button
                      type="button"
                      onClick={() => setGender("male")}
                      className={`rounded-2xl p-6 text-center transition-all duration-300 border
                        ${gender === "male"
                          ? "bg-indigo-500/15 border-indigo-400/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                          : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14]"
                        }`}
                    >
                      <div className="text-3xl mb-2">👨</div>
                      <div className={`font-semibold ${gender === "male" ? "text-white" : "text-white/60"}`}>Nam</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("female")}
                      className={`rounded-2xl p-6 text-center transition-all duration-300 border
                        ${gender === "female"
                          ? "bg-fuchsia-500/15 border-fuchsia-400/40 shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                          : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14]"
                        }`}
                    >
                      <div className="text-3xl mb-2">👩</div>
                      <div className={`font-semibold ${gender === "female" ? "text-white" : "text-white/60"}`}>Nữ</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Basic Info */}
              {step === 2 && (
                <div className="py-4">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">📝</div>
                    <h2 className="text-xl md:text-2xl font-bold text-white/90 mb-2">Thông tin cơ bản</h2>
                    <p className="text-white/45 text-sm">Nhập tuổi, chiều cao và cân nặng của bạn</p>
                  </div>
                  <div className="space-y-5 max-w-sm mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        🎂 Tuổi <span className="text-white/30">(10–100)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={age}
                        onChange={(e) => setAge(e.target.value === "" ? 18 : Number(e.target.value))}
                        className="cy-num w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-3 text-lg font-semibold text-white
                          outline-none focus:border-indigo-400/50 focus:bg-white/[0.07] transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        📏 Chiều cao <span className="text-white/30">(100–230 cm)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value === "" ? 165 : Number(e.target.value))}
                          className="cy-num w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-3 pr-14 text-lg font-semibold text-white
                            outline-none focus:border-indigo-400/50 focus:bg-white/[0.07] transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 font-medium">cm</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        ⚖️ Cân nặng <span className="text-white/30">(25–200 kg)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value === "" ? 55 : Number(e.target.value))}
                          className="cy-num w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-3 pr-14 text-lg font-semibold text-white
                            outline-none focus:border-indigo-400/50 focus:bg-white/[0.07] transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 font-medium">kg</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Measurements (optional) */}
              {step === 3 && (
                <div className="py-4">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-3">📐</div>
                    <h2 className="text-xl md:text-2xl font-bold text-white/90 mb-2">Số đo 3 vòng</h2>
                    <p className="text-white/45 text-sm">Tuỳ chọn — bỏ qua nếu bạn không biết chính xác</p>
                  </div>
                  <div className="space-y-5 max-w-sm mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Vòng 1 (Bust) <span className="text-white/30">cm</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={bustCm}
                        placeholder="Bỏ trống nếu không biết"
                        onChange={(e) => setBustCm(e.target.value === "" ? "" : Number(e.target.value))}
                        className="cy-num w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-3 text-lg font-semibold text-white
                          outline-none focus:border-indigo-400/50 focus:bg-white/[0.07] transition-all placeholder:text-white/25 placeholder:font-normal placeholder:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Vòng 2 (Waist) <span className="text-white/30">cm</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={waistCm}
                        placeholder="Bỏ trống nếu không biết"
                        onChange={(e) => setWaistCm(e.target.value === "" ? "" : Number(e.target.value))}
                        className="cy-num w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-3 text-lg font-semibold text-white
                          outline-none focus:border-indigo-400/50 focus:bg-white/[0.07] transition-all placeholder:text-white/25 placeholder:font-normal placeholder:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/60 mb-2">
                        Vòng 3 (Hip) <span className="text-white/30">cm</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={hipCm}
                        placeholder="Bỏ trống nếu không biết"
                        onChange={(e) => setHipCm(e.target.value === "" ? "" : Number(e.target.value))}
                        className="cy-num w-full rounded-xl bg-white/[0.05] border border-white/[0.10] px-4 py-3 text-lg font-semibold text-white
                          outline-none focus:border-indigo-400/50 focus:bg-white/[0.07] transition-all placeholder:text-white/25 placeholder:font-normal placeholder:text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/[0.06]">
                <button
                  onClick={prevStep}
                  disabled={step === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.10] bg-white/[0.04] text-white/70
                    hover:bg-white/[0.08] hover:border-white/[0.18] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Quay lại
                </button>

                <button
                  onClick={nextStep}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all
                    border border-cyan-300/25 bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/30 to-cyan-400/25
                    hover:border-cyan-300/40 hover:shadow-[0_8px_24px_rgba(99,102,241,0.2)]
                    disabled:opacity-50 disabled:cursor-not-allowed text-white"
                >
                  {saving ? "Đang lưu..." : step === STEPS.length - 1 ? "Hoàn tất ✓" : "Tiếp tục →"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Skip link for step 3 */}
        {step === 3 && (
          <div className="text-center mt-4">
            <button
              onClick={onSave}
              disabled={saving}
              className="text-sm text-white/40 hover:text-white/60 transition-colors underline underline-offset-4"
            >
              Bỏ qua, lưu và tiếp tục
            </button>
          </div>
        )}
      </div>
      <AlertModal isOpen={!!alertMsg} message={alertMsg} onClose={() => setAlertMsg("")} />
    </div>
  );
}
