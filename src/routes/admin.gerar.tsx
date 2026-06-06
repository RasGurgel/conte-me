import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, RefreshCw, ArrowLeft, Send, ImageIcon, Volume2, Mic } from "lucide-react";
import { toast } from "sonner";
import type { Page, Story } from "@/types/story";
import { generateStoryDraft, type StoryDraft } from "@/lib/generator/story.functions";
import {
  AGE_RANGES,
  TONES,
  VISUAL_STYLES,
  imagePromptFor,
  type Brief,
  type StyleKey,
} from "@/lib/generator/prompts";
import { streamImage, b64ToFile } from "@/lib/generator/streamImage";
import { uploadCover, uploadPageImage, uploadPageAudio } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { generatePageNarration } from "@/lib/generator/narration.functions";
import { NARRATION_VOICES, DEFAULT_VOICE_ID } from "@/lib/generator/voices";
import { BRIEF_SESSION_KEY, parseBriefJson } from "@/lib/generator/briefImport";
import { SoundtrackSection } from "@/components/admin/SoundtrackSection";

export const Route = createFileRoute("/admin/gerar")({
  head: () => ({
    meta: [{ title: "Conte-me! Gerar com IA" }],
  }),
  component: GeneratorPage,
});

type Stage = "brief" | "generating-text" | "preview";

