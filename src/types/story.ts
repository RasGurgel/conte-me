export type PageLayout =
  | "cover"
  | "bg-image-text-card"
  | "top-image"
  | "wide-scene-soft-block"
  | "center-character"
  | "full-art-footer-text"
  | "minimal-final";

export type Page = {
  index: number;
  text: string;
  image_url?: string;
  audio_url?: string;
  layout: PageLayout;
  text_position?: "top" | "middle" | "bottom";
  /** Descrição curta da cena em inglês (sem texto), usada para gerar imagem por IA */
  image_prompt?: string;
  /** Personagens presentes na cena (para reforçar o character sheet) */
  characters?: string[];
};

export type SoundtrackStyle =
  | "lullaby"
  | "orchestral-light"
  | "acoustic-folk"
  | "soft-jazz"
  | "magical-fantasy"
  | "joyful-adventure"
  | "dreamy-ambient";

export type SoundtrackIntensity = "calm" | "balanced" | "vibrant";

export type Story = {
  id: string;
  title: string;
  subtitle?: string | null;
  date: string;
  emoji: string;
  tags: string[];
  cover_url?: string | null;
  pages: Page[];
  created_at?: string;
  updated_at?: string;
  soundtrack_url?: string | null;
  soundtrack_prompt?: string | null;
  soundtrack_style?: SoundtrackStyle | null;
  soundtrack_bpm?: number | null;
  soundtrack_intensity?: SoundtrackIntensity | null;
  soundtrack_instruments?: string[] | null;
  soundtrack_duration_seconds?: number | null;
  soundtrack_volume?: number | null;
  /** Descrição visual fixa do protagonista, usada para manter consistência em todas as imagens */
  character_sheet?: string | null;
};
