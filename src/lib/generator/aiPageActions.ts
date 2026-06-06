import { streamImage, b64ToFile } from "./streamImage";
import { imagePromptFor, type StyleKey } from "./prompts";
import { uploadCover, uploadPageImage, uploadPageAudio } from "@/lib/storage";

export type GenerateImageParams = {
  storyId: string;
  pageIndex: number;
  scenePrompt: string;
  characterSheet?: string | null;
  characters?: string[];
  style?: StyleKey;
  isCover?: boolean;
  onFrame?: (b64: string, isFinal: boolean) => void;
  signal?: AbortSignal;
};

export async function generatePageImage({
  storyId,
  pageIndex,
  scenePrompt,
  characterSheet,
  characters,
  style = "watercolor",
  isCover = false,
  onFrame,
  signal,
}: GenerateImageParams): Promise<string> {
  const prompt = imagePromptFor(
    style,
    scenePrompt,
    characterSheet ?? undefined,
    characters,
  );
  const finalB64 = await streamImage(prompt, (b64, isFinal) => {
    onFrame?.(b64, isFinal);
  }, signal);
  const file = b64ToFile(finalB64, `page-${pageIndex}.png`);
  return isCover
    ? uploadCover(storyId, file)
    : uploadPageImage(storyId, pageIndex, file);
}

export type GenerateAudioParams = {
  storyId: string;
  pageIndex: number;
  text: string;
  previousText?: string;
  nextText?: string;
  voiceId: string;
  narrate: (args: {
    data: {
      text: string;
      voiceId: string;
      previousText?: string;
      nextText?: string;
    };
  }) => Promise<{ audioBase64: string; mimeType: string }>;
};

export async function generatePageAudio({
  storyId,
  pageIndex,
  text,
  previousText,
  nextText,
  voiceId,
  narrate,
}: GenerateAudioParams): Promise<string> {
  const { audioBase64 } = await narrate({
    data: { text, voiceId, previousText, nextText },
  });
  const bin = atob(audioBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = new File([bytes], `page-${pageIndex}.mp3`, {
    type: "audio/mpeg",
  });
  return uploadPageAudio(storyId, pageIndex, file);
}
