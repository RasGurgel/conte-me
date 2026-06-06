import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import type { Page, Story } from "@/types/story";
import { supabase } from "@/integrations/supabase/client";
import { uploadCover } from "@/lib/storage";
import { generatePageImage } from "@/lib/generator/aiPageActions";
import { generateScenePrompt } from "@/lib/generator/scenePrompt.functions";
import { PageItem } from "./PageItem";
import { SoundtrackSection } from "./SoundtrackSection";

type Props = {
  open: boolean;
  story: Story | null;
  onClose: () => void;
  onSaved: () => void;
};

function emptyDraft(): Story {
  const id =
    (typeof crypto !== "undefined" && "randomUUID" in crypto && crypto.randomUUID()) ||
    `tmp-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);
  return {
    id,
    title: "",
    subtitle: "",
    date: today,
    emoji: "📖",
    tags: [],
    cover_url: null,
    pages: [{ index: 0, text: "", layout: "cover", text_position: "bottom" }],
  };
}

export function StorySheet({ open, story, onClose, onSaved }: Props) {
  const inferScene = useServerFn(generateScenePrompt);
  const [draft, setDraft] = useState<Story>(() => story ?? emptyDraft());
  const [tagInput, setTagInput] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<{ b64: string; isFinal: boolean } | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const coverInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(story ?? emptyDraft());
      setTagInput((story?.tags ?? []).join(", "));
      setCoverPrompt("");
      setCoverPreview(null);
    }
  }, [open, story]);

  const update = <K extends keyof Story>(k: K, v: Story[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const updatePages = (pages: Page[]) =>
    setDraft((d) => ({ ...d, pages: pages.map((p, i) => ({ ...p, index: i })) }));

  const handleCover = async (file?: File) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadCover(draft.id, file);
      update("cover_url", url);
      toast.success("Capa carregada");
    } catch (e) {
      toast.error("Erro ao enviar capa");
      console.error(e);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGenerateCover = async () => {
    setGeneratingCover(true);
    setCoverPreview(null);
    try {
      let scene = coverPrompt.trim();
      let characters: string[] | undefined;
      if (!scene) {
        toast.info("✨ Gerando descrição da capa…");
        const plot = draft.pages
          .filter((p) => p.layout !== "cover" && p.text)
          .map((p) => p.text.trim())
          .filter(Boolean)
          .join(" ")
          .slice(0, 2000);
        const inferred = await inferScene({
          data: {
            storyTitle: draft.title,
            storySubtitle: draft.subtitle ?? "",
            characterSheet: draft.character_sheet ?? "",
            pageText: "",
            isCover: true,
            storyPlot: plot,
          },
        });
        scene = inferred.image_prompt;
        characters = inferred.characters;
      }
      const url = await generatePageImage({
        storyId: draft.id,
        pageIndex: 0,
        scenePrompt: scene,
        characterSheet: draft.character_sheet,
        characters,
        isCover: true,
        onFrame: (b64, isFinal) => setCoverPreview({ b64, isFinal }),
      });
      update("cover_url", url);
      setCoverPreview(null);
      toast.success("✦ Capa gerada");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      if (msg === "INSUFFICIENT_CREDITS") {
        toast.error("Sem créditos para gerar imagem");
      } else if (msg === "RATE_LIMITED") {
        toast.error("Limite de requisições atingido");
      } else if (msg.includes("504") || msg.toLowerCase().includes("timeout")) {
        toast.error("Tempo esgotado ao gerar capa — tente novamente");
      } else {
        toast.error(msg ? `Erro ao gerar capa: ${msg.slice(0, 120)}` : "Erro ao gerar capa");
      }
    } finally {
      setGeneratingCover(false);
    }
  };

  const isUploading = uploadingCover || generatingCover;

  const save = async () => {
    if (!draft.title.trim()) return toast.warning("⚠️ Título obrigatório");
    if (!draft.date) return toast.warning("⚠️ Data obrigatória");
    if (!draft.pages.length) return toast.warning("⚠️ Adicione ao menos 1 página");

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setSaving(true);
    const payload = {
      id: draft.id,
      title: draft.title.trim(),
      subtitle: draft.subtitle?.trim() || null,
      date: draft.date,
      emoji: draft.emoji || "📖",
      tags,
      cover_url: draft.cover_url || null,
      pages: draft.pages,
      character_sheet: draft.character_sheet?.trim() || null,
      soundtrack_url: draft.soundtrack_url ?? null,
      soundtrack_prompt: draft.soundtrack_prompt ?? null,
      soundtrack_style: draft.soundtrack_style ?? null,
      soundtrack_bpm: draft.soundtrack_bpm ?? null,
      soundtrack_intensity: draft.soundtrack_intensity ?? null,
      soundtrack_instruments: draft.soundtrack_instruments ?? null,
      soundtrack_duration_seconds: draft.soundtrack_duration_seconds ?? null,
      soundtrack_volume: draft.soundtrack_volume ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("stories").upsert(payload);
    setSaving(false);
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      return;
    }
    toast.success("✅ História salva com sucesso!");
    onSaved();
    onClose();
  };

  const sheet = useMemo(
    () => (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="mt-auto flex max-h-[92vh] flex-col rounded-t-3xl bg-background shadow-2xl"
          style={{
            animation: "sheet-up 300ms cubic-bezier(0.32, 0.72, 0, 1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              {story ? "Editar história" : "Nova historinha"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Título *
                <input
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Subtítulo
                <input
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                  value={draft.subtitle ?? ""}
                  onChange={(e) => update("subtitle", e.target.value)}
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Descrição visual do protagonista (character sheet)
                <textarea
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                  rows={2}
                  placeholder="ex.: girl ~6yo, shoulder-length brown hair, big curious eyes, yellow dress with white collar, red sneakers"
                  value={draft.character_sheet ?? ""}
                  onChange={(e) => update("character_sheet", e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-muted-foreground">
                  Data *
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                    value={draft.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Emoji
                  <input
                    maxLength={2}
                    className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-center text-lg outline-none focus:border-ring"
                    value={draft.emoji}
                    onChange={(e) => update("emoji", e.target.value)}
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                Tags (separadas por vírgula)
                <input
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="lua, sono, animais"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Capa</p>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={generatingCover}
                className="mt-1 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-background text-sm text-muted-foreground hover:bg-secondary disabled:opacity-60"
              >
                {generatingCover ? (
                  coverPreview ? (
                    <img
                      src={`data:image/png;base64,${coverPreview.b64}`}
                      alt=""
                      className={`h-full w-full object-cover transition-[filter] ${coverPreview.isFinal ? "" : "blur-md"}`}
                    />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )
                ) : uploadingCover ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : draft.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.cover_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  "Selecionar imagem de capa"
                )}
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCover(e.target.files?.[0])}
              />
              <label className="block text-xs font-medium text-muted-foreground">
                Descrição da cena da capa para IA (opcional, em inglês)
                <textarea
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
                  rows={2}
                  placeholder="Deixe em branco para a IA inferir a partir do título, character bible e enredo das páginas"
                  value={coverPrompt}
                  onChange={(e) => setCoverPrompt(e.target.value)}
                />
              </label>
              <button
                type="button"
                onClick={handleGenerateCover}
                disabled={generatingCover || uploadingCover}
                className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-amber/15 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-amber/25 disabled:opacity-60"
              >
                {generatingCover ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Gerar capa com IA
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Páginas</p>
                <button
                  type="button"
                  onClick={() =>
                    updatePages([
                      ...draft.pages,
                      {
                        index: draft.pages.length,
                        text: "",
                        layout: "bg-image-text-card",
                        text_position: "bottom",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground"
                >
                  <Plus className="h-3 w-3" /> Adicionar página
                </button>
              </div>
              <div className="space-y-2">
                {draft.pages.map((p, i) => (
                  <PageItem
                    key={i}
                    storyId={draft.id}
                    page={p}
                    total={draft.pages.length}
                    story={draft}
                    pages={draft.pages}
                    onChange={(np) => {
                      const next = [...draft.pages];
                      next[i] = np;
                      updatePages(next);
                    }}
                    onMove={(dir) => {
                      const next = [...draft.pages];
                      const j = i + dir;
                      if (j < 0 || j >= next.length) return;
                      [next[i], next[j]] = [next[j], next[i]];
                      updatePages(next);
                    }}
                    onRemove={() => {
                      const next = draft.pages.filter((_, idx) => idx !== i);
                      updatePages(next.length ? next : [
                        { index: 0, text: "", layout: "cover", text_position: "bottom" },
                      ]);
                    }}
                  />
                ))}
            </div>

            <SoundtrackSection
              story={draft}
              onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            />
          </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3 safe-bottom">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isUploading || saving}
              onClick={save}
              className="flex flex-[2] items-center justify-center gap-2 rounded-full bg-amber px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar na Biblioteca
            </button>
          </div>
        </div>
      </div>
    ),
    // we intentionally rebuild on relevant state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, tagInput, uploadingCover, generatingCover, coverPreview, coverPrompt, saving, story, open],
  );

  if (!open) return null;
  return sheet;
}
