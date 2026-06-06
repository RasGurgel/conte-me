import { useMemo, useState } from "react";
import { Loader2, Music2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import type {
  SoundtrackIntensity,
  SoundtrackStyle,
  Story,
} from "@/types/story";
import { generateStorySoundtrack } from "@/lib/generator/soundtrack.functions";
import {
  SOUNDTRACK_INSTRUMENTS,
  SOUNDTRACK_INTENSITIES,
  SOUNDTRACK_STYLES,
} from "@/lib/generator/soundtrackPrompt";
import { uploadSoundtrack } from "@/lib/storage";

type Props = {
  story: Story;
  onChange: (patch: Partial<Story>) => void;
};

const DURATIONS = [30, 60, 90, 120] as const;
const BPM_PRESETS: { value: number; label: string }[] = [
  { value: 65, label: "Lento (60–80)" },
  { value: 95, label: "Moderado (80–110)" },
  { value: 125, label: "Animado (110–140)" },
];

function base64ToFile(b64: string, mime: string, filename: string): File {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export function SoundtrackSection({ story, onChange }: Props) {
  const generate = useServerFn(generateStorySoundtrack);

  const [style, setStyle] = useState<SoundtrackStyle>(
    (story.soundtrack_style as SoundtrackStyle) || "lullaby",
  );
  const [bpm, setBpm] = useState<number>(story.soundtrack_bpm ?? 70);
  const [intensity, setIntensity] = useState<SoundtrackIntensity>(
    (story.soundtrack_intensity as SoundtrackIntensity) || "calm",
  );
  const [instruments, setInstruments] = useState<string[]>(
    story.soundtrack_instruments ?? ["piano", "harp"],
  );
  const [duration, setDuration] = useState<number>(
    story.soundtrack_duration_seconds ?? 60,
  );
  const [extraPrompt, setExtraPrompt] = useState("");
  const [volume, setVolume] = useState<number>(story.soundtrack_volume ?? 0.18);
  const [generating, setGenerating] = useState(false);

  const moodTags = useMemo(() => story.tags ?? [], [story.tags]);

  const toggleInstrument = (name: string) => {
    setInstruments((prev) =>
      prev.includes(name)
        ? prev.filter((i) => i !== name)
        : prev.length >= 6
          ? prev
          : [...prev, name],
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const t = toast.loading("Compondo trilha sonora…");
    try {
      const result = await generate({
        data: {
          style,
          bpm,
          intensity,
          instruments: instruments as (typeof SOUNDTRACK_INSTRUMENTS)[number][],
          durationSeconds: duration,
          moodTags,
          extraPrompt: extraPrompt.trim() || undefined,
        },
      });
      const file = base64ToFile(result.audioBase64, result.mimeType, "soundtrack.mp3");
      const url = await uploadSoundtrack(story.id, file);
      onChange({
        soundtrack_url: url,
        soundtrack_prompt: result.prompt,
        soundtrack_style: style,
        soundtrack_bpm: bpm,
        soundtrack_intensity: intensity,
        soundtrack_instruments: instruments,
        soundtrack_duration_seconds: duration,
        soundtrack_volume: volume,
      });
      toast.success("Trilha gerada e salva!", { id: t });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar trilha";
      toast.error(msg, { id: t });
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleRemove = () => {
    onChange({
      soundtrack_url: null,
      soundtrack_prompt: null,
    });
    toast.success("Trilha removida");
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2">
        <Music2 className="h-4 w-4 text-amber" />
        <h3 className="font-display text-sm font-semibold text-foreground">
          Trilha sonora
        </h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          ElevenLabs Music
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Compose uma trilha original instrumental, infantil e gentil, que toca em loop
        suave sob a narração da historinha.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted-foreground">
          Estilo / gênero
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
            value={style}
            onChange={(e) => setStyle(e.target.value as SoundtrackStyle)}
          >
            {SOUNDTRACK_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Intensidade
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as SoundtrackIntensity)}
          >
            {SOUNDTRACK_INTENSITIES.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Ritmo
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
            value={
              BPM_PRESETS.find((p) => Math.abs(p.value - bpm) <= 15)?.value ?? 95
            }
            onChange={(e) => setBpm(Number(e.target.value))}
          >
            {BPM_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-muted-foreground">
          Duração
          <select
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Instrumentos em destaque (até 6)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SOUNDTRACK_INSTRUMENTS.map((name) => {
            const active = instruments.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleInstrument(name)}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground hover:bg-secondary/70"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block text-xs font-medium text-muted-foreground">
        Prompt extra (opcional)
        <textarea
          className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm text-foreground outline-none focus:border-ring"
          rows={2}
          maxLength={300}
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
          placeholder="ex.: ambiente de floresta encantada, sininhos sutis…"
        />
      </label>

      <label className="block text-xs font-medium text-muted-foreground">
        Volume padrão no leitor: {Math.round(volume * 100)}%
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            setVolume(v);
            if (story.soundtrack_url) onChange({ soundtrack_volume: v });
          }}
          className="mt-1 w-full accent-amber"
        />
      </label>

      {story.soundtrack_url && (
        <div className="rounded-lg border border-border/60 bg-background p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Pré-ouvir</p>
          <audio
            key={story.soundtrack_url}
            controls
            src={story.soundtrack_url}
            className="w-full"
          />
          {story.soundtrack_prompt && (
            <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
              <span className="font-medium">Prompt:</span> {story.soundtrack_prompt}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-full bg-amber px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {story.soundtrack_url ? "Regenerar trilha" : "Gerar trilha"}
        </button>
        {story.soundtrack_url && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={generating}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary/70 disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
