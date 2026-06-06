import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type Payload = {
  type: "image_generation.partial_image" | "image_generation.completed";
  b64_json: string;
};

export async function streamImage(
  prompt: string,
  onFrame: (b64: string, isFinal: boolean) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/admin/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("[streamImage] upstream error", res.status, body);
    if (res.status === 402) throw new Error("INSUFFICIENT_CREDITS");
    if (res.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(`Falha ao gerar imagem: ${res.status} ${body.slice(0, 200)}`);
  }

  let finalB64: string | null = null;
  const parser = createParser({
    onEvent(event) {
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      )
        return;
      let p: Payload;
      try {
        p = JSON.parse(event.data) as Payload;
      } catch {
        return;
      }
      const isFinal = event.event === "image_generation.completed";
      if (isFinal) finalB64 = p.b64_json;
      flushSync(() => onFrame(p.b64_json, isFinal));
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!finalB64) throw new Error("Stream encerrou sem imagem final");
  return finalB64;
}

export function b64ToFile(b64: string, name: string): File {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: "image/png" });
}
