"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { UserProfile } from "firebase/auth";
import { he } from "zod/locales";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; ts: number; images?: string[] };

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function cls(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

export default function WardrobeStylistChat({
  mode = "page",
  open = true,
  idUser,
  onClose,
}: {
  mode?: "page" | "drawer";
  open?: boolean;
  idUser: string;
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
  const [showWardrobeSelector, setShowWardrobeSelector] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState<Array<any>>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

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
          selectedItemIds: Object.keys(selectedIds).filter((k) => selectedIds[k]),
          idUser: idUser,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Request failed");

      // XỬ LÝ ẢNH TRẢ VỀ: ƯU TIÊN URL TRỰC TIẾP
      if (data?.reply?.images && Array.isArray(data.reply.images)) {
        const imgs = data.reply.images
          .map((it: any) => {
            if (it.url) return it.url; // Nhanh, nhẹ, dùng luôn URL
            // if (it.png_base64) return `data:image/png;base64,${it.png_base64}`; // Dự phòng Base64
            return null;
          })
          .filter(Boolean);

        const botMsg: Msg = {
          id: uid(),
          role: "assistant",
          content: (data.reply?.note as string) || "Mình đã tạo ảnh outfit cho bạn.",
          images: imgs,
          ts: Date.now(),
        };
        setMessages((m) => [...m, botMsg]);
      } else {
        const botMsg: Msg = {
          id: uid(),
          role: "assistant",
          content: typeof data.reply === 'object' ? (data.reply.note || "") : String(data.reply),
          ts: Date.now(),
        };
        setMessages((m) => [...m, botMsg]);
      }
    } catch (e: any) {
      let message = ""
      if (e?.code === 503) {
        message = "AI đang bận, bạn thử lại sau nhé!";
      }
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          ts: Date.now(),
          content:
            "Mình gặp lỗi khi gọi AI 😥\n" +
            `Chi tiết: ${message || e?.message || "unknown error"}\n`
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


  /*

  
  */

  const shell = (
    <div className="relative h-full flex flex-col rounded-3xl  border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_22px_70px_rgba(0,0,0,.55)] overflow-hidden">
      {/* grid + scanline */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="cy-scanline pointer-events-none absolute inset-0" />

      {/* header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
        <button
          onClick={() => {
            if (onClose) return onClose();
            if (typeof window !== 'undefined') window.history.back();
          }}
          className="text-white/80 hover:text-white transition"
          title="Quay lại"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
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
              {m.images && m.images.length ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {m.images.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={src}
                      alt={`outfit-${i}`}
                      className="w-full h-40 object-contain rounded bg-white/5"
                      onError={(e) => {
                        console.error("Lỗi tải ảnh từ URL:", src);
                        e.currentTarget.style.display = 'none'; // Ẩn ảnh nếu lỗi
                      }}
                    />
                  ))}
                </div>
              ) : null}
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

      {/* chips */}
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

      {/* Selected items row */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {Object.keys(selectedIds)
            .filter((k) => selectedIds[k])
            .map((id) => {
              const it = wardrobeItems.find((w) => w.id === id);
              return (
                <div key={id} className="flex items-center gap-2 bg-white/5 p-1 rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it?.imageUrl} alt={it?.category || "item"} className="w-12 h-12 object-contain rounded" />
                  <button onClick={() => toggleSelect(id)} className="text-xs px-2 py-1 rounded bg-red-600/70">x</button>
                </div>
              );
            })}
        </div>
      </div>

      {/* composer */}
      <div className="px-5 py-4 border-t border-white/10 bg-[linear-gradient(to_top,rgba(8,10,18,.78),rgba(8,10,18,.22))] backdrop-blur-xl">

        <div className="flex gap-3 items-end">
          <button
            onClick={() => openWardrobeSelector()}
            title="Chọn đồ"
            className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 7h18v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 7V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

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

  // Wardrobe selector modal (simple)
  async function openWardrobeSelector() {
    setShowWardrobeSelector(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch("/api/wardrobe/list", {
        headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
      });
      const j = await res.json();
      if (res.ok && j?.ok && Array.isArray(j.items)) {
        setWardrobeItems(j.items);
      } else if (res.ok && j?.items) {
        setWardrobeItems(j.items);
      } else {
        setWardrobeItems([]);
      }
    } catch (e) {
      console.error(e);
      setWardrobeItems([]);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  }

  if (mode === "drawer") {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-[560px] p-4 md:p-6">{shell}</div>

        {showWardrobeSelector ? (
          <div className="fixed inset-0 z-90">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowWardrobeSelector(false)} />
            <div className="absolute left-1/2 top-1/2 w-[720px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 p-4 bg-neutral-900 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white font-semibold">Chọn đồ từ tủ</div>
                <div className="text-sm text-white/60">Chọn nhiều mục</div>
              </div>
              <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-auto pb-3">
                {wardrobeItems.map((it) => (
                  <div key={it.id} className="p-2 bg-white/5 rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.imageUrl} alt="item" className="w-full h-28 object-contain" />
                    <div className="mt-2 flex items-center justify-between">
                      <label className="text-xs text-white/80">{it.category || "item"}</label>
                      <input type="checkbox" checked={!!selectedIds[it.id]} onChange={() => toggleSelect(it.id)} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowWardrobeSelector(false)} className="px-3 py-2 rounded border border-white/10">Huỷ</button>
                <button onClick={() => setShowWardrobeSelector(false)} className="px-3 py-2 rounded bg-cyan-500">Xong</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // page mode: full screen, không padding gây scroll w-full
  return (
    <div className="w-full h-[100svh] overflow-hidden p-4 md:p-6">{shell}
      {showWardrobeSelector ? (
        <div className="fixed inset-0 z-90">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowWardrobeSelector(false)} />
          <div className="absolute left-1/2 top-1/2 w-[720px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 p-4 bg-neutral-900 border border-white/10 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">Chọn đồ từ tủ</div>
              <div className="text-sm text-white/60">Chọn nhiều mục</div>
            </div>
            <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-auto pb-3">
              {wardrobeItems.map((it) => (
                <div key={it.id} className="p-2 bg-white/5 rounded">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.imageUrl} alt="item" className="w-full h-28 object-contain" />
                  <div className="mt-2 flex items-center justify-between">
                    <label className="text-xs text-white/80">{it.category || "item"}</label>
                    <input type="checkbox" checked={!!selectedIds[it.id]} onChange={() => toggleSelect(it.id)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowWardrobeSelector(false)} className="px-3 py-2 rounded border border-white/10">Huỷ</button>
              <button onClick={() => setShowWardrobeSelector(false)} className="px-3 py-2 rounded bg-cyan-500">Xong</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

