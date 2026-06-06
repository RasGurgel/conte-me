export type Voice = { id: string; label: string; description: string };

// Vozes da ElevenLabs ajustadas para narração infantil em PT-BR (eleven_multilingual_v2)
export const NARRATION_VOICES: Voice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — doce e calma", description: "Feminina, suave, ideal para hora de dormir" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda — carinhosa", description: "Feminina, acolhedora" },
  { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura — leve e brincalhona", description: "Feminina, alegre" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — vovô contador", description: "Masculina, grave e tranquila" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — narrador clássico", description: "Masculina, clara" },
];

export const DEFAULT_VOICE_ID = NARRATION_VOICES[0].id;
