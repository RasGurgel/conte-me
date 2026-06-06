import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableGateway } from "@/lib/ai-gateway.server";

const InputSchema = z.object({
  storyTitle: z.string().max(200).optional().default(""),
  storySubtitle: z.string().max(300).optional().default(""),
  characterSheet: z.string().max(1500).optional().default(""),
  pageText: z.string().max(1000).optional().default(""),
  isCover: z.boolean().optional().default(false),
  previousText: z.string().max(1000).optional().default(""),
  nextText: z.string().max(1000).optional().default(""),
  storyPlot: z.string().max(2000).optional().default(""),
});

const OutputSchema = z.object({
  image_prompt: z.string().min(8).max(400),
  characters: z.array(z.string().min(1).max(60)).max(6).default([]),
});

export const generateScenePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const gateway = createLovableGateway();
    const { object } = await generateObject({
      model: gateway("google/gemini-2.5-flash"),
      schema: OutputSchema,
      maxOutputTokens: 600,
      system: `Você descreve cenas visuais em INGLÊS para ilustrações de livros infantis.
Nunca descreva a aparência física do protagonista (isso vem do character bible separadamente).
Descreva apenas o que acontece, onde, e o clima da cena. Sem texto, sem letras na imagem.`,
      prompt: `História: "${data.storyTitle}"${data.storySubtitle ? ` — ${data.storySubtitle}` : ""}
${data.characterSheet ? `Character bible (referência, NÃO repita na cena): ${data.characterSheet}` : ""}
${data.previousText ? `Página anterior: ${data.previousText}` : ""}
${data.isCover ? `Esta é a CAPA — gere uma cena de abertura atmosférica, plano amplo, mostrando o protagonista no cenário principal da história.${data.storyPlot ? `\nResumo do enredo (para inspirar a cena de capa): ${data.storyPlot}` : ""}` : `Texto desta página: ${data.pageText || "(sem texto)"}`}
${data.nextText ? `Próxima página: ${data.nextText}` : ""}

Retorne:
- image_prompt: descrição curta em INGLÊS (máx 300 chars) da cena visual desta página — ação, ambiente, clima, iluminação. NÃO descreva o protagonista fisicamente.
- characters: nomes dos personagens presentes na cena (extraídos do texto). Sempre inclua o protagonista.`,
    });
    return object;
  });
