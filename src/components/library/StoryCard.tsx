import { Lock } from "lucide-react";
import type { Story } from "@/types/story";

type Props = {
  story: Story;
  state: "past" | "today" | "future";
  onOpen: () => void;
};

export function StoryCard({ story, state, onOpen }: Props) {
  const locked = state === "future";
  const isToday = state === "today";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`card-rise press-active relative flex w-full items-stretch gap-0 overflow-hidden rounded-2xl text-left transition-transform ${
        locked ? "cursor-default opacity-50 [filter:grayscale(0.45)]" : ""
      }`}
      style={{
        background: "var(--color-card)",
        boxShadow: isToday
          ? "0 0 0 2px var(--gold), 0 10px 32px -6px oklch(0.45 0.10 62 / 0.28)"
          : "0 4px 20px -6px oklch(0.22 0.06 52 / 0.20), 0 1px 3px -1px oklch(0.22 0.06 52 / 0.10)",
      }}
      aria-disabled={locked}
    >
      {/* Cover image */}
      <div className="relative h-[110px] w-[110px] shrink-0 overflow-hidden bg-secondary">
        {story.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.cover_url}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">
            {story.emoji || "📖"}
          </div>
        )}
        {isToday && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, transparent 60%, oklch(0.73 0.16 65 / 0.14))",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-3 pl-3.5 pr-3">
        {isToday && (
          <span
            className="w-fit rounded-full px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-widest"
            style={{
              background: "var(--gold)",
              color: "oklch(0.99 0.01 80)",
            }}
          >
            ✦ hoje
          </span>
        )}
        <h3 className="font-display truncate text-[1.05rem] font-semibold leading-snug text-foreground">
          {story.title}
        </h3>
        {story.subtitle && (
          <p className="truncate text-xs italic text-muted-foreground">{story.subtitle}</p>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {story.tags?.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-[2px] text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {locked && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
