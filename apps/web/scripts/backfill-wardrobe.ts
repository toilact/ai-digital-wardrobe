// Chạy: pnpm --filter web exec tsx scripts/backfill-wardrobe.ts
// Đọc mọi wardrobeItems thiếu `embedding`, tải imageUrl -> /parse-person? Không:
// item cũ là cutout 1 món -> gọi AI /label + /cutout để lấy embedding, Gemini cho tags.
// Với mỗi doc: fetch imageUrl -> POST tới AI service lấy embedding -> geminiSemanticTags -> backfillPatch -> update.
import { getAdmin } from "../src/lib/firebaseAdmin";
import { geminiSemanticTags } from "../src/lib/ai/semanticTags";
import { backfillPatch } from "../src/lib/wardrobe/backfillItem";

async function main() {
  const db = getAdmin().firestore();
  const snap = await db.collection("wardrobeItems").get();
  for (const d of snap.docs) {
    const data = d.data();
    if (Array.isArray(data.embedding) && data.embedding.length > 0) continue;
    const imgRes = await fetch(data.imageUrl);
    const b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/label`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_png_base64: b64, backend: "clip" }),
    });
    const emb: number[] = (await aiRes.json())?.embedding ?? [];
    const tags = await geminiSemanticTags(b64);
    await d.ref.update(backfillPatch(data, emb, tags));
    console.log("backfilled", d.id);
  }
}
main().then(() => process.exit(0));
