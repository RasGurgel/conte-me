import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/images/generations";

export const Route = createFileRoute("/api/admin/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt } = (await request.json()) as { prompt?: string };
        if (!prompt || typeof prompt !== "string") {
          return new Response("prompt obrigatório", { status: 400 });
        }
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!lovableKey) {
          return new Response("LOVABLE_API_KEY ausente", { status: 500 });
        }

        const upstream = await fetch(GATEWAY, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
            stream: true,
          }),
          signal: request.signal,
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          console.error("[generate-image] lovable ai error", upstream.status, errText);
          if (upstream.status === 402) {
            return new Response(
              "Créditos da Lovable AI esgotados. Adicione créditos em Settings → Workspace → Usage.",
              { status: 402 },
            );
          }
          return new Response(errText || "Falha ao gerar imagem", {
            status: upstream.status,
          });
        }

        // Encaminha o SSE diretamente para o cliente — streamImage.ts já parseia
        // image_generation.partial_image e image_generation.completed.
        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
