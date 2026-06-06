import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { Story } from "@/types/story";
import { BookPage } from "./BookPage";
import { ProgressDots } from "./ProgressDots";
import { NarrationFab } from "./NarrationFab";
import { MusicFab } from "./MusicFab";
import { DownloadFab } from "./DownloadFab";
import { useNarration } from "@/hooks/useNarration";
import { useBackgroundMusic } from "@/hooks/useBackgroundMusic";
import { useStorySoundtrack } from "@/hooks/useStorySoundtrack";
import { useSwipe } from "@/hooks/useSwipe";
import { exportBookToPdf } from "@/lib/pdf";

export function BookReader({ story, onClose }: { story: Story; onClose: () => void }) {
  const pages = useMemo(
    () => [...story.pages].sort((a, b) => a.index - b.index),
    [story.pages],
  );
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const total = pages.length;
  const current = pages[idx];
  const hiddenStageRef = useRef<HTMLDivElement | null>(null);

  const narration = useNarration(current?.audio_url);
  const soundtrackUrl =
    typeof story.soundtrack_url === "string" ? story.soundtrack_url.trim() : "";
  const hasCustom = soundtrackUrl.length > 0;
  useEffect(() => {
    console.info("[BookReader] story:", story.id, "soundtrack:", soundtrackUrl || "(none)");
  }, [story.id, soundtrackUrl]);
  const procedural = useBackgroundMusic(!hasCustom);
  const storyTrack = useStorySoundtrack(
    hasCustom ? soundtrackUrl : null,
    story.soundtrack_volume ?? 0.18,
    hasCustom,
  );
  const music = hasCustom ? storyTrack : procedural;

  const next = () => {
    if (idx < total - 1) {
      setDir("fwd");
      setIdx((i) => i + 1);
    }
  };
  const prev = () => {
    if (idx > 0) {
      setDir("back");
      setIdx((i) => i - 1);
    }
  };

  const swipe = useSwipe({ onLeft: next, onRight: prev });

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.code === "Space") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // arm music once when narration turns on
  const prevNarrationEnabled = useRef(narration.enabled);
  useEffect(() => {
    if (!prevNarrationEnabled.current && narration.enabled) {
      music.armOnce();
    }
    prevNarrationEnabled.current = narration.enabled;
  }, [narration.enabled, music]);

  // ducking
  useEffect(() => {
    music.duck(narration.isPlaying);
  }, [narration.isPlaying, music]);

  // click side to navigate
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) next();
    else prev();
  };

  const handleDownload = async () => {
    if (!hiddenStageRef.current) return;
    const t = toast.loading("Gerando PDF…");
    try {
      await exportBookToPdf(story, hiddenStageRef.current);
      toast.success("PDF salvo!", { id: t });
    } catch (e) {
      toast.error("Falha ao gerar PDF", { id: t });
      console.error(e);
    }
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      {/* page stage */}
      <div
        className="absolute inset-0"
        onPointerDown={swipe.onPointerDown}
        onPointerUp={swipe.onPointerUp}
      >
        <div
          key={idx}
          className={dir === "fwd" ? "page-in h-full w-full" : "page-in-back h-full w-full"}
          onClick={onTap}
        >
          <BookPage page={current} title={story.title} subtitle={story.subtitle || undefined} />
        </div>
      </div>

      {/* top controls */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-foreground/80 backdrop-blur"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div />
      </div>

      <ProgressDots current={idx} total={total} />

      {/* bottom FABs */}
      <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 px-4 pb-3">
        <div className="pointer-events-auto flex items-center gap-2">
          <NarrationFab
            enabled={narration.enabled}
            playing={narration.isPlaying}
            disabled={!narration.hasAudio}
            onClick={narration.toggle}
          />
          <MusicFab enabled={music.enabled} onClick={music.toggle} />
        </div>
        <div className="pointer-events-auto">
          <DownloadFab onDownload={handleDownload} onClose={onClose} />
        </div>
      </div>

      {/* hidden stage used for PDF generation */}
      <div
        ref={hiddenStageRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          width: 720,
          pointerEvents: "none",
          opacity: 0,
        }}
      >
        {pages.map((p, i) => (
          <div
            key={i}
            data-pdf-page
            style={{ width: 720, height: 1080, overflow: "hidden" }}
          >
            <BookPage page={p} title={story.title} subtitle={story.subtitle || undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}
