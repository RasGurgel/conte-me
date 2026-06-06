import { z } from "zod";
import type { Page, Story } from "@/types/story";

export const STORY_SESSION_KEY = "contame:pendingStoryImport";
export const MAX_STORY_JSON_BYTES = 512 * 1024; // 512 KB

const pageLayouts = [
  "cover",
  "bg-image-text-card",
  "top-image",
  "wide-scene-soft-block",
  "center-character",
  "full-art-footer-text",
  "minimal-final",
] as const;

const soundtrackStyles = [
  "lullaby",
  "orchestral-light",
  "acoustic-folk",
  "soft-jazz",
  "magical-fantasy",
  "joyful-adventure",
  "dreamy-ambient",
] as const;

const pageSchema = z.object({
  index: z.number().int().nonnegative().optional(),
  text: z.string().default(""),
  layout: z.enum(pageLayouts).default("bg-image-text-card"),
  text_position: z.enum(["top", "middle", "bottom"]).optional(),
  image_url: z.string().url().nullable().optional(),
  audio_url: z.string().url().nullable().optional(),
  image_prompt: z.string().max(2000).optional(),
  characters: z.array(z.string().min(1).max(80)).max(20).optional(),
});

export const storyImportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date deve ser YYYY-MM-DD")
    .optional(),
  emoji: z.string().trim().max(8).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
  cover_url: z.string().url().nullable().optional(),
  character_sheet: z.string().max(4000).nullable().optional(),
  pages: z.array(pageSchema).min(1).max(60),
  soundtrack_url: z.string().url().nullable().optional(),
  soundtrack_prompt: z.string().max(1000).nullable().optional(),
  soundtrack_style: z.enum(soundtrackStyles).nullable().optional(),
  soundtrack_bpm: z.number().int().min(40).max(220).nullable().optional(),
  soundtrack_intensity: z.enum(["calm", "balanced", "vibrant"]).nullable().optional(),
  soundtrack_instruments: z.array(z.string().min(1).max(60)).max(20).nullable().optional(),
  soundtrack_duration_seconds: z.number().int().min(5).max(600).nullable().optional(),
  soundtrack_volume: z.number().min(0).max(1).nullable().optional(),
});

const KNOWN_TOP_KEYS = new Set([
  "title",
  "subtitle",
  "date",
  "emoji",
  "tags",
  "cover_url",
  "character_sheet",
  "pages",
  "soundtrack_url",
  "soundtrack_prompt",
  "soundtrack_style",
  "soundtrack_bpm",
  "soundtrack_intensity",
  "soundtrack_instruments",
  "soundtrack_duration_seconds",
  "soundtrack_volume",
]);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ParseStoryResult = { story: Story; warnings: string[] };

export function parseStoryJson(text: string): ParseStoryResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `JSON inválido: ${e instanceof Error ? e.message : "erro de parsing"}`,
    );
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("JSON deve ser um objeto no topo.");
  }

  const warnings: string[] = [];
  for (const k of Object.keys(raw as Record<string, unknown>)) {
    if (!KNOWN_TOP_KEYS.has(k) && k !== "id") {
      warnings.push(`Campo desconhecido ignorado: "${k}"`);
    }
  }

  const parsed = storyImportSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path.length ? issue.path.join(".") : "(raiz)";
    throw new Error(`Campo "${path}": ${issue.message}`);
  }
  const v = parsed.data;

  const sortedPages = [...v.pages]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map<Page>((p, i) => ({
      index: i,
      text: p.text,
      layout: p.layout,
      text_position: p.text_position,
      image_url: p.image_url ?? undefined,
      audio_url: p.audio_url ?? undefined,
      image_prompt: p.image_prompt,
      characters: p.characters,
    }));

  const today = new Date().toISOString().slice(0, 10);

  const story: Story = {
    id: newId(),
    title: v.title,
    subtitle: v.subtitle ?? "",
    date: v.date ?? today,
    emoji: v.emoji ?? "📖",
    tags: v.tags ?? [],
    cover_url: v.cover_url ?? null,
    character_sheet: v.character_sheet ?? null,
    pages: sortedPages,
    soundtrack_url: v.soundtrack_url ?? null,
    soundtrack_prompt: v.soundtrack_prompt ?? null,
    soundtrack_style: v.soundtrack_style ?? null,
    soundtrack_bpm: v.soundtrack_bpm ?? null,
    soundtrack_intensity: v.soundtrack_intensity ?? null,
    soundtrack_instruments: v.soundtrack_instruments ?? null,
    soundtrack_duration_seconds: v.soundtrack_duration_seconds ?? null,
    soundtrack_volume: v.soundtrack_volume ?? null,
  };

  return { story, warnings };
}
