"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; ts: number; images?: string[] };
type ChatConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};
type StoredMessage = Partial<Msg>;
type StoredConversation = Partial<ChatConversation> & { messages?: StoredMessage[] };
type WardrobeItem = { id: string; imageUrl?: string; category?: string };
type RequestError = Error & { status?: number; code?: number | string };
type ReplyPayload = {
  note?: string;
  images?: Array<{ url?: string }>;
  intent?: string;
  stage?: string;
};
type StreamChunk = {
  stage?: string;
  ok?: boolean;
  message?: string;
  reply?: string | ReplyPayload;
};

const CHAT_HISTORY_STORAGE_PREFIX = "wardrobe-stylist-history";
const DEFAULT_CONVERSATION_TITLE = "Cuộc trò chuyện mới";
const MAX_STORED_CONVERSATIONS = 12;
const WELCOME_MESSAGE =
  "Xin chào! Mình là stylist AI 👗✨\nBạn muốn phối đồ cho dịp nào? (đi học / đi chơi / đi làm / hẹn hò / đi sự kiện…)\nGợi ý: nói thêm thời tiết, địa điểm, phong cách bạn thích.";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function cls(...s: Array<string | false | undefined | null>) {
  return s.filter(Boolean).join(" ");
}

function createWelcomeMessage(ts = Date.now()): Msg {
  return {
    id: uid(),
    role: "assistant",
    ts,
    content: WELCOME_MESSAGE,
  };
}

function createConversation(): ChatConversation {
  const now = Date.now();
  return {
    id: uid(),
    title: DEFAULT_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage(now)],
  };
}

function getStorageKey(idUser: string) {
  return `${CHAT_HISTORY_STORAGE_PREFIX}:${idUser}`;
}

function getConversationTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return DEFAULT_CONVERSATION_TITLE;
  return normalized.length > 48 ? `${normalized.slice(0, 48).trim()}...` : normalized;
}

function getConversationPreview(conversation: ChatConversation) {
  const lastMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "user" || message.content !== WELCOME_MESSAGE);

  if (!lastMessage) return "Bắt đầu cuộc trò chuyện mới";

  const preview = lastMessage.content.replace(/\s+/g, " ").trim();
  return preview.length > 72 ? `${preview.slice(0, 72).trim()}...` : preview;
}

function formatConversationTime(ts: number) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

function normalizeStoredMessage(raw: StoredMessage | undefined): Msg | null {
  if (!raw || typeof raw.content !== "string") return null;

  const role: Role = raw.role === "user" ? "user" : "assistant";
  const images = Array.isArray(raw.images)
    ? raw.images.filter((image: unknown): image is string => typeof image === "string" && image.trim().length > 0)
    : undefined;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    role,
    content: raw.content,
    ts: typeof raw.ts === "number" ? raw.ts : Date.now(),
    ...(images && images.length > 0 ? { images } : {}),
  };
}

