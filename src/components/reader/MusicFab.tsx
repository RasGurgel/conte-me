import { Music } from "lucide-react";

export function MusicFab({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Música de fundo"
      className="relative flex h-11 w-11 items-center justify-center rounded-full transition"
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
      <Music className="h-4 w-4" />
      {!enabled && (
        <span
          className="pointer-events-none absolute h-[2px] w-6 rotate-45 rounded"
          style={{ background: "oklch(0.72 0.022 70)" }}
        />
      )}
    </button>
  );
}
