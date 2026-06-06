import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableGateway } from "@/lib/ai-gateway.server";
import {
  AGE_RANGES,
  TONES,
  VISUAL_STYLES,
  storySystemPrompt,
  storyUserPrompt,
  type Brief,
  type StyleKey,
} from "./prompts";

const LAYOUTS = [
  "cover",
  "bg-image-text-card",
  "top-image",
  "wide-scene-soft-block",
  "center-character",
  "full-art-footer-text",
  "minimal-final",
] as const;
type Layout = (typeof LAYOUTS)[number];

const BriefSchema = z.object({
  theme: z.string().max(300).optional(),
  character: z.string().max(200).optional(),
  characterSheet: z.string().max(1000).optional(),
  setting: z.string().max(200).optional(),
  age: z.enum(AGE_RANGES),
  tone: z.enum(TONES),
  pageCount: z.number().int().min(8).max(40),
  style: z.custom<StyleKey>((v) => typeof v === "string" && v in VISUAL_STYLES),
  surprise: z.boolean(),
});

type Page = {
  text: string;
  layout: Layout;
  text_position: "top" | "middle" | "bottom";
  image_prompt: string;
  characters: string[];
};

export type StoryDraft = {
  title: string;
  subtitle: string;
  emoji: string;
  tags: string[];
  character_sheet: string;
  pages: Page[];
};

/* ============================ Helpers ============================ */

function isPaymentRequiredError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes("payment required");
}

/**
 * Extract the first JSON object/array from a string, even if wrapped in
 * markdown fences or surrounded by prose. Returns parsed value or null.
 */
function extractJson(raw: string): unknown {
  if (!raw) return null;
  let text = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // fallthrough
  }

  // Find first { or [ and try to parse the largest balanced slice
  const startIdx = text.search(/[\[{]/);
  if (startIdx < 0) return null;
  const open = text[startIdx];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        const slice = text.slice(startIdx, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function toStringValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(toStringValue).filter(Boolean).join(" ");
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    // Prefer common descriptor fields
    const preferred = ["description", "appearance", "details", "text", "summary", "value"];
    const parts: string[] = [];
    if (typeof obj.name === "string") parts.push(obj.name);
    for (const k of preferred) {
      if (typeof obj[k] === "string") parts.push(obj[k] as string);
    }
    if (parts.length === 0) {
      for (const val of Object.values(obj)) {
        const s = toStringValue(val);
        if (s) parts.push(s);
      }
    }
    return parts.filter(Boolean).join(". ");
  }
  return "";
}

function normalizeTags(v: unknown): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .map((x) => toStringValue(x).trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((s) => s.slice(0, 40));
}

function pickLayout(raw: unknown, fallback: Layout): Layout {
  const s = typeof raw === "string" ? raw : "";
  return (LAYOUTS as readonly string[]).includes(s) ? (s as Layout) : fallback;
}

function pickPosition(raw: unknown, fallback: "top" | "middle" | "bottom"): "top" | "middle" | "bottom" {
  return raw === "top" || raw === "middle" || raw === "bottom" ? raw : fallback;
}

function normalizePage(raw: unknown, index: number, total: number, protagonist: string): Page {
  const r = (raw ?? {}) as Record<string, unknown>;
  const isLast = index === total - 1;
  const middleLayouts: Layout[] = [
    "bg-image-text-card",
    "top-image",
    "wide-scene-soft-block",
    "center-character",
    "full-art-footer-text",
  ];
  const defaultLayout: Layout = isLast
    ? "minimal-final"
    : middleLayouts[index % middleLayouts.length];

  const text = toStringValue(r.text).slice(0, 400) || `Página ${index + 1}.`;
  const layout = pickLayout(r.layout, defaultLayout);
  const text_position = pickPosition(r.text_position, isLast ? "bottom" : index % 2 === 0 ? "top" : "bottom");
  const image_prompt =
    toStringValue(r.image_prompt).slice(0, 400) ||
    `${protagonist} in a gentle bedtime scene, page ${index + 1}`;
  let characters: string[] = [];
  if (Array.isArray(r.characters)) {
    characters = r.characters
      .map((c) => toStringValue(c).trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((s) => s.slice(0, 80));
  }
  if (characters.length === 0) characters = [protagonist];
  return { text, layout, text_position, image_prompt, characters };
}

function extractPagesArray(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.pages)) return obj.pages;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.results)) return obj.results;
  }
  return [];
}

