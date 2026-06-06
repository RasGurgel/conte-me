/**
 * Importação de briefing de historinha via arquivo JSON.
 *
 * Schema esperado (todos os campos são opcionais — defaults são aplicados):
 * {
 *   "theme": "ursinho que escuta o pomar",
 *   "character": "ursinho Bento",
 *   "characterSheet": "urso bege, cachecol vermelho, olhos grandes…",
 *   "setting": "pomar encantado ao entardecer",
 *   "age": "2-4" | "4-6" | "6-8",
 *   "tone": "calmo" | "sono" | "divertido" | "curiosidade",
 *   "pageCount": 6..30,
 *   "style": "watercolor" | "pastel" | "cartoon" | "vintage",
 *   "surprise": false
 * }
 */
import { z } from "zod";
import {
  AGE_RANGES,
  TONES,
  VISUAL_STYLES,
  type Brief,
  type StyleKey,
} from "./prompts";

export const MAX_BRIEF_JSON_BYTES = 64 * 1024;

const STYLE_KEYS = Object.keys(VISUAL_STYLES) as [StyleKey, ...StyleKey[]];

const trimmedString = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max, `texto excede ${max} caracteres`));

export const briefSchema = z
  .object({
    theme: trimmedString(500).optional(),
    character: trimmedString(500).optional(),
    characterSheet: trimmedString(1000).optional(),
    setting: trimmedString(500).optional(),
    age: z
      .enum(AGE_RANGES as unknown as [string, ...string[]], {
        errorMap: () => ({
          message: `Campo 'age' inválido. Use: ${AGE_RANGES.join(", ")}.`,
        }),
      })
      .optional(),
    tone: z
      .enum(TONES as unknown as [string, ...string[]], {
        errorMap: () => ({
          message: `Campo 'tone' inválido. Use: ${TONES.join(", ")}.`,
        }),
      })
      .optional(),
    pageCount: z
      .number({ invalid_type_error: "Campo 'pageCount' deve ser número" })
      .int("Campo 'pageCount' deve ser inteiro")
      .optional(),
    style: z
      .enum(STYLE_KEYS, {
        errorMap: () => ({
          message: `Campo 'style' inválido. Use: ${STYLE_KEYS.join(", ")}.`,
        }),
      })
      .optional(),
    surprise: z.boolean().optional(),
  })
  .passthrough();

export type ParseResult = { brief: Brief; warnings: string[] };

const KNOWN_KEYS = new Set([
  "theme",
  "character",
  "characterSheet",
  "setting",
  "age",
  "tone",
  "pageCount",
  "style",
  "surprise",
]);

export function parseBriefJson(text: string): ParseResult {
  if (text.length > MAX_BRIEF_JSON_BYTES) {
    throw new Error(
      `Arquivo muito grande (máx ${Math.round(MAX_BRIEF_JSON_BYTES / 1024)} KB).`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Arquivo JSON inválido.");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("JSON deve ser um objeto na raiz.");
  }

  const parsed = briefSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const path = first.path.length ? `'${first.path.join(".")}': ` : "";
    throw new Error(`${path}${first.message}`);
  }

  const warnings: string[] = [];
  for (const key of Object.keys(raw as Record<string, unknown>)) {
    if (!KNOWN_KEYS.has(key)) warnings.push(`Campo '${key}' ignorado.`);
  }

  let pageCount = parsed.data.pageCount ?? 18;
  if (pageCount < 6) {
    warnings.push("'pageCount' ajustado para mínimo 6.");
    pageCount = 6;
  } else if (pageCount > 30) {
    warnings.push("'pageCount' ajustado para máximo 30.");
    pageCount = 30;
  }

  const brief: Brief = {
    theme: parsed.data.theme || "",
    character: parsed.data.character || "",
    characterSheet: parsed.data.characterSheet || "",
    setting: parsed.data.setting || "",
    age: (parsed.data.age as Brief["age"]) ?? "4-6",
    tone: (parsed.data.tone as Brief["tone"]) ?? "calmo",
    pageCount,
    style: (parsed.data.style as StyleKey) ?? "watercolor",
    surprise: parsed.data.surprise ?? false,
  };

  return { brief, warnings };
}

export const BRIEF_SESSION_KEY = "contame:pendingBrief";
