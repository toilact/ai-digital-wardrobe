"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; ts: number };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function cls(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

export default function WardrobeStylistChat({
  mode = "page",
  open = true,
  onClose,
}: {
  mode?: "page" | "drawer";
  open?: boolean;
  onClose?: () => void;
}) {
  const { user } = useAuth();

  const [messages, setMessages] = useState<Msg[]>(() => [
    {
      id: uid(),
      role: "assistant",
      ts: Date.now(),
      content:
        "Xin chào! Mình là stylist AI 👗✨\nBạn muốn phối đồ cho dịp nào? (đi học / đi chơi / đi làm / hẹn hò / đi sự kiện…)\nGợi ý: nói thêm thời tiết, địa điểm, phong cách bạn thích.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const quickChips = useMemo(
    () => [
      "Gợi ý outfit đi học (gọn gàng, dễ thương)",
      "Hôm nay trời nóng, mặc gì cho mát?",
      "Đi chơi tối, style ngầu nhẹ",
      "Trời mưa, phối đồ không bẩn giày",
      "Phối đồ trắng/đen tối giản",
    ],
    []
  );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (mode === "drawer" && !open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [mode, open]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;

    const userMsg: Msg = { id: uid(), role: "user", content, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    try {
      const token = await user?.getIdToken?.();
      const res = await fetch("/api/outfit-suggest", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-10).map((x) => ({ role: x.role, content: x.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Request failed");

      const botMsg: Msg = {
        id: uid(),
        role: "assistant",
        content: String(data.reply ?? ""),
        ts: Date.now(),
      };
      setMessages((m) => [...m, botMsg]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          ts: Date.now(),
          content:
            "Mình gặp lỗi khi gọi AI 😥\n" +
            `Chi tiết: ${e?.message || "unknown error"}\n` +
            "Gợi ý: check GEMINI_API_KEY/GEMINI_MODEL, restart dev server, xem log terminal.",
        },
      ]);
      console.error(e);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const shell = (
    <div className="relative h-full flex flex-col rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_22px_70px_rgba(0,0,0,.55)] overflow-hidden">
      {/* grid + scanline */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="cy-scanline pointer-events-none absolute inset-0" />

      {/* header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
            <span className="text-sm font-semibold text-white/90">AI</span>
          </div>
          <div>
            <div className="font-semibold text-white/90">Wardrobe Stylist</div>
            <div className="text-xs text-white/50">Gemini-style chat • outfit • weather • style</div>
          </div>
        </div>

        {mode === "drawer" ? (
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition"
          >
            Đóng
          </button>
        ) : null}
      </div>

      {/* messages */}
      <div ref={listRef} className="px-5 py-5 flex-1 min-h-0 overflow-y-auto space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={cls("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cls(
                "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 border border-white/10 text-white/92 shadow-[0_14px_40px_rgba(0,0,0,.35)]"
                  : "bg-black/30 border border-white/10 text-white/80"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 text-sm bg-black/30 border border-white/10 text-white/70">
              <span className="inline-flex gap-1 items-center">
                <span className="dotty" />
                <span className="dotty delay-150" />
                <span className="dotty delay-300" />
              </span>
              <span className="ml-2">AI đang suy nghĩ…</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* chips: 1 hàng ngang, không làm page cao */}
      <div className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          {quickChips.map((c) => (
            <button
              key={c}
              onClick={() => send(c)}
              className="shrink-0 text-xs px-3 py-2 rounded-full border border-white/10 bg-white/5 text-white/75 hover:bg-white/10 transition"
              title={c}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* composer */}
      <div className="px-5 py-4 border-t border-white/10 bg-[linear-gradient(to_top,rgba(8,10,18,.78),rgba(8,10,18,.22))] backdrop-blur-xl">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nhập yêu cầu… (Enter để gửi, Shift+Enter xuống dòng)"
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/90 outline-none focus:border-cyan-300/35 focus:shadow-[0_0_0_4px_rgba(34,211,238,.10)]"
            rows={2}
          />
          <button
            disabled={sending || !input.trim()}
            onClick={() => send(input)}
            className="rounded-2xl px-4 py-3 font-semibold border border-cyan-300/25
                       bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20
                       hover:border-cyan-300/40 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Gửi
          </button>
        </div>
        <div className="mt-2 text-[11px] text-white/45">
          Tip: nói rõ “đi đâu + thời tiết + style + màu muốn tránh” để AI ra outfit chuẩn.
        </div>
      </div>
    </div>
  );

  if (mode === "drawer") {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-[560px] p-4 md:p-6">{shell}</div>
      </div>
    );
  }

  // page mode: full screen, không padding gây scroll
  return <div className="w-full h-[100svh] overflow-hidden p-4 md:p-6">{shell}</div>;
}