/* ============================ Fallback ============================ */

function prependCoverPage(draft: StoryDraft, brief: Brief): StoryDraft {
  if (draft.pages[0]?.layout === "cover") return draft;
  const first = draft.pages[0];
  const protagonist =
    brief.character?.trim() ||
    first?.characters[0] ||
    draft.title.split(/\s+/).slice(-1)[0] ||
    "protagonista";
  const setting = brief.setting?.trim() || "uma cena de abertura serena";
  const cover: Page = {
    text: "",
    layout: "cover",
    text_position: "bottom",
    image_prompt: `${protagonist} in ${setting}, gentle bedtime story title cover, soft natural lighting, atmospheric establishing shot, no text`,
    characters: [protagonist],
  };
  return { ...draft, pages: [cover, ...draft.pages] };
}

function fallbackPages(brief: Brief, protagonist: string, count: number, theme: string, setting: string): Page[] {
  const middleLayouts: Layout[] = [
    "bg-image-text-card",
    "top-image",
    "wide-scene-soft-block",
    "center-character",
    "full-art-footer-text",
  ];
  return Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1;
    const layout: Layout = isLast ? "minimal-final" : middleLayouts[index % middleLayouts.length];
    const text = index === 0
      ? `${protagonist} abriu os olhos bem devagar.\n${setting} brilhava com calma.\nHavia um convite no vento.\nE o coração quis escutar.`
      : isLast
        ? `${protagonist} guardou a descoberta com carinho.\n${setting} ficou ainda mais sereno.\nA noite cobriu tudo de paz.\nE o sono chegou sorrindo.`
        : `${protagonist} seguiu um brilho pequenino.\nCada passo parecia contar ${theme}.\nNo silêncio, algo novo aparecia.\nEra a página ${index + 1} do encanto.`;
    return {
      text,
      layout,
      text_position: isLast ? "bottom" : index % 2 === 0 ? "top" : "bottom",
      image_prompt: isLast
        ? `${protagonist} resting peacefully in ${setting}, calm bedtime ending, warm soft light`
        : `${protagonist} exploring ${setting}, ${theme}, gentle children's book scene, page ${index + 1}`,
      characters: [protagonist],
    };
  });
}

function fallbackStoryDraft(brief: Brief): StoryDraft {
  const protagonist = brief.character?.trim() || "uma pequena estrela curiosa";
  const setting = brief.setting?.trim() || "um jardim quietinho depois do pôr do sol";
  const theme = brief.theme?.trim() || "uma descoberta gentil antes de dormir";
  const title = brief.surprise ? "O Segredo do Caminho Macio" : `A Jornada de ${protagonist}`;
  const pageCount = Math.max(8, Math.min(40, brief.pageCount));
  const draft: StoryDraft = {
    title: title.slice(0, 120),
    subtitle: "Um rascunho local para continuar a criação",
    emoji: "📖",
    tags: ["sono", "aventura", "imaginação"],
    character_sheet:
      brief.characterSheet?.trim() ||
      `${protagonist}: aparência consistente em todas as páginas — mesmas roupas, mesmas cores e mesmo rosto.`,
    pages: fallbackPages(brief, protagonist, pageCount, theme, setting),
  };
  return prependCoverPage(draft, brief);
}

/* ============================ Server Fn ============================ */

