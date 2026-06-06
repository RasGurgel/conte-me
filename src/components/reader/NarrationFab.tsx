import { Volume2, VolumeX } from "lucide-react";

type Props = {
  enabled: boolean;
  playing: boolean;
  disabled: boolean;
  onClick: () => void;
};

export function NarrationFab({ enabled, playing, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Narração"
      className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
        playing ? "animate-gold-ring" : ""
      } disabled:opacity-30`}
      style={
        enabled
          ? {
              background: "var(--gold)",
              color: "oklch(0.99 0.01 80)",
              boxShadow: "0 4px 16px -4px oklch(0.73 0.16 65 / 0.55)",
            }
          : {
              background: "oklch(0.18 0.038 52 / 0.65)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              color: "oklch(0.72 0.022 70)",
            }
      }
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