function newId() {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tmp-${Date.now()}`) as string;
}

function GeneratorPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateStoryDraft);
  const narrate = useServerFn(generatePageNarration);

  const [stage, setStage] = useState<Stage>("brief");
  const [brief, setBrief] = useState<Brief>(() => {
    const defaults: Brief = {
      theme: "",
      character: "",
      characterSheet: "",
      setting: "",
      age: "4-6",
      tone: "calmo",
      pageCount: 18,
      style: "watercolor",
      surprise: false,
    };
    if (typeof window === "undefined") return defaults;
    try {
      const raw = sessionStorage.getItem(BRIEF_SESSION_KEY);
      if (!raw) return defaults;
      sessionStorage.removeItem(BRIEF_SESSION_KEY);
      const { brief: imported } = parseBriefJson(raw);
      queueMicrotask(() =>
        toast.success("✦ Briefing importado — revise e gere"),
      );
      return imported;
    } catch {
      return defaults;
    }
  });

  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const storyIdRef = useRef<string>(newId());

  // per-page state: previews (b64) + final URLs (after upload)
  const [previews, setPreviews] = useState<Record<number, { b64: string; isFinal: boolean }>>({});
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [busyPages, setBusyPages] = useState<Set<number>>(new Set());
  const [busyAudio, setBusyAudio] = useState<Set<number>>(new Set());
  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [soundtrack, setSoundtrack] = useState<Partial<Story>>({});
  const abortRef = useRef<AbortController | null>(null);

  const update = <K extends keyof Brief>(k: K, v: Brief[K]) =>
    setBrief((b) => ({ ...b, [k]: v }));

  const startTextGen = async () => {
    setStage("generating-text");
    try {
      const result = await generate({ data: brief });
      setDraft(result);
      setPreviews({});
      setImageUrls({});
      setAudioUrls({});
      setSoundtrack({});
      storyIdRef.current = newId();
      setStage("preview");
      toast.success("✦ Rascunho de texto gerado");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erro ao gerar texto";
      toast.error(msg, { duration: 8000 });
      setStage("brief");
    }
  };

  const editPageText = (idx: number, text: string) => {
    if (!draft) return;
    const pages = [...draft.pages];
    pages[idx] = { ...pages[idx], text };
    setDraft({ ...draft, pages });
    // texto mudou: invalida narração anterior
    if (audioUrls[idx]) {
      setAudioUrls((m) => {
        const n = { ...m };
        delete n[idx];
        return n;
      });
    }
  };

  const editPageCharacters = (idx: number, characters: string[]) => {
    if (!draft) return;
    const pages = [...draft.pages];
    pages[idx] = { ...pages[idx], characters };
    setDraft({ ...draft, pages });
  };

  const editCharacterSheet = (character_sheet: string) => {
    if (!draft) return;
    setDraft({ ...draft, character_sheet });
  };

  // Texto que será narrado: a capa narra título + subtítulo; demais páginas narram seu texto.
  const narrationTextFor = (pageIdx: number, d = draft): string => {
    if (!d) return "";
    const p = d.pages[pageIdx];
    if (p?.layout === "cover") {
      return [d.title, d.subtitle].map((s) => s?.trim() || "").filter(Boolean).join(". ");
    }
    return p?.text ?? "";
  };

  // Quando título ou subtítulo mudam, invalida a narração da capa.
  const updateMeta = (patch: Partial<StoryDraft>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    const coverIdx = next.pages.findIndex((p) => p.layout === "cover");
    if (coverIdx >= 0 && audioUrls[coverIdx] && (patch.title !== undefined || patch.subtitle !== undefined)) {
      setAudioUrls((m) => {
        const n = { ...m };
        delete n[coverIdx];
        return n;
      });
    }
  };


  const regenerateImage = async (idx: number) => {
    if (!draft) return;
    const page = draft.pages[idx];
    const prompt = imagePromptFor(
      brief.style,
      page.image_prompt,
      draft.character_sheet,
      page.characters,
    );

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusyPages((s) => new Set(s).add(idx));
    try {
      const finalB64 = await streamImage(
        prompt,
        (b64, isFinal) => setPreviews((p) => ({ ...p, [idx]: { b64, isFinal } })),
        ctrl.signal,
      );
      const file = b64ToFile(finalB64, `page-${idx}.png`);
      const url =
        idx === 0
          ? await uploadCover(storyIdRef.current, file)
          : await uploadPageImage(storyIdRef.current, idx, file);
      setImageUrls((m) => ({ ...m, [idx]: url }));
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      if (msg === "INSUFFICIENT_CREDITS") {
        toast.error("Conta Replicate sem créditos", {
          description:
            "Adicione billing em replicate.com/account/billing e tente novamente em alguns minutos.",
        });
        throw e;
      }
      if (msg === "RATE_LIMITED") {
        toast.error(`Limite de requisições atingido (página ${idx + 1})`);
        throw e;
      }
      toast.error(`Erro na imagem da página ${idx + 1}`);
    } finally {
      setBusyPages((s) => {
        const n = new Set(s);
        n.delete(idx);
        return n;
      });
    }
  };

  const generateAllImages = async () => {
    if (!draft) return;
    toast.message("Gerando ilustrações…", {
      description: `${draft.pages.length} imagens — pode levar 1–2 minutos`,
    });
    let stopped = false;
    let doneCount = 0;
    for (let i = 0; i < draft.pages.length; i++) {
      if (imageUrls[i]) continue;
      try {
        await regenerateImage(i);
        doneCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "INSUFFICIENT_CREDITS" || msg === "RATE_LIMITED") {
          stopped = true;
          const remaining = draft.pages.length - i;
          toast.error(
            `Geração interrompida — ${remaining} página(s) restante(s).`,
          );
          break;
        }
      }
    }
    if (!stopped) toast.success("✦ Ilustrações prontas");
  };


  const regenerateAudio = async (idx: number) => {
    if (!draft) return;
    const text = narrationTextFor(idx);
    if (!text.trim()) {
      toast.error(`Página ${idx + 1} sem texto para narrar`);
      return;
    }
    const prev = idx > 0 ? narrationTextFor(idx - 1) : undefined;
    const next = idx < draft.pages.length - 1 ? narrationTextFor(idx + 1) : undefined;
    setBusyAudio((s) => new Set(s).add(idx));
    try {
      const { audioBase64 } = await narrate({
        data: { text, voiceId, previousText: prev, nextText: next },
      });
      const bin = atob(audioBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const file = new File([bytes], `page-${idx}.mp3`, { type: "audio/mpeg" });
      const url = await uploadPageAudio(storyIdRef.current, idx, file);
      setAudioUrls((m) => ({ ...m, [idx]: url }));
    } catch (e) {
      console.error(e);
      toast.error(`Erro na narração da página ${idx + 1}`);
    } finally {
      setBusyAudio((s) => {
        const n = new Set(s);
        n.delete(idx);
        return n;
      });
    }
  };

  const generateAllAudio = async () => {
    if (!draft) return;
    toast.message("Gerando narrações…", {
      description: `${draft.pages.length} áudios — pode levar alguns minutos`,
    });
    for (let i = 0; i < draft.pages.length; i++) {
      if (!audioUrls[i]) await regenerateAudio(i);
    }
    toast.success("✦ Narrações prontas");
  };

  const sendToSheet = async () => {
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.warning("⚠️ Título obrigatório");
      return;
    }
    if (!draft.pages.length) {
      toast.warning("⚠️ Adicione ao menos 1 página");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const pages: Page[] = draft.pages.map((p, i) => ({
      index: i,
      text: p.text,
      layout: p.layout,
      text_position: p.text_position,
      image_url: imageUrls[i],
      audio_url: audioUrls[i],
    }));
    const story: Story = {
      id: storyIdRef.current,
      title: draft.title,
      subtitle: draft.subtitle || null,
      date: today,
      emoji: draft.emoji || "📖",
      tags: draft.tags,
      cover_url: imageUrls[0] ?? null,
      pages,
      soundtrack_url: soundtrack.soundtrack_url ?? null,
      soundtrack_prompt: soundtrack.soundtrack_prompt ?? null,
      soundtrack_style: soundtrack.soundtrack_style ?? null,
      soundtrack_bpm: soundtrack.soundtrack_bpm ?? null,
      soundtrack_intensity: soundtrack.soundtrack_intensity ?? null,
      soundtrack_instruments: soundtrack.soundtrack_instruments ?? null,
      soundtrack_duration_seconds: soundtrack.soundtrack_duration_seconds ?? null,
      soundtrack_volume: soundtrack.soundtrack_volume ?? null,
      character_sheet: draft.character_sheet ?? null,
    };

    const payload = {
      ...story,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("stories").upsert(payload);
    if (error) {
      console.error(error);
      toast.error(`Erro ao salvar: ${error.message}`, { duration: 8000 });
      // fallback: stash so user can retry from the sheet
      try {
        sessionStorage.setItem("contame:pendingStory", JSON.stringify(story));
      } catch {
        /* noop */
      }
      return;
    }
    toast.success("✅ História salva na biblioteca");
    void navigate({ to: "/admin" });
  };

  const generatedCount = useMemo(
    () => Object.keys(imageUrls).length,
    [imageUrls],
  );
  const audioCount = useMemo(() => Object.keys(audioUrls).length, [audioUrls]);

  return (
    <div className="min-h-dvh pb-32">
      <header className="safe-top mx-auto max-w-2xl px-5 pt-4 pb-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/admin" })}
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao painel
        </button>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Gerar com IA <Sparkles className="inline h-5 w-5 text-amber" />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Texto e ilustrações geradas. A narração em áudio você sobe depois no painel.
        </p>
      </header>

      <main className="mx-auto max-w-2xl px-4">
        {stage === "brief" && (
          <BriefForm
            brief={brief}
            update={update}
            onSubmit={startTextGen}
          />
        )}

        {stage === "generating-text" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-amber" />
            <p className="text-sm text-muted-foreground">Escrevendo a historinha…</p>
          </div>
        )}

        {stage === "preview" && draft && (
          <PreviewBoard
            draft={draft}
            previews={previews}
            imageUrls={imageUrls}
            audioUrls={audioUrls}
            busyPages={busyPages}
            busyAudio={busyAudio}
            generatedCount={generatedCount}
            audioCount={audioCount}
            voiceId={voiceId}
            onChangeVoice={setVoiceId}
            onEditText={editPageText}
            onEditCharacters={editPageCharacters}
            onEditCharacterSheet={editCharacterSheet}
            onRegenerate={regenerateImage}
            onGenerateAll={generateAllImages}
            onRegenerateAudio={regenerateAudio}
            onGenerateAllAudio={generateAllAudio}
            onUpdateMeta={updateMeta}
            storyId={storyIdRef.current}
            soundtrack={soundtrack}
            onSoundtrackChange={(patch) => setSoundtrack((s) => ({ ...s, ...patch }))}
          />

        )}
      </main>

      {stage === "preview" && draft && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur safe-bottom">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <button
              type="button"
              onClick={() => setStage("brief")}
              className="rounded-full bg-secondary px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Recomeçar
            </button>
            <span className="ml-2 text-xs text-muted-foreground">
              {generatedCount}/{draft.pages.length} img · {audioCount}/{draft.pages.length} áudio
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={generateAllImages}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-secondary px-3 py-2.5 text-sm font-medium text-foreground"
              >
                <ImageIcon className="h-4 w-4" /> Imagens
              </button>
              <button
                type="button"
                onClick={generateAllAudio}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber/50 bg-secondary px-3 py-2.5 text-sm font-medium text-foreground"
              >
                <Mic className="h-4 w-4" /> Narrações
              </button>
              <button
                type="button"
                onClick={sendToSheet}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm"
              >
                <Send className="h-4 w-4" /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Briefing form ---------------- */

function BriefForm({
  brief,
  update,
  onSubmit,
}: {
  brief: Brief;
  update: <K extends keyof Brief>(k: K, v: Brief[K]) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <label className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm">
        <input
          type="checkbox"
          checked={brief.surprise}
          onChange={(e) => update("surprise", e.target.checked)}
        />
        <span>
          <span className="font-medium">Surpreenda-me</span> — a IA inventa tudo
        </span>
      </label>

      <fieldset disabled={brief.surprise} className="space-y-3 disabled:opacity-50">
        <label className="block text-xs font-medium text-muted-foreground">
          Tema / ideia curta
          <input
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
            value={brief.theme ?? ""}
            placeholder="ursinho que escuta o pomar"
            onChange={(e) => update("theme", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Personagem principal
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
              value={brief.character ?? ""}
              placeholder="ursinho Bento"
              onChange={(e) => update("character", e.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Cenário
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
              value={brief.setting ?? ""}
              placeholder="pomar encantado ao entardecer"
              onChange={(e) => update("setting", e.target.value)}
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-muted-foreground">
          Descrição visual do personagem (opcional — a IA preenche se vazio)
          <textarea
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
            rows={3}
            value={brief.characterSheet ?? ""}
            placeholder="Ex.: Tutti, menino de 5 anos, pele clara, cabelo castanho ondulado curto, olhos castanhos grandes, camiseta amarela com listras brancas, short azul, tênis vermelhos."
            onChange={(e) => update("characterSheet", e.target.value)}
          />
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            Essa descrição é injetada em todas as imagens para manter o mesmo personagem em todas as páginas.
          </span>
        </label>
      </fieldset>


      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-medium text-muted-foreground">
          Faixa etária
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
            value={brief.age}
            onChange={(e) => update("age", e.target.value as Brief["age"])}
          >
            {AGE_RANGES.map((a) => (
              <option key={a} value={a}>
                {a} anos
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-muted-foreground">
          Tom
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
            value={brief.tone}
            onChange={(e) => update("tone", e.target.value as Brief["tone"])}
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-medium text-muted-foreground">
        Nº de páginas: <span className="text-foreground">{brief.pageCount}</span>
        <input
          type="range"
          min={8}
          max={40}
          value={brief.pageCount}
          onChange={(e) => update("pageCount", Number(e.target.value))}
          className="mt-1 w-full"
        />
      </label>

      <label className="block text-xs font-medium text-muted-foreground">
        Estilo visual
        <select
          className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
          value={brief.style}
          onChange={(e) => update("style", e.target.value as StyleKey)}
        >
          {Object.entries(VISUAL_STYLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm"
      >
        <Sparkles className="h-4 w-4" /> Gerar prévia
      </button>
    </form>
  );
}

/* ---------------- Preview board ---------------- */

function PreviewBoard({
  draft,
  previews,
  imageUrls,
  audioUrls,
  busyPages,
  busyAudio,
  generatedCount,
  audioCount,
  voiceId,
  onChangeVoice,
  onEditText,
  onEditCharacters,
  onEditCharacterSheet,
  onRegenerate,
  onGenerateAll,
  onRegenerateAudio,
  onGenerateAllAudio,
  onUpdateMeta,
  storyId,
  soundtrack,
  onSoundtrackChange,
}: {
  draft: StoryDraft;
  previews: Record<number, { b64: string; isFinal: boolean }>;
  imageUrls: Record<number, string>;
  audioUrls: Record<number, string>;
  busyPages: Set<number>;
  busyAudio: Set<number>;
  generatedCount: number;
  audioCount: number;
  voiceId: string;
  onChangeVoice: (id: string) => void;
  onEditText: (idx: number, text: string) => void;
  onEditCharacters: (idx: number, characters: string[]) => void;
  onEditCharacterSheet: (sheet: string) => void;
  onRegenerate: (idx: number) => void;
  onGenerateAll: () => void;
  onRegenerateAudio: (idx: number) => void;
  onGenerateAllAudio: () => void;
  onUpdateMeta: (patch: Partial<StoryDraft>) => void;
  storyId: string;
  soundtrack: Partial<Story>;
  onSoundtrackChange: (patch: Partial<Story>) => void;
}) {

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-display text-sm font-medium text-muted-foreground">Metadados</h2>
        <label className="block text-xs text-muted-foreground">
          Título
          <input
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
            value={draft.title}
            onChange={(e) => onUpdateMeta({ title: e.target.value })}
          />
        </label>
        <label className="block text-xs text-muted-foreground">
          Subtítulo
          <input
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
            value={draft.subtitle ?? ""}
            onChange={(e) => onUpdateMeta({ subtitle: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <label className="block text-xs text-muted-foreground">
            Emoji
            <input
              maxLength={4}
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-center text-lg"
              value={draft.emoji}
              onChange={(e) => onUpdateMeta({ emoji: e.target.value })}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Tags (vírgula)
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
              value={draft.tags.join(", ")}
              onChange={(e) =>
                onUpdateMeta({
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-amber/40 bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber" />
          <h2 className="font-display text-sm font-medium text-foreground">
            Character Bible
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Descrição visual fixa do personagem — injetada em <strong>toda</strong> imagem para manter o mesmo rosto, roupa e cores em todas as páginas. Edite antes de gerar.
        </p>
        <textarea
          className="w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
          rows={4}
          value={draft.character_sheet}
          onChange={(e) => onEditCharacterSheet(e.target.value)}
        />
      </section>



      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-amber" />
          <h2 className="font-display text-sm font-medium text-foreground">Narração</h2>
        </div>
        <label className="block text-xs text-muted-foreground">
          Voz
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground"
            value={voiceId}
            onChange={(e) => onChangeVoice(e.target.value)}
          >
            {NARRATION_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} — {v.description}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onGenerateAllAudio}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Mic className="h-3 w-3" />
          {audioCount === 0
            ? "Gerar todas as narrações"
            : `Gerar faltantes (${draft.pages.length - audioCount})`}
        </button>
      </section>

      <SoundtrackSection
        story={{
          id: storyId,
          title: draft.title,
          date: new Date().toISOString().slice(0, 10),
          emoji: draft.emoji || "📖",
          tags: draft.tags,
          pages: [],
          ...soundtrack,
        }}
        onChange={onSoundtrackChange}
      />



      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-medium text-muted-foreground">
            Páginas ({draft.pages.length})
          </h2>
          {generatedCount === 0 && (
            <button
              type="button"
              onClick={onGenerateAll}
              className="rounded-full bg-amber px-3 py-1 text-xs font-medium text-primary-foreground"
            >
              Gerar todas as imagens
            </button>
          )}
        </div>
        {draft.pages.map((p, i) => (
          <PagePreviewCard
            key={i}
            index={i}
            text={p.text}
            characters={p.characters}
            preview={previews[i]}
            url={imageUrls[i]}
            audioUrl={audioUrls[i]}
            busy={busyPages.has(i)}
            busyAudio={busyAudio.has(i)}
            onEditText={(t) => onEditText(i, t)}
            onEditCharacters={(c) => onEditCharacters(i, c)}
            onRegenerate={() => onRegenerate(i)}
            onRegenerateAudio={() => onRegenerateAudio(i)}
          />
        ))}

      </section>
    </div>
  );
}

function PagePreviewCard({
  index,
  text,
  characters,
  preview,
  url,
  audioUrl,
  busy,
  busyAudio,
  onEditText,
  onEditCharacters,
  onRegenerate,
  onRegenerateAudio,
}: {
  index: number;
  text: string;
  characters: string[];
  preview?: { b64: string; isFinal: boolean };
  url?: string;
  audioUrl?: string;
  busy: boolean;
  busyAudio: boolean;
  onEditText: (t: string) => void;
  onEditCharacters: (c: string[]) => void;
  onRegenerate: () => void;
  onRegenerateAudio: () => void;
}) {

  const src = url ?? (preview ? `data:image/png;base64,${preview.b64}` : null);
  const blurred = !url && preview && !preview.isFinal;

  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {src ? (
          <img
            src={src}
            alt=""
            className={`h-full w-full object-cover transition-[filter] ${
              blurred ? "blur-md" : "blur-0"
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            sem imagem
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40">
            <Loader2 className="h-4 w-4 animate-spin text-amber" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Página {index + 1}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={busyAudio}
              onClick={onRegenerateAudio}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-foreground disabled:opacity-50"
            >
              {busyAudio ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
              {audioUrl ? "Refazer áudio" : "Narrar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-foreground disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" />
              {url ? "Refazer" : "Gerar"}
            </button>
          </div>
        </div>
        <textarea
          className="min-h-[72px] w-full resize-none rounded-lg border border-input bg-background p-2 text-xs text-foreground outline-none focus:border-ring"
          value={text}
          onChange={(e) => onEditText(e.target.value)}
        />
        <label className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          Personagens na cena (separe por vírgula)
          <input
            className="mt-0.5 w-full rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-ring"
            value={characters.join(", ")}
            placeholder="Tutti"
            onChange={(e) =>
              onEditCharacters(
                e.target.value
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        {audioUrl && (
          <audio controls src={audioUrl} className="h-8 w-full" preload="none" />
        )}

      </div>
    </div>
  );
}
