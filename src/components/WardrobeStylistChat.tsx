"use client";

import { useState } from "react";
import type { OutfitResponse } from "@/lib/outfitSchema";

type ApiError = { error?: string; message?: string; details?: any };

export default function WardrobeStylistChat() {
  const [occasion, setOccasion] = useState("Đi học");
  const [style, setStyle] = useState("Basic");
  const [data, setData] = useState<OutfitResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setErr(null);
    setData(null);

    try {
      // TODO: thay bằng token firebase thật nếu route yêu cầu auth
      const idToken = "TEST";

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout để khỏi treo 30s

      const res = await fetch("/api/outfit-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ occasion, style }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await res.text();

      // nếu server trả html (error page), text sẽ không parse JSON được
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`API không trả JSON. Raw: ${text.slice(0, 200)}`);
      }

      if (!res.ok) {
        const e = json as ApiError;
        throw new Error(e?.message || e?.error || `API error ${res.status}`);
      }

      // ✅ validate shape tối thiểu để tránh crash
      if (!json || !json.weather || typeof json.weather.tempC !== "number") {
        throw new Error(
          "API trả về thiếu 'weather'. Mở DevTools > Network > outfit-suggest để xem response."
        );
      }

      setData(json as OutfitResponse);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setErr("Request quá lâu (timeout). Thử lại hoặc kiểm tra API key/mạng.");
      } else {
        setErr(e?.message ?? "Lỗi không xác định");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="text-sm text-gray-600">Đi đâu?</label>
          <input
            className="w-full rounded-xl border p-3 outline-none focus:ring-2"
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="Ví dụ: Đi học / Đi chơi / Hẹn hò"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="text-sm text-gray-600">Phong cách</label>
          <input
            className="w-full rounded-xl border p-3 outline-none focus:ring-2"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Basic / Street / Formal..."
          />
        </div>

        <div className="sm:col-span-1 flex items-end">
          <button
            onClick={ask}
            disabled={loading}
            className="w-full rounded-xl bg-black text-white p-3 font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {loading ? "Đang gợi ý..." : "Gợi ý outfit"}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <b>Lỗi:</b> {err}
        </div>
      )}

      {/* ✅ Chỉ render khi data.weather tồn tại */}
      {data?.weather && (
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-sm text-gray-600">
            Thời tiết:{" "}
            <b>
              {data.weather.tempC}°C (cảm giác {data.weather.feelsLikeC}°C)
            </b>{" "}
            • {data.weather.condition} • mưa {data.weather.rainMm}mm • gió{" "}
            {data.weather.windKmh}km/h
          </div>
        </div>
      )}

      {data && !data.needMoreInfo && (
        <div className="grid gap-4">
          {data.options?.map((op, idx) => (
            <div key={idx} className="rounded-2xl border bg-white p-5">
              <div className="text-lg font-semibold">{op.title}</div>
              <div className="text-gray-600 mt-1">{op.why}</div>

              <ul className="mt-3 list-disc pl-5 space-y-1">
                {op.pieces?.map((p, i) => (
                  <li key={i}>
                    <b>{p.slot}</b>: {p.name}{" "}
                    <span className="text-gray-500">({p.source})</span> —{" "}
                    <span className="text-gray-700">{p.note}</span>
                  </li>
                ))}
              </ul>

              {!!op.do?.length && (
                <div className="mt-3 text-sm">
                  <b>Do:</b> {op.do.join(" • ")}
                </div>
              )}
              {!!op.dont?.length && (
                <div className="mt-1 text-sm">
                  <b>Don’t:</b> {op.dont.join(" • ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.needMoreInfo && (
        <div className="rounded-xl border bg-white p-4">
          <b>Cần thêm thông tin:</b> {data.question}
        </div>
      )}
    </div>
  );
}
