import { GoogleGenAI } from "@google/genai";
import { shouldCallVehicleVisionAnalyzer } from "../utils/vehicleImageValidationShared";

export interface VehicleVisionProbe {
  hasVehicle: boolean;
  /** 0–1 normalized confidence that the image shows a vehicle */
  vehicleConfidence: number;
  /** 0–1 normalized photo clarity for listing use */
  imageClarity?: number;
  isInappropriate?: boolean;
  category?: string;
}

type VehicleVisionAnalyzerFn = (
  buffer: Buffer,
  mimeType: string
) => Promise<VehicleVisionProbe | null>;

let testAnalyzer: VehicleVisionAnalyzerFn | null = null;
let geminiClient: GoogleGenAI | null | undefined;

function hasGeminiApiKey(): boolean {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key) return false;
  if (/placeholder|fake|your[_-]?api/i.test(key)) return false;
  return true;
}

function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient !== undefined) return geminiClient;
  if (!hasGeminiApiKey()) {
    geminiClient = null;
    return geminiClient;
  }
  geminiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!.trim(),
  });
  return geminiClient;
}

export function setVehicleVisionAnalyzerForTests(
  fn: VehicleVisionAnalyzerFn | null
): void {
  testAnalyzer = fn;
}

export function resetVehicleVisionAnalyzerForTests(): void {
  testAnalyzer = null;
  geminiClient = undefined;
}

function normalizeProbe(raw: Record<string, unknown>): VehicleVisionProbe | null {
  const hasVehicle = Boolean(raw.hasVehicle);
  const vehicleConfidence = normalizeScore(raw.vehicleConfidence);
  const imageClarity = normalizeScore(raw.imageClarity ?? raw.clarityScore);
  const isInappropriate = Boolean(raw.isInappropriate);
  const category = typeof raw.category === "string" ? raw.category : undefined;

  if (
    !Number.isFinite(vehicleConfidence) &&
    typeof raw.hasVehicle !== "boolean"
  ) {
    return null;
  }

  return {
    hasVehicle,
    vehicleConfidence,
    imageClarity,
    isInappropriate,
    category,
  };
}

function normalizeScore(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num > 1) return Math.min(1, num / 100);
  return Math.max(0, Math.min(1, num));
}

const VEHICLE_PROBE_PROMPT = `Analyze this image for a used-car marketplace listing upload.
Return ONLY valid JSON with this schema:
{
  "hasVehicle": boolean,
  "vehicleConfidence": number between 0 and 100,
  "imageClarity": number between 0 and 100,
  "isInappropriate": boolean,
  "category": "vehicle" | "person" | "food" | "document" | "landscape" | "animal" | "other"
}

Rules:
- hasVehicle=true only when a car/truck/van/motorcycle/SUV is clearly the main subject.
- hasVehicle=false for people selfies, food, documents, scenery, pets, logos, memes, or unrelated objects.
- vehicleConfidence reflects certainty that this is a vehicle listing photo.
- imageClarity reflects whether details (body, wheels, interior) are visible enough for a listing.
- isInappropriate=true for explicit, violent, or clearly unsuitable marketplace content.
- Do not guess brand/model. Focus only on whether this is a suitable vehicle photo.
- No markdown. JSON only.`;

export async function analyzeVehicleImageBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<VehicleVisionProbe | null> {
  if (testAnalyzer) {
    return testAnalyzer(buffer, mimeType);
  }

  // Never hit Gemini unless vision mode is explicitly enabled (defense in depth).
  if (!shouldCallVehicleVisionAnalyzer()) {
    return null;
  }

  const client = getGeminiClient();
  if (!client) return null;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: buffer.toString("base64"),
          },
        },
        { text: VEHICLE_PROBE_PROMPT },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const outputText = String(response.text ?? "{}")
      .replace(/^```json/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(outputText) as Record<string, unknown>;
    return normalizeProbe(parsed);
  } catch {
    return null;
  }
}
