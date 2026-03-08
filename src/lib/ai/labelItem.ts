// src/lib/ai/labelItem.ts
import { z } from "zod";
import crypto from "crypto";

// -----------------------------
// Schemas
// -----------------------------
export const SimpleLabelSchema = z.object({
  category: z.enum(["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"]),
  color: z.string().min(1).max(40).default("Không rõ"), // giữ field để không phá UI/db
  itemName: z.string().min(1).max(80).nullable().default(null),
  confidence: z.number().min(0).max(1).nullable().default(null),
});
export type SimpleLabel = z.infer<typeof SimpleLabelSchema>;

type SimpleLabelHints = {
  categoryHint?: string;
  colorHint?: string;
  confidenceHint?: number | null;
};

// -----------------------------
// Small in-memory cache (LRU-ish)
// -----------------------------
const SIMPLE_LABEL_CACHE_MAX = 500;
const simpleLabelCache = new Map<string, { value: SimpleLabel; ts: number }>();

function cacheKeyOf(pngBase64: string, hints: SimpleLabelHints) {
  const h = crypto
    .createHash("sha1")
    .update(pngBase64)
    .update("|")
    .update(String(hints.categoryHint ?? ""))
    .update("|")
    .update(String(hints.colorHint ?? ""))
    .digest("hex");
  return `label:simple:v2:${h}`;
}

function cacheGet(k: string): SimpleLabel | null {
  const x = simpleLabelCache.get(k);
  if (!x) return null;
  // 24h TTL
  if (Date.now() - x.ts > 24 * 60 * 60 * 1000) {
    simpleLabelCache.delete(k);
    return null;
  }
  // refresh LRU
  simpleLabelCache.delete(k);
  simpleLabelCache.set(k, x);
  return x.value;
}

function cacheSet(k: string, v: SimpleLabel) {
  if (simpleLabelCache.has(k)) simpleLabelCache.delete(k);
  simpleLabelCache.set(k, { value: v, ts: Date.now() });
  while (simpleLabelCache.size > SIMPLE_LABEL_CACHE_MAX) {
    const firstKey = simpleLabelCache.keys().next().value;
    if (!firstKey) break;
    simpleLabelCache.delete(firstKey);
  }
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
const AI_LABEL_URL = process.env.AI_LABEL_URL || `${AI_SERVICE_URL}/label`;

const ALLOWED_CATS = new Set(["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"]);
function safeCat(x: any): SimpleLabel["category"] | undefined {
  return typeof x === "string" && ALLOWED_CATS.has(x) ? (x as any) : undefined;
}

async function callAiServiceLabel(pngBase64: string) {
  const res = await fetch(AI_LABEL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // include_color = false: bạn muốn chỉ category để nhanh nhất
    body: JSON.stringify({
      image_png_base64: pngBase64,
      backend: process.env.AI_LABEL_BACKEND || "clip",
      include_color: false,
    }),
    // nextjs fetch option:
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const msg = json?.message || `AI label failed (${res.status})`;
    throw new Error(msg);
  }
  return json?.label as any;
}

// -----------------------------
// Simple label (category only; color kept as "Không rõ" for compatibility)
// -----------------------------
export async function labelWardrobeItemSimpleFromPngBase64(
  pngBase64: string,
  hints: SimpleLabelHints = {}
): Promise<SimpleLabel> {
  const k = cacheKeyOf(pngBase64, hints);
  const cached = cacheGet(k);
  if (cached) return cached;

  // Default fallback from hints
  const hintCategory = safeCat(hints.categoryHint) ?? undefined;
  const hintColor = typeof hints.colorHint === "string" && hints.colorHint.trim() ? hints.colorHint.trim() : undefined;
  const hintConfidence = typeof hints.confidenceHint === "number" ? hints.confidenceHint : null;

  let category: SimpleLabel["category"] = hintCategory ?? "Khác";
  let confidence: number | null = hintConfidence ?? null;

  try {
    const label = await callAiServiceLabel(pngBase64);
    const c = safeCat(label?.category);
    if (c) category = c;
    if (typeof label?.confidence === "number") confidence = label.confidence;
  } catch {
    // keep hint fallback
  }

  const out: SimpleLabel = SimpleLabelSchema.parse({
    category,
    // bạn không muốn phân màu -> giữ "Không rõ", nhưng nếu hints có màu thì giữ lại
    color: hintColor ?? "Không rõ",
    itemName: null,
    confidence,
  });

  cacheSet(k, out);
  return out;
}

// -----------------------------
// Detailed label (placeholder, still returns category + confidence)
// -----------------------------
export const ItemLabelSchema = z.object({
  category: z.enum(["Áo", "Quần", "Váy", "Đầm", "Giày", "Khác"]),
  subcategory: z.string().min(1).max(80),
  layer: z.enum(["base", "mid", "outer", "onepiece", "footwear", "accessory"]),
  colors: z.array(z.string().min(1).max(30)).min(1).max(3),
  pattern: z.string().min(1).max(40),
  material: z.string().min(1).max(40),
  season: z.array(z.enum(["spring", "summer", "autumn", "winter", "all"])).min(1),
  formality: z.enum(["casual", "smartcasual", "formal", "sport"]),
  notes: z.string().max(200).nullable(),
  confidence: z.number().min(0).max(1),
});
export type ItemLabel = z.infer<typeof ItemLabelSchema>;

function defaultLayerForCategory(cat: ItemLabel["category"]): ItemLabel["layer"] {
  switch (cat) {
    case "Áo":
      return "base";
    case "Quần":
      return "base";
    case "Váy":
      return "base";
    case "Đầm":
      return "onepiece";
    case "Giày":
      return "footwear";
    default:
      return "accessory";
  }
}

export async function labelWardrobeItemFromPngBase64(pngBase64: string): Promise<ItemLabel> {
  const simple = await labelWardrobeItemSimpleFromPngBase64(pngBase64);

  // NOTE: bạn muốn chỉ category -> các field khác set placeholder hợp lệ
  return ItemLabelSchema.parse({
    category: simple.category,
    subcategory: "unknown",
    layer: defaultLayerForCategory(simple.category),
    colors: ["unknown"],
    pattern: "none",
    material: "unknown",
    season: ["all"],
    formality: "casual",
    notes: null,
    confidence: typeof simple.confidence === "number" ? simple.confidence : 0.5,
  });
}