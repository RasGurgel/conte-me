import type { SoundtrackIntensity, SoundtrackStyle } from "@/types/story";

export const SOUNDTRACK_STYLES: { value: SoundtrackStyle; label: string; hint: string }[] = [
  { value: "lullaby", label: "Canção de ninar", hint: "Gentle children's lullaby, soft and sleepy" },
  { value: "orchestral-light", label: "Orquestral leve", hint: "Light orchestral cinematic score, warm strings and woodwinds" },
  { value: "acoustic-folk", label: "Folk acústico", hint: "Cozy acoustic folk, fingerpicked guitar and gentle percussion" },
  { value: "soft-jazz", label: "Jazz suave", hint: "Soft mellow jazz, brushed drums and warm piano" },
  { value: "magical-fantasy", label: "Fantasia mágica", hint: "Whimsical magical fantasy score, sparkling bells and shimmering harp" },
  { value: "joyful-adventure", label: "Aventura alegre", hint: "Cheerful playful adventure, light percussion and uplifting melody" },
  { value: "dreamy-ambient", label: "Ambiente onírico", hint: "Dreamy ambient soundscape, soft pads and twinkling textures" },
];

export const SOUNDTRACK_INTENSITIES: { value: SoundtrackIntensity; label: string; hint: string }[] = [
  { value: "calm", label: "Calma", hint: "very calm dynamics, low energy, soothing" },
  { value: "balanced", label: "Equilibrada", hint: "balanced dynamics, gentle movement" },
  { value: "vibrant", label: "Vibrante", hint: "lively but child-friendly, never intense or scary" },
];

export const SOUNDTRACK_INSTRUMENTS = [
  "piano",
  "strings",
  "harp",
  "flute",
  "glockenspiel",
  "acoustic guitar",
  "bells",
  "children choir",
  "music box",
  "ukulele",
  "celesta",
] as const;

export type BuildSoundtrackPromptInput = {
  style: SoundtrackStyle;
  bpm: number;
  intensity: SoundtrackIntensity;
  instruments: string[];
  moodTags?: string[];
  extraPrompt?: string;
};

export function buildSoundtrackPrompt(input: BuildSoundtrackPromptInput): string {
  const style = SOUNDTRACK_STYLES.find((s) => s.value === input.style)?.hint ?? "gentle children's music";
  const intensity = SOUNDTRACK_INTENSITIES.find((i) => i.value === input.intensity)?.hint ?? "balanced dynamics";
  const instruments = input.instruments.length
    ? `featuring ${input.instruments.join(", ")}`
    : "featuring soft acoustic instruments";
  const mood = input.moodTags?.length
    ? `mood inspired by: ${input.moodTags.join(", ")}`
    : "warm bedtime mood";
  const extra = input.extraPrompt?.trim() ? ` ${input.extraPrompt.trim()}.` : "";

  return [
    `${style}, ${instruments}, around ${input.bpm} BPM, ${intensity}, ${mood}.`,
    "Instrumental only, no vocals, no lyrics.",
    "Child-friendly, warm and reassuring, no scary, dissonant, aggressive or jarring elements.",
    "Smooth dynamics suitable for looping under a children's storybook narration.",
    extra,
  ]
    .join(" ")
    .trim();
}
