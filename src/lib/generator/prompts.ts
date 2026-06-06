export const VISUAL_STYLES = {
  watercolor: {
    label: "Aquarela suave",
    prompt:
      "soft watercolor children's book illustration, warm pastel palette, gentle washes, hand-painted texture, dreamy and cozy",
  },
  pastel: {
    label: "Ilustração infantil em pastel",
    prompt:
      "modern children's book illustration, soft pastel colors, rounded shapes, friendly and calm, flat shading with subtle gradients",
  },
  cartoon: {
    label: "Cartum macio",
    prompt:
      "soft cartoon illustration for children, bold friendly outlines, warm palette, expressive but gentle characters",
  },
  vintage: {
    label: "Livro vintage",
    prompt:
      "vintage 1960s storybook illustration, muted earthy palette, textured paper, hand-drawn warmth, nostalgic",
  },
} as const;

export type StyleKey = keyof typeof VISUAL_STYLES;

export const AGE_RANGES = ["2-4", "4-6", "6-8"] as const;
export const TONES = ["calmo", "sono", "divertido", "curiosidade"] as const;

export type Brief = {
  theme?: string;
  character?: string;
  characterSheet?: string;
  setting?: string;
  age: (typeof AGE_RANGES)[number];
  tone: (typeof TONES)[number];
  pageCount: number;
  style: StyleKey;
  surprise: boolean;
};

export function storySystemPrompt(brief: Brief) {
  return `Você é uma autora de historinhas infantis brasileiras para a hora de dormir.
Escreva em português do Brasil, com linguagem doce, ritmo lento e imagens sensoriais.
Tom: ${brief.tone}. Faixa etária: ${brief.age} anos.
Cada página tem texto curto (4 linhas, 6 a 12 palavras por linha), sem rimas forçadas.
Evite vilões assustadores e finais abruptos. Termine de forma calma, com uma pequena descoberta.

CONSISTÊNCIA DE PERSONAGEM (obrigatório):
- O protagonista DEVE aparecer em todas as páginas internas, salvo decisão explícita do briefing.
- Sempre nomeie o protagonista pelo nome real (nunca "uma menina", "um menino", "um bichinho"), para que o ilustrador não invente outro personagem.
- Personagens secundários reaparecem com o mesmo nome.`;
}

export function storyUserPrompt(brief: Brief) {
  if (brief.surprise) {
    return `Invente uma historinha original de ${brief.pageCount} páginas. Escolha personagem, cenário e tema livremente.`;
  }
  return `Tema/ideia: ${brief.theme || "(livre)"}
Personagem principal: ${brief.character || "(livre)"}
${brief.characterSheet ? `Descrição visual fixa do personagem (use exatamente esta no character_sheet): ${brief.characterSheet}` : ""}
Cenário: ${brief.setting || "(livre)"}
Escreva uma historinha de ${brief.pageCount} páginas seguindo o briefing.`;
}

/**
 * Monta o prompt de imagem com Character Bible + elenco da cena, garantindo
 * que o mesmo personagem (mesmos traços) apareça em todas as páginas.
 */
export function imagePromptFor(
  style: StyleKey,
  scene: string,
  characterSheet?: string,
  charactersInScene?: string[],
) {
  const s = VISUAL_STYLES[style].prompt;
  const bible = characterSheet?.trim()
    ? `CHARACTER BIBLE (must match EXACTLY in every image — same face, same hairstyle, same outfit, same colors): ${characterSheet.trim()}. `
    : "";
  const cast =
    charactersInScene && charactersInScene.length > 0
      ? `Characters present in this scene (use the bible above for their appearance — do NOT invent new characters): ${charactersInScene.join(", ")}. `
      : "";
  return `${s}. ${bible}${cast}Scene: ${scene}. Keep character design 100% consistent with the bible across all pages. No text, no letters, no captions. Square composition, soft natural lighting.`;
}