function normalizeStoredConversation(raw: StoredConversation | undefined): ChatConversation | null {
  if (!raw || typeof raw !== "object") return null;

  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .map((message: unknown) => normalizeStoredMessage(message))
        .filter((message): message is Msg => message !== null)
    : [];

  const updatedAt = typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now();
  const createdAt = typeof raw.createdAt === "number" ? raw.createdAt : updatedAt;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    title:
      typeof raw.title === "string" && raw.title.trim().length > 0
        ? raw.title.trim()
        : DEFAULT_CONVERSATION_TITLE,
    createdAt,
    updatedAt,
    messages: messages.length > 0 ? messages : [createWelcomeMessage(updatedAt)],
  };
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

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [historyReady, setHistoryReady] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"thinking" | "analyzing_clothes" | "generating_outfit" | null>(null);
  const [showWardrobeSelector, setShowWardrobeSelector] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [showAllSelectedItemsModal, setShowAllSelectedItemsModal] = useState(false);
  const [modalImages, setModalImages] = useState<string[] | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

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

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? conversations[0] ?? null,
    [activeConversationId, conversations]
  );

  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation]);
  const activeConversationTitle = activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, loadingStage]);

  useEffect(() => {
    if (mode === "drawer" && !open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [mode, open, activeConversationId]);

  useEffect(() => {
    setHistoryReady(false);
    setConversations([]);
    setActiveConversationId("");

    if (typeof window === "undefined" || !idUser) {
      const fallbackConversation = createConversation();
      setConversations([fallbackConversation]);
      setActiveConversationId(fallbackConversation.id);
      setHistoryReady(true);
      return;
    }

    try {
      const raw = window.localStorage.getItem(getStorageKey(idUser));
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      const restored = Array.isArray(parsed)
        ? parsed
            .map((conversation: unknown) => normalizeStoredConversation(conversation))
            .filter((conversation): conversation is ChatConversation => conversation !== null)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_STORED_CONVERSATIONS)
        : [];

      const nextConversations = restored.length > 0 ? restored : [createConversation()];
      setConversations(nextConversations);
      setActiveConversationId(nextConversations[0].id);
    } catch (error) {
      console.error("Không thể tải lịch sử chat:", error);
      const fallbackConversation = createConversation();
      setConversations([fallbackConversation]);
      setActiveConversationId(fallbackConversation.id);
    } finally {
      setHistoryReady(true);
    }
  }, [idUser]);

  useEffect(() => {
    if (!historyReady || typeof window === "undefined" || !idUser || conversations.length === 0) return;

    const payload = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_STORED_CONVERSATIONS);

    window.localStorage.setItem(getStorageKey(idUser), JSON.stringify(payload));
  }, [conversations, historyReady, idUser]);

  useEffect(() => {
    if (activeConversation || conversations.length === 0) return;
    setActiveConversationId(conversations[0].id);
  }, [activeConversation, conversations]);

  function updateConversation(
    conversationId: string,
    updater: (conversation: ChatConversation) => ChatConversation
  ) {
    setConversations((currentConversations) =>
      currentConversations
        .map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          return updater(conversation);
        })
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_STORED_CONVERSATIONS)
    );
  }

  function appendMessageToConversation(conversationId: string, message: Msg) {
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title:
        conversation.title === DEFAULT_CONVERSATION_TITLE && message.role === "user"
          ? getConversationTitle(message.content)
          : conversation.title,
      updatedAt: message.ts,
      messages: [...conversation.messages, message],
    }));
  }

  function createNewConversation() {
    if (sending) return;

    const nextConversation = createConversation();
    setConversations((currentConversations) =>
      [nextConversation, ...currentConversations]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_STORED_CONVERSATIONS)
    );
    setActiveConversationId(nextConversation.id);
    setInput("");
    setSelectedIds({});
    setShowHistoryPanel(false);
  }

  function switchConversation(conversationId: string) {
    if (sending || conversationId === activeConversationId) return;
    setActiveConversationId(conversationId);
    setInput("");
    setSelectedIds({});
    setShowHistoryPanel(false);
  }

  async function send(text: string) {
    const content = text.trim();
    const conversationId = activeConversation?.id;

    if (!content || sending || !conversationId || !activeConversation) return;

    const selectedItemIds = Object.keys(selectedIds).filter((key) => selectedIds[key]);
    const selectedImages = selectedItemIds
      .map((id) => {
        const item = wardrobeItems.find((wardrobeItem) => wardrobeItem.id === id);
        return item?.imageUrl;
      })
      .filter(Boolean) as string[];

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content,
      ts: Date.now(),
      ...(selectedImages.length > 0 ? { images: selectedImages } : {}),
    };

    appendMessageToConversation(conversationId, userMsg);
    setInput("");
    setSelectedIds({});
    setSending(true);
    setLoadingStage("thinking");

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
          history: activeConversation.messages.slice(-10).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          selectedItemIds,
          idUser,
        }),
      });

      if (!res.ok) {
        const textResponse = await res.text();
        const error: RequestError = new Error(textResponse || "Network error");
        error.status = res.status;
        throw error;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: StreamChunk | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let parsedChunk: StreamChunk;
            try {
              parsedChunk = JSON.parse(line) as StreamChunk;
            } catch (parseError) {
              console.error("failed to parse chunk", parseError, line);
              continue;
            }

            if (
              parsedChunk.stage === "thinking" ||
              parsedChunk.stage === "analyzing_clothes" ||
              parsedChunk.stage === "generating_outfit"
            ) {
              setLoadingStage(parsedChunk.stage);
            }

            if (parsedChunk.hasOwnProperty("ok") || parsedChunk.reply) {
              finalData = parsedChunk;
            }
          }
        }

        if (done) break;
      }

      const data: StreamChunk = finalData || { ok: false, message: "No data" };
      if (!data.ok) {
        const error: RequestError = new Error(data.message || "Request failed");
        error.status = res.status;
        throw error;
      }

      if (typeof data.reply === "object" && data.reply?.images && Array.isArray(data.reply.images)) {
        const images = data.reply.images
          .map((item) => (item.url ? item.url : null))
          .filter((item): item is string => typeof item === "string" && item.length > 0);

        appendMessageToConversation(conversationId, {
          id: uid(),
          role: "assistant",
          content: data.reply.note || "Mình đã tạo ảnh outfit cho bạn.",
          images,
          ts: Date.now(),
        });
      } else {
        appendMessageToConversation(conversationId, {
          id: uid(),
          role: "assistant",
          content: typeof data.reply === "object" ? data.reply?.note || "" : String(data.reply),
          ts: Date.now(),
        });
      }
    } catch (error: unknown) {
      const requestError = error as RequestError;
      let errorMessage = "";
      let errorIcon = "😥";

      if (requestError?.code === 503 || requestError?.status === 503) {
        errorMessage = "Hiện có nhiều người cùng sử dụng, hãy thử lại sau nhé";
        errorIcon = "⏳";
      } else if (
        requestError?.code === 429 ||
        requestError?.status === 429 ||
        requestError?.message?.includes("quota") ||
        requestError?.message?.includes("hết lượt")
      ) {
        errorMessage = "Hiện đã hết lượt sử dụng, vui lòng quay lại khi khác";
        errorIcon = "🔒";
      } else {
        errorMessage = `Mình gặp lỗi: ${requestError?.message || "unknown error"}`;
      }

      appendMessageToConversation(conversationId, {
        id: uid(),
        role: "assistant",
        ts: Date.now(),
        content: `${errorIcon}\n${errorMessage}`,
      });
      console.error(requestError);
    } finally {
      setSending(false);
      setLoadingStage(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  async function openWardrobeSelector() {
    setShowWardrobeSelector(true);
    try {
      const token = await user?.getIdToken?.();
      const res = await fetch("/api/wardrobe/list", {
        headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) },
      });
      const response = await res.json();
      if (res.ok && response?.ok && Array.isArray(response.items)) {
        setWardrobeItems(response.items);
      } else if (res.ok && response?.items) {
        setWardrobeItems(response.items);
      } else {
        setWardrobeItems([]);
      }
    } catch (error) {
      console.error(error);
      setWardrobeItems([]);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((currentSelection) => ({ ...currentSelection, [id]: !currentSelection[id] }));
  }

  const historyPanel = (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl shadow-[0_22px_70px_rgba(0,0,0,.45)]">
      <div className="flex items-center justify-between gap-3 px-2 py-2">
        <div>
          <div className="text-sm font-semibold text-white/90">Lịch sử trò chuyện</div>
          <div className="text-xs text-white/45">Mỗi user được lưu cục bộ trên trình duyệt này</div>
        </div>
        {mode === "drawer" || showHistoryPanel ? (
          <button
            onClick={() => setShowHistoryPanel(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 hover:bg-white/10 transition"
            title="Đóng lịch sử"
          >
            Đóng
          </button>
        ) : null}
      </div>

      <button
        onClick={createNewConversation}
        disabled={sending}
        className="mt-3 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-cyan-400/20 px-4 py-3 text-left text-sm font-medium text-white/90 hover:border-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-60 transition"
      >
        + Cuộc trò chuyện mới
      </button>

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {sortedConversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId;
          return (
            <button
              key={conversation.id}
              onClick={() => switchConversation(conversation.id)}
              disabled={sending}
              className={cls(
                "w-full rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                isActive
                  ? "border-cyan-300/35 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,.25)]"
                  : "border-white/10 bg-black/20 hover:bg-white/8"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium text-white/90">{conversation.title}</div>
                <div className="shrink-0 text-[11px] text-white/45">{formatConversationTime(conversation.updatedAt)}</div>
              </div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55">
                {getConversationPreview(conversation)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const chatShell = (
    <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_22px_70px_rgba(0,0,0,.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="cy-scanline pointer-events-none absolute inset-0" />

      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => {
              if (onClose) return onClose();
              if (typeof window !== "undefined") window.history.back();
            }}
            className="text-white/80 transition hover:text-white"
            title="Quay lại"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            onClick={() => setShowHistoryPanel(true)}
            className={cls(
              "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition",
              mode === "page" && "lg:hidden"
            )}
          >
            Lịch sử
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <span className="text-sm font-semibold text-white/90">AI</span>
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-white/90">{activeConversationTitle}</div>
              <div className="truncate text-xs text-white/50">Wardrobe Stylist • outfit • weather • style</div>
            </div>
          </div>
        </div>

        {mode === "drawer" ? (
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Đóng
          </button>
        ) : null}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {messages.map((message) => (
          <div key={message.id} className={cls("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cls(
                "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                message.role === "user"
                  ? "border border-white/10 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 text-white/92 shadow-[0_14px_40px_rgba(0,0,0,.35)]"
                  : "border border-white/10 bg-black/30 text-white/80"
              )}
            >
              {message.content}
              {message.images && message.images.length > 0 ? (
                <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {(() => {
                    const maxDisplay = 3;
                    const displayedImages = message.images.slice(0, maxDisplay);
                    const remainingCount = message.images.length - maxDisplay;

                    return (
                      <>
                        {displayedImages.map((src, index) => (
                          <div
                            key={`${message.id}-${index}`}
                            className="group relative flex-shrink-0 cursor-pointer rounded-lg border border-white/10 bg-white/5 p-1"
                            onClick={() => setZoomImage(src)}
                          >
                            <img
                              src={src}
                              alt={`outfit-${index}`}
                              className="h-12 w-12 rounded object-contain transition-transform group-hover:scale-105"
                              onError={(e) => {
                                console.error("Lỗi tải ảnh từ URL:", src);
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        ))}

                        {remainingCount > 0 ? (
                          <button
                            onClick={() => setModalImages(message.images ?? null)}
                            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xs text-white transition hover:bg-white/20"
                            title={`Xem thêm ${remainingCount} ảnh`}
                          >
                            +{remainingCount}
                          </button>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {sending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
              <span className="inline-flex items-center gap-1">
                <span className="dotty" />
                <span className="dotty delay-150" />
                <span className="dotty delay-300" />
              </span>
              <span className="ml-2">
                {loadingStage === "thinking" && "AI đang suy nghĩ…"}
                {loadingStage === "analyzing_clothes" && "AI đang phân tích đồ của bạn…"}
                {loadingStage === "generating_outfit" && "AI đang tạo outfit…"}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-5 pb-3">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => send(chip)}
              disabled={sending}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              title={chip}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(() => {
            const selectedItemIds = Object.keys(selectedIds).filter((key) => selectedIds[key]);
            if (selectedItemIds.length === 0) return null;

            const maxDisplay = 3;
            const displayedIds = selectedItemIds.slice(0, maxDisplay);
            const remainingCount = selectedItemIds.length - maxDisplay;

            return (
              <>
                {displayedIds.map((id) => {
                  const item = wardrobeItems.find((wardrobeItem) => wardrobeItem.id === id);
                  return (
                    <div key={id} className="group relative flex-shrink-0 rounded-lg border border-white/10 bg-white/5 p-1">
                      <img src={item?.imageUrl} alt={item?.category || "item"} className="h-12 w-12 rounded object-contain" />
                      <button
                        onClick={() => toggleSelect(id)}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white opacity-100 shadow-sm transition-opacity"
                        title="Bỏ chọn"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}

                {remainingCount > 0 ? (
                  <button
                    onClick={() => setShowAllSelectedItemsModal(true)}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xs text-white transition hover:bg-white/20"
                    title={`Xem thêm ${remainingCount} món đồ đã chọn`}
                  >
                    +{remainingCount}
                  </button>
                ) : null}
              </>
            );
          })()}
        </div>
      </div>

      <div className="border-t border-white/10 bg-[linear-gradient(to_top,rgba(8,10,18,.78),rgba(8,10,18,.22))] px-5 py-4 backdrop-blur-xl">
        <div className="flex items-end gap-3">
          <button
            onClick={openWardrobeSelector}
            title="Chọn đồ"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
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
            className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/25 to-cyan-400/20 px-4 py-3 font-semibold transition hover:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-60"
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

  const allSelectedModal = showAllSelectedItemsModal ? (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAllSelectedItemsModal(false)} />
      <div className="absolute left-1/2 top-1/2 w-[480px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">
            Đồ đã chọn ({Object.keys(selectedIds).filter((key) => selectedIds[key]).length})
          </div>
          <button onClick={() => setShowAllSelectedItemsModal(false)} className="text-white/50 transition hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-auto pb-3 no-scrollbar sm:grid-cols-4">
          {Object.keys(selectedIds)
            .filter((key) => selectedIds[key])
            .map((id) => {
              const item = wardrobeItems.find((wardrobeItem) => wardrobeItem.id === id);
              if (!item) return null;

              return (
                <div key={id} className="group relative rounded-xl border border-white/10 bg-white/5 p-2">
                  <img src={item.imageUrl} alt={item.category || "item"} className="h-20 w-full object-contain" />
                  <button
                    onClick={() => toggleSelect(id)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#121212] bg-red-500 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                    title="Bỏ chọn"
                  >
                    ×
                  </button>
                  <div className="mt-1 truncate text-center text-[10px] text-white/70">{item.category || "Item"}</div>
                </div>
              );
            })}
        </div>

        <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
          <button
            onClick={() => setShowAllSelectedItemsModal(false)}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const messageImagesModal = modalImages && modalImages.length > 0 ? (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalImages(null)} />
      <div className="absolute left-1/2 top-1/2 w-[480px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold text-white">Ảnh trong tin nhắn ({modalImages.length})</div>
          <button onClick={() => setModalImages(null)} className="text-white/50 transition hover:text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-auto pb-3 no-scrollbar sm:grid-cols-3">
          {modalImages.map((src, index) => (
            <div key={index} className="relative rounded-xl border border-white/10 bg-white/5 p-2">
              <img src={src} alt="item" className="h-32 w-full object-contain" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end border-t border-white/10 pt-3">
          <button
            onClick={() => setModalImages(null)}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const zoomImageModal = zoomImage ? (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setZoomImage(null)} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col items-center justify-center">
        <button
          onClick={() => setZoomImage(null)}
          className="absolute -right-4 -top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-lg transition hover:bg-white/20 md:-right-6 md:-top-6"
          title="Đóng"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <img
          src={zoomImage}
          alt="zoomed-outfit"
          className="max-h-[85vh] w-full rounded-xl border border-white/10 bg-black object-contain shadow-2xl"
        />
      </div>
    </div>
  ) : null;

  const wardrobeSelectorModal = showWardrobeSelector ? (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/70" onClick={() => setShowWardrobeSelector(false)} />
      <div className="absolute left-1/2 top-1/2 w-[720px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-neutral-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold text-white">Chọn đồ từ tủ</div>
          <div className="text-sm text-white/60">Chọn nhiều mục</div>
        </div>

        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-auto pb-3 sm:grid-cols-3 lg:grid-cols-4">
          {wardrobeItems.map((item) => {
            const isSelected = !!selectedIds[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={cls(
                  "cursor-pointer rounded border p-2 transition-all duration-200",
                  isSelected
                    ? "border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className="relative">
                  <img src={item.imageUrl} alt="item" className="h-28 w-full object-contain" />
                  {isSelected ? (
                    <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs text-white shadow-md">
                      ✓
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 text-center">
                  <div className="pointer-events-none text-xs font-medium text-white/90">{item.category || "item"}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2 border-t border-white/10 pt-4">
          <button
            onClick={() => setShowWardrobeSelector(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 transition hover:bg-white/10"
          >
            Huỷ
          </button>
          <button
            onClick={() => setShowWardrobeSelector(false)}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(56,189,248,0.2)] transition hover:opacity-90"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (!historyReady || !activeConversation) {
    const loadingShell = (
      <div className="flex h-full items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white/70 backdrop-blur-xl">
        Đang tải lịch sử trò chuyện...
      </div>
    );

    if (mode === "drawer") {
      return (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
          <div className="absolute right-0 top-0 h-full w-full max-w-[560px] p-4 md:p-6">{loadingShell}</div>
        </div>
      );
    }

    return <div className="h-[100svh] w-full overflow-hidden p-4 md:p-6">{loadingShell}</div>;
  }

  const content = (
    <div className="flex h-full gap-4">
      {mode === "page" ? <div className="hidden h-full w-[290px] flex-shrink-0 lg:block">{historyPanel}</div> : null}
      {chatShell}

      {showHistoryPanel ? (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistoryPanel(false)} />
          <div className="absolute left-0 top-0 h-full w-[320px] max-w-[88vw] p-4">{historyPanel}</div>
        </div>
      ) : null}
    </div>
  );

  if (mode === "drawer") {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[80]">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
        <div className="absolute right-0 top-0 h-full w-full max-w-[560px] p-4 md:p-6">{content}</div>
        {allSelectedModal}
        {messageImagesModal}
        {zoomImageModal}
        {wardrobeSelectorModal}
      </div>
    );
  }

  return (
    <div className="h-[100svh] w-full overflow-hidden p-4 md:p-6">
      {content}
      {allSelectedModal}
      {messageImagesModal}
      {zoomImageModal}
      {wardrobeSelectorModal}
    </div>
  );
}
