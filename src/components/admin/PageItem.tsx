import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles, Mic, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import type { Page, PageLayout, Story } from "@/types/story";
import { uploadPageAudio, uploadPageImage, uploadCover } from "@/lib/storage";
import { generatePageImage, generatePageAudio } from "@/lib/generator/aiPageActions";
import { generatePageNarration } from "@/lib/generator/narration.functions";
import { generateScenePrompt } from "@/lib/generator/scenePrompt.functions";
import { DEFAULT_VOICE_ID } from "@/lib/generator/voices";

const LAYOUTS: { value: PageLayout; label: string }[] = [
  { value: "cover", label: "Capa" },
  { value: "bg-image-text-card", label: "Imagem + card de texto" },
  { value: "top-image", label: "Imagem no topo" },
  { value: "wide-scene-soft-block", label: "Cena ampla + bloco" },
  { value: "center-character", label: "Personagem centralizado" },
  { value: "full-art-footer-text", label: "Arte cheia + texto rodapé" },
  { value: "minimal-final", label: "Final minimalista" },
];

type Props = {
  storyId: string;
  page: Page;
  total: number;
  story: Story;
  voiceId?: string;
  pages: Page[];
  onChange: (next: Page) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
};

export function PageItem({
  storyId,
  page,
  total,
  story,
  voiceId = DEFAULT_VOICE_ID,
  pages,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const narrate = useServerFn(generatePageNarration);
  const inferScene = useServerFn(generateScenePrompt);
  const [open, setOpen] = useState(true);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [generatingImg, setGeneratingImg] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [preview, setPreview] = useState<{ b64: string; isFinal: boolean } | null>(null);
  const imgRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLInputElement | null>(null);

  const isCover = page.layout === "cover";

  const handleImage = async (file?: File) => {
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = isCover
        ? await uploadCover(storyId, file)
        : await uploadPageImage(storyId, page.index, file);
      onChange({ ...page, image_url: url });
      toast.success("Imagem carregada");
    } catch (e) {
      toast.error("Erro ao enviar imagem");
      console.error(e);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleAudio = async (file?: File) => {
    if (!file) return;
    setUploadingAudio(true);
    try {
      const url = await uploadPageAudio(storyId, page.index, file);
      onChange({ ...page, audio_url: url });
      toast.success("Áudio carregado");
    } catch (e) {
      toast.error("Erro ao enviar áudio");
      console.error(e);
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleGenerateImage = async () => {
    setGeneratingImg(true);
    setPreview(null);
    try {
      let scene = (page.image_prompt || "").trim();
      let characters = page.characters;
      if (!scene) {
        toast.info("✨ Gerando descrição da cena…");
        const prev = pages[page.index - 1]?.text;
        const next = pages[page.index + 1]?.text;
        const inferred = await inferScene({
          data: {
            storyTitle: story.title,
            storySubtitle: story.subtitle ?? "",
            characterSheet: story.character_sheet ?? "",
            pageText: page.text || "",
            isCover,
            previousText: prev || "",
            nextText: next || "",
          },
        });
        scene = inferred.image_prompt;
        if (!characters || characters.length === 0) characters = inferred.characters;
        onChange({ ...page, image_prompt: scene, characters });
      }
      const url = await generatePageImage({
        storyId,
        pageIndex: page.index,
        scenePrompt: scene,
        characterSheet: story.character_sheet,
        characters,
        isCover,
        onFrame: (b64, isFinal) => setPreview({ b64, isFinal }),
      });
      onChange({ ...page, image_prompt: scene, characters, image_url: url });
      setPreview(null);
      toast.success("✦ Imagem gerada");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      if (msg === "INSUFFICIENT_CREDITS") {
        toast.error("Sem créditos para gerar imagem");
      } else if (msg === "RATE_LIMITED") {
        toast.error("Limite de requisições atingido");
      } else if (msg.includes("504") || msg.toLowerCase().includes("timeout")) {
        toast.error("Tempo esgotado ao gerar imagem — tente novamente");
      } else {
        toast.error(msg ? `Erro ao gerar imagem: ${msg.slice(0, 120)}` : "Erro ao gerar imagem");
      }
    } finally {
      setGeneratingImg(false);
    }
  };

  const narrationText = (): string => {
    if (isCover) {
      return [story.title, story.subtitle]
        .map((s) => s?.trim() || "")
        .filter(Boolean)
        .join(". ");
    }
    return page.text || "";
  };

  const handleGenerateAudio = async () => {
    const text = narrationText().trim();
    if (!text) {
      toast.error(
        isCover
          ? "Defina o título (e subtítulo) da história para narrar a capa."
          : "Página sem texto para narrar.",
      );
      return;
    }
    const prevPage = pages[page.index - 1];
    const nextPage = pages[page.index + 1];
    const prev =
      prevPage?.layout === "cover"
        ? [story.title, story.subtitle].filter(Boolean).join(". ")
        : prevPage?.text;
    const next =
      nextPage?.layout === "cover"
        ? [story.title, story.subtitle].filter(Boolean).join(". ")
        : nextPage?.text;

    setGeneratingAudio(true);
    try {
      const url = await generatePageAudio({
        storyId,
        pageIndex: page.index,
        text,
        previousText: prev || undefined,
        nextText: next || undefined,
        voiceId,
        narrate,
      });
      onChange({ ...page, audio_url: url });
      toast.success("✦ Narração gerada");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar narração");
    } finally {
      setGeneratingAudio(false);
    }
  };

  const imgBusy = uploadingImg || generatingImg;
  const audioBusy = uploadingAudio || generatingAudio;

  return (
    <div className="rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-1 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span className="font-display flex h-7 w-7 items-center justify-center rounded-full bg-amber-light text-sm font-semibold text-foreground">
            {page.index + 1}
          </span>
          <span className="text-sm font-medium text-foreground">
            {LAYOUTS.find((l) => l.value === page.layout)?.label || page.layout}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={page.index === 0}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-30"
          aria-label="Mover para cima"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={page.index === total - 1}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary disabled:opacity-30"
          aria-label="Mover para baixo"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-full text-rose hover:bg-secondary"
          aria-label="Remover página"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          {isCover ? (
            <div className="rounded-lg bg-amber/10 px-3 py-2 text-[11px] text-foreground/80">
              A capa narra automaticamente o <strong>título</strong> e o <strong>subtítulo</strong> da história. Não há texto de corpo nesta página.
            </div>
          ) : (
            <label className="block text-xs font-medium text-muted-foreground">
              Texto da página
              <textarea
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                rows={4}
                value={page.text}
                onChange={(e) => onChange({ ...page, text: e.target.value })}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Layout
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                value={page.layout}
                onChange={(e) =>
                  onChange({ ...page, layout: e.target.value as PageLayout })
                }
              >
                {LAYOUTS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Posição do texto
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                value={page.text_position || "bottom"}
                onChange={(e) =>
                  onChange({
                    ...page,
                    text_position: e.target.value as Page["text_position"],
                  })
                }
              >
                <option value="top">Topo</option>
                <option value="middle">Meio</option>
                <option value="bottom">Rodapé</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-muted-foreground">
            Descrição da cena para IA (opcional, em inglês)
            <textarea
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
              rows={2}
              placeholder="Deixe em branco para a IA inferir a cena automaticamente a partir do texto + character bible"
              value={page.image_prompt ?? ""}
              onChange={(e) => onChange({ ...page, image_prompt: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => imgRef.current?.click()}
                className="relative flex h-[72px] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground hover:bg-secondary"
              >
                {imgBusy ? (
                  preview ? (
                    <img
                      src={`data:image/png;base64,${preview.b64}`}
                      alt=""
                      className={`h-full w-full rounded-lg object-cover transition-[filter] ${preview.isFinal ? "" : "blur-md"}`}
                    />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )
                ) : page.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.image_url}
                    alt=""
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  "Imagem"
                )}
              </button>
              <input
                ref={imgRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={imgBusy}
                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-amber/15 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-amber/25 disabled:opacity-60"
              >
                {generatingImg ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Gerar imagem com IA
              </button>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => audioRef.current?.click()}
                className="flex h-[72px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background text-xs text-muted-foreground hover:bg-secondary"
              >
                {audioBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : page.audio_url ? (
                  <>
                    <span>🎵 áudio carregado</span>
                    <span className="text-[10px]">(toque para substituir)</span>
                  </>
                ) : (
                  "Áudio (MP3)"
                )}
              </button>
              <input
                ref={audioRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleAudio(e.target.files?.[0])}
              />
              <button
                type="button"
                onClick={handleGenerateAudio}
                disabled={audioBusy}
                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-amber/15 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-amber/25 disabled:opacity-60"
              >
                {generatingAudio ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Mic className="h-3 w-3" />
                )}
                Gerar narração com IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
