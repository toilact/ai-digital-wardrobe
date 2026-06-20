import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; content: string; ts: number; images?: string[] };
type ChatConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Msg[];
};

const DEFAULT_CONVERSATION_TITLE = "Cuộc trò chuyện mới";
const MAX_STORED_CONVERSATIONS = 12;
const MAX_MESSAGES_PER_CONVERSATION = 40;
const WELCOME_MESSAGE =
  "Xin chào! Mình là stylist AI 👗✨\nBạn muốn phối đồ cho dịp nào? (đi học / đi chơi / đi làm / hẹn hò / đi sự kiện…)\nGợi ý: nói thêm thời tiết, địa điểm, phong cách bạn thích.";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1];
}

function createWelcomeMessage(ts = Date.now()): Msg {
  return {
    id: uid(),
    role: "assistant",
    ts,
    content: WELCOME_MESSAGE,
  };
}

function normalizeMessage(raw: unknown): Msg | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Partial<Msg>;
  if (typeof source.content !== "string") return null;

  const images = Array.isArray(source.images)
    ? source.images.filter((image): image is string => typeof image === "string" && image.trim().length > 0)
    : undefined;

  return {
    id: typeof source.id === "string" && source.id ? source.id : uid(),
    role: source.role === "user" ? "user" : "assistant",
    content: source.content,
    ts: typeof source.ts === "number" ? source.ts : Date.now(),
    ...(images && images.length > 0 ? { images } : {}),
  };
}

function normalizeConversation(raw: unknown): ChatConversation | null {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Partial<ChatConversation>;
  const messages = Array.isArray(source.messages)
    ? source.messages
        .map((message) => normalizeMessage(message))
        .filter((message): message is Msg => message !== null)
        .slice(-MAX_MESSAGES_PER_CONVERSATION)
    : [];

  const updatedAt = typeof source.updatedAt === "number" ? source.updatedAt : Date.now();
  const createdAt = typeof source.createdAt === "number" ? source.createdAt : updatedAt;

  return {
    id: typeof source.id === "string" && source.id ? source.id : uid(),
    title:
      typeof source.title === "string" && source.title.trim().length > 0
        ? source.title.trim()
        : DEFAULT_CONVERSATION_TITLE,
    createdAt,
    updatedAt,
    messages: messages.length > 0 ? messages : [createWelcomeMessage(updatedAt)],
  };
}

function normalizeConversations(raw: unknown) {
  return Array.isArray(raw)
    ? raw
        .map((conversation) => normalizeConversation(conversation))
        .filter((conversation): conversation is ChatConversation => conversation !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, MAX_STORED_CONVERSATIONS)
    : [];
}

export async function GET(req: Request) {
  try {
    const admin = getAdmin();
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
    }

    const { uid } = await admin.auth().verifyIdToken(token);
    const snap = await admin.firestore().collection("chatHistories").doc(uid).get();
    const conversations = normalizeConversations(snap.data()?.conversations);

    return NextResponse.json({ ok: true, conversations });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Load history failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = getAdmin();
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
    }

    const { uid } = await admin.auth().verifyIdToken(token);
    const body = await req.json();
    const conversations = normalizeConversations(body?.conversations);
    const docRef = admin.firestore().collection("chatHistories").doc(uid);
    const existing = await docRef.get();

    await docRef.set(
      {
        uid,
        conversations,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: existing.exists ? existing.data()?.createdAt ?? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Save history failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