export const generateStoryDraft = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => BriefSchema.parse(input))
  .handler(async ({ data }) => {
    const gateway = createLovableGateway();
    const brief = data as Brief;
    const model = gateway("google/gemini-2.5-flash");
    const layoutOptions = LAYOUTS.filter((l) => l !== "cover").join(", ");

    try {
      // ===== Fase 1: metadados + outline (JSON cru, parsing manual) =====
      const metaPrompt = `${storyUserPrompt(brief)}

Responda APENAS com um único objeto JSON válido, sem markdown, sem comentários, sem texto fora do JSON. Use exatamente este formato:

{
  "title": "string curta",
  "subtitle": "string curta e poética",
  "emoji": "1 emoji só",
  "tags": ["palavra1","palavra2","palavra3"],
  "character_sheet": "STRING única em INGLÊS descrevendo o protagonista (espécie/idade, cabelo, olhos, pele, roupa com cores, calçado, traços marcantes). NÃO use objeto aqui — apenas string.${brief.characterSheet ? ` Use EXATAMENTE: "${brief.characterSheet}".` : ""}",
  "outline": ["frase curta da página 1", "frase curta da página 2", "..."]
}

REGRAS:
- "character_sheet" DEVE ser string, NUNCA objeto.
- "outline" DEVE ter EXATAMENTE ${brief.pageCount} itens, cada um até 20 palavras, avançando a história, sem repetições.
- Saída deve começar com "{" e terminar com "}". Nada além disso.`;

      const metaRes = await generateText({
        model,
        maxOutputTokens: 16000,
        system: storySystemPrompt(brief),
        prompt: metaPrompt,
      });

      const metaRaw = extractJson(metaRes.text) as Record<string, unknown> | null;
      if (!metaRaw || typeof metaRaw !== "object") {
        throw new Error("Modelo não devolveu metadados em JSON válido.");
      }

      const title = (toStringValue(metaRaw.title).trim() || "Historinha").slice(0, 120);
      const subtitle = toStringValue(metaRaw.subtitle).trim().slice(0, 200);
      const emoji = (toStringValue(metaRaw.emoji).trim() || "📖").slice(0, 8);
      let tags = normalizeTags(metaRaw.tags);
      if (tags.length === 0) tags = ["historinha"];
      const character_sheet =
        toStringValue(metaRaw.character_sheet).trim().slice(0, 2000) ||
        (brief.characterSheet?.trim() ?? "");

      const protagonist =
        brief.character?.trim() ||
        title.split(/\s+/).slice(-1)[0] ||
        "protagonista";

      // outline pode vir como string[] ou objetos com {text}/{description}
      let outline: string[] = [];
      const outlineRaw = metaRaw.outline;
      if (Array.isArray(outlineRaw)) {
        outline = outlineRaw
          .map((o) => toStringValue(o).trim())
          .filter(Boolean)
          .slice(0, brief.pageCount);
      }

      // Algumas vezes o modelo já devolve `pages` em phase 1 — usamos se vier completo
      let allPages: Page[] = [];
      const phase1Pages = extractPagesArray(metaRaw);
      if (phase1Pages.length >= brief.pageCount) {
        allPages = phase1Pages
          .slice(0, brief.pageCount)
          .map((p, i) => normalizePage(p, i, brief.pageCount, protagonist));
      } else if (outline.length > 0) {
        // ===== Fase 2: gerar páginas em lotes a partir do outline =====
        const BATCH = 5;
        for (let start = 0; start < outline.length; start += BATCH) {
          const slice = outline.slice(start, start + BATCH);
          const isLastBatch = start + BATCH >= outline.length;
          const batchPrompt = `Título: ${title}
Protagonista: ${protagonist}
Character sheet (NÃO descreva a aparência nos image_prompts — ela vem daqui): ${character_sheet}

Gere EXATAMENTE ${slice.length} páginas (números ${start + 1} a ${start + slice.length} de ${outline.length} no total) seguindo este outline em ordem:
${slice.map((s, i) => `${start + i + 1}. ${s}`).join("\n")}

Responda APENAS com JSON válido neste formato exato, sem markdown:

{
  "pages": [
    {
      "text": "3-4 linhas separadas por \\n, 6-12 palavras por linha. Texto avançando a história. Sempre nomeie ${protagonist}.",
      "layout": "um de: ${layoutOptions}",
      "text_position": "top | middle | bottom",
      "image_prompt": "cena em INGLÊS, máx 300 chars, SEM descrever aparência do protagonista, SEM texto/letras",
      "characters": ["${protagonist}"]
    }
  ]
}

REGRAS:
- ${isLastBatch ? `Use "minimal-final" SOMENTE na última (página ${outline.length}).` : `NÃO use "minimal-final" aqui.`}
- NUNCA use "cover".
- Varie os layouts.
- Saída deve começar com "{" e terminar com "}".`;

          let batchOk = false;
          for (let attempt = 0; attempt < 2 && !batchOk; attempt++) {
            try {
              const batchRes = await generateText({
                model,
                maxOutputTokens: 6000,
                system: storySystemPrompt(brief),
                prompt: batchPrompt,
              });
              const parsed = extractJson(batchRes.text);
              const arr = extractPagesArray(parsed);
              if (arr.length > 0) {
                const baseIdx = allPages.length;
                const normalized = arr
                  .slice(0, slice.length)
                  .map((p, i) =>
                    normalizePage(p, baseIdx + i, brief.pageCount, protagonist),
                  );
                allPages.push(...normalized);
                batchOk = true;
              }
            } catch (batchErr) {
              console.warn("[generateStoryDraft] batch attempt failed", attempt, batchErr);
            }
          }
          if (!batchOk) {
            // preenche este lote com fallback local coerente
            const setting = brief.setting?.trim() || "uma cena tranquila";
            const theme = brief.theme?.trim() || "uma descoberta gentil";
            const filler = fallbackPages(brief, protagonist, slice.length, theme, setting).map(
              (p, i) => normalizePage(p, allPages.length + i, brief.pageCount, protagonist),
            );
            allPages.push(...filler);
          }
        }
      } else {
        // sem outline nem pages — completa com fallback local
        const setting = brief.setting?.trim() || "uma cena tranquila";
        const theme = brief.theme?.trim() || "uma descoberta gentil";
        allPages = fallbackPages(brief, protagonist, brief.pageCount, theme, setting);
      }

      // garantia: número exato de páginas
      if (allPages.length < brief.pageCount) {
        const setting = brief.setting?.trim() || "uma cena tranquila";
        const theme = brief.theme?.trim() || "uma descoberta gentil";
        const missing = brief.pageCount - allPages.length;
        const filler = fallbackPages(brief, protagonist, missing, theme, setting).map(
          (p, i) => normalizePage(p, allPages.length + i, brief.pageCount, protagonist),
        );
        allPages.push(...filler);
      }
      allPages = allPages.slice(0, brief.pageCount);

      const contentPages = allPages.filter((p) => p.layout !== "cover");
      const draft: StoryDraft = {
        title,
        subtitle,
        emoji,
        tags,
        character_sheet:
          character_sheet ||
          `${protagonist}: aparência consistente em todas as páginas — mesmas roupas, mesmas cores e mesmo rosto.`,
        pages: contentPages,
      };
      return prependCoverPage(draft, brief);
    } catch (error) {
      if (isPaymentRequiredError(error)) {
        console.warn("[generateStoryDraft] payment required, using local fallback");
        return fallbackStoryDraft(brief);
      }
      const err = error as { name?: string; message?: string; cause?: unknown };
      console.error("[generateStoryDraft] generation failed", {
        name: err?.name,
        message: err?.message,
        cause: err?.cause,
      });
      // último recurso: rascunho local para não derrubar a UI
      console.warn("[generateStoryDraft] using local fallback after failure");
      return fallbackStoryDraft(brief);
    }
  });
