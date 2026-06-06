import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1).max(64),
  previousText: z.string().max(2000).optional(),
  nextText: z.string().max(2000).optional(),
});

export const generatePageNarration = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY não configurada");

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_multilingual_v2",
          previous_text: data.previousText,
          next_text: data.nextText,
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.4,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) throw new Error("ElevenLabs: chave inválida (401)");
      if (res.status === 429) throw new Error("ElevenLabs: limite atingido (429)");
      throw new Error(`ElevenLabs falhou (${res.status}): ${body.slice(0, 200)}`);
    }

    const buf = await res.arrayBuffer();
    const audioBase64 = Buffer.from(buf).toString("base64");
    return { audioBase64, mimeType: "audio/mpeg" as const };
  });
