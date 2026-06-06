import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  SOUNDTRACK_INSTRUMENTS,
  buildSoundtrackPrompt,
} from "./soundtrackPrompt";

const StyleEnum = z.enum([
  "lullaby",
  "orchestral-light",
  "acoustic-folk",
  "soft-jazz",
  "magical-fantasy",
  "joyful-adventure",
  "dreamy-ambient",
]);

const IntensityEnum = z.enum(["calm", "balanced", "vibrant"]);

const Input = z.object({
  style: StyleEnum,
  bpm: z.number().int().min(50).max(160),
  intensity: IntensityEnum,
  instruments: z
    .array(z.enum(SOUNDTRACK_INSTRUMENTS))
    .max(6)
    .default([]),
  durationSeconds: z.number().int().min(20).max(120),
  moodTags: z.array(z.string().min(1).max(40)).max(10).default([]),
  extraPrompt: z.string().max(300).optional(),
});

export const generateStorySoundtrack = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY não configurada");

    const prompt = buildSoundtrackPrompt({
      style: data.style,
      bpm: data.bpm,
      intensity: data.intensity,
      instruments: data.instruments,
      moodTags: data.moodTags,
      extraPrompt: data.extraPrompt,
    });

    const res = await fetch("https://api.elevenlabs.io/v1/music", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: data.durationSeconds * 1000,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("ElevenLabs: chave inválida (401)");
      if (res.status === 402) throw new Error("ElevenLabs: créditos insuficientes (402)");
      if (res.status === 429) throw new Error("ElevenLabs: limite atingido (429)");
      throw new Error(`ElevenLabs Music falhou (${res.status}): ${body.slice(0, 200)}`);
    }

    const buf = await res.arrayBuffer();
    const audioBase64 = Buffer.from(buf).toString("base64");
    return {
      audioBase64,
      mimeType: "audio/mpeg" as const,
      prompt,
    };
  });
