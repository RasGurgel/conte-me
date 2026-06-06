import { Pencil, Trash2 } from "lucide-react";
import type { Story } from "@/types/story";

export function AdminStoryCard({
  story,
  onEdit,
  onDelete,
}: {
  story: Story;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
        {story.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            {story.emoji}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display truncate text-base font-semibold text-foreground">
          {story.title}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {story.date} · {story.pages.length} página{story.pages.length === 1 ? "" : "s"}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        aria-label="Editar"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-9 w-9 items-center justify-center rounded-full text-rose hover:bg-secondary"
        aria-label="Excluir"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
