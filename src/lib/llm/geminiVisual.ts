import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const toJsonSchema = zodToJsonSchema as unknown as (schema: unknown) => any;

function getGeminiClient() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY in environment.");
    return new GoogleGenAI({ apiKey: key });
}

const ResponseSchema = z.object({
    clothesDescription: z.string().describe("Detailed description of the garments in Vietnamese"),
    imagen_prompt: z.string().describe("Detailed English prompt for image generation (imagen-3)"),
    note: z.string().describe("explanation from the stylist in Vietnamese"),
    outfit: z.any().describe("Outfit's name"),
});

export type VisualOut = z.infer<typeof ResponseSchema>;

export async function generateVisualGemini(input: {
    userMessage: string;
    profile: any;
    images: Array<{ id: string; url?: string; png_base64: string }>;
}): Promise<VisualOut> {
    const ai = getGeminiClient();

    const userGender = input.profile?.gender || "unknown";
    const userHeight = input.profile?.heightCm || "unknown";
    const userMessage = input.userMessage || "No occasion provided";
    const userAge = input.profile?.age ? `${input.profile.age} years old` : "unknown";
    const userbust = input.profile?.bustCm ? `${input.profile.bustCm} cm` : "unknown";
    const userWaist = input.profile?.waistCm ? `${input.profile.waistCm} cm` : "unknown";
    const userHip = input.profile?.hipCm ? `${input.profile.hipCm} cm` : "unknown";

    // console.log(userAge, userbust, userWaist, userHip, userGender, userMessage);

    const systemText = `
ROLE:
You are a professional fashion stylist and prompt engineer.

USER PROFILE:
The user gender is: ${userGender}.
The user height is: ${userHeight} cm.
The user age is: ${userAge} years old.
The user bust measurement is: ${userbust} cm.
The user waist measurement is: ${userWaist} cm.
The user hip measurement is: ${userHip} cm.
(note: the mennequin in the generate_image_prompt MUST match these body proportions)

All styling decisions MUST strictly follow ${userGender} fashion conventions.
Do NOT mix gender attributes.

INPUT:
You will receive:
- Multiple source garment images
- A user message describing the occasion/ event/ weather/ destination or style vibe (e.g. "outfit for wedding", "I need a set for going to the fair", "light and feminine style")

STRICT RULES:
1. You MUST only use garments that appear in the provided source images.
2. Respect the vibe of the occasion: "${input.userMessage}". 
   - If it's "Formal", do not suggest "Casual" items.
3. Do NOT modify the garment's color, fabric, silhouette, or pattern.
4. All styling must respect ${userGender} body structure.

TASKS:

1) IMAGE ANALYSIS  
For each image:
- Identify garment category
- Color
- Fabric
- Pattern
- Fit / silhouette
- Style (casual, formal, streetwear, etc.)

2) OUTFIT SELECTION  
- Select the most appropriate outfit for the occasion that mentioned in user's message"${input.userMessage}".

3) IMAGEN PROMPT  
Create a highly detailed English prompt describing:
- A white ${userGender} mannequin matching the user's body proportions
- Wearing EXACTLY the selected garments
- Full body
- Standing upright
- Arms relaxed at sides
- Neutral facial expression
- Studio lighting
- Pure white seamless background
- Fashion catalog style

4) ASNSWER STRUCTURE
Produce a JSON with the following structure:
{
  "clothesDescription": "The detailed description of the garments in task 1",
  "imagen_prompt": "Detailed English prompt for image generation (imagen-3)",
  "note": "explanation from the stylist in Vietnamese",
  "outfit": "Outfit's name"
}

Produce the JSON now.`.trim();

    const multimodalContents = [
        systemText,
        ...input.images.map((img) => ({
            inlineData: {
                data: img.png_base64,
                mimeType: "image/png",
            },
        })),
    ];


    const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL ?? "gemini-3-flash",
        contents: multimodalContents,
        config: {
            responseMimeType: "application/json",
            responseSchema: toJsonSchema(ResponseSchema),
        },
    });

    let raw = res.text;

    if (!raw || !raw.trim()) {
        throw new Error("Gemini returned empty response text for visual prompt generation");
    }

    raw = raw.replace(/^```json\s*/, "").replace(/```$/, "").trim();

    try {
        const parsed = ResponseSchema.parse(JSON.parse(raw));
        return parsed;
    } catch (error) {
        console.error("Lỗi Parse JSON từ Gemini. Dữ liệu thô AI trả về:", raw);
        throw error;
    }

}



export default generateVisualGemini;