export type ParsedGarment = {
  slot: string;
  category: string;
  image_png_base64: string;
  colors: { hex: string; nameVi: string } | null;
  embedding: number[];
  embeddingModel: string;
  bbox: number[];
};

const AI_URL = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";

export async function parsePersonOnAi(file: Blob): Promise<{ ok: boolean; items: ParsedGarment[] }> {
  const fd = new FormData();
  fd.append("file", file, "person.jpg");
  const res = await fetch(`${AI_URL}/parse-person`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`AI parse-person failed: ${res.status}`);
  return res.json();
}
