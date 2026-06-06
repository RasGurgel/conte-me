import { Download, X } from "lucide-react";

export function DownloadFab({
  onDownload,
  onClose,
}: {
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDownload}
        aria-label="Baixar PDF"
        className="flex h-10 items-center gap-1.5 rounded-full bg-foreground/15 px-3 text-xs font-medium text-foreground/80 opacity-55 backdrop-blur transition hover:opacity-100"
      >
        <Download className="h-4 w-4" /> PDF
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/15 text-foreground/80 opacity-55 backdrop-blur transition hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
