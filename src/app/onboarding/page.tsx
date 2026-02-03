"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getUserProfile, upsertUserProfile } from "@/lib/profile";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);

  const [age, setAge] = useState<number>(18);
  const [heightCm, setHeightCm] = useState<number>(165);
  const [weightKg, setWeightKg] = useState<number>(55);
  const [bustCm, setBustCm] = useState<number | "">("");
  const [waistCm, setWaistCm] = useState<number | "">("");
  const [hipCm, setHipCm] = useState<number | "">("");

  // Nếu chưa login -> về /
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // Nếu đã có profile -> về dashboard
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (profile) {
        router.replace("/dashboard");
        return;
      }
      setChecking(false);
    };
    if (!loading && user) run();
  }, [loading, user, router]);

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
        bustCm: bustCm === "" ? undefined : bustCm,
        waistCm: waistCm === "" ? undefined : waistCm,
        hipCm: hipCm === "" ? undefined : hipCm,
      });
      router.replace("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Lưu thông tin thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || checking) return <div className="p-6">Loading...</div>;
  if (!user) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Cá nhân hoá lần đầu</h1>
        <p className="text-sm text-gray-600">
          Nhập thông tin để AI gợi ý size/phối đồ chính xác hơn.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Tuổi
            <input
              type="number"
              className="mt-1 w-full border rounded px-3 py-2"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
            />
          </label>

          <label className="text-sm">
            Chiều cao (cm)
            <input
              type="number"
              className="mt-1 w-full border rounded px-3 py-2"
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
            />
          </label>

          <label className="text-sm col-span-2">
            Cân nặng (kg)
            <input
              type="number"
              className="mt-1 w-full border rounded px-3 py-2"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="pt-2 border-t space-y-2">
          <p className="text-sm font-medium">Số đo 3 vòng (tuỳ chọn)</p>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">
              Vòng 1
              <input
                type="number"
                className="mt-1 w-full border rounded px-3 py-2"
                value={bustCm}
                onChange={(e) => setBustCm(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </label>

            <label className="text-sm">
              Vòng 2
              <input
                type="number"
                className="mt-1 w-full border rounded px-3 py-2"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </label>

            <label className="text-sm">
              Vòng 3
              <input
                type="number"
                className="mt-1 w-full border rounded px-3 py-2"
                value={hipCm}
                onChange={(e) => setHipCm(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu & Tiếp tục"}
        </button>
      </div>
    </main>
  );
}
