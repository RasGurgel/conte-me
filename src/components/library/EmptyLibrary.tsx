import { Link } from "@tanstack/react-router";
import { Moon } from "lucide-react";

export function EmptyLibrary() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-5 px-6 py-20 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full"
        style={{
          background: "radial-gradient(circle, oklch(0.73 0.16 65 / 0.14), transparent 70%)",
          border: "1px solid oklch(0.73 0.16 65 / 0.28)",
          boxShadow: "0 0 24px oklch(0.73 0.16 65 / 0.10)",
        }}
      >
        <Moon
          className="h-9 w-9"
          style={{ color: "var(--gold)" }}
          strokeWidth={1.5}
        />
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          A biblioteca está vazia
        </h2>
        <p className="text-sm italic leading-relaxed text-muted-foreground">
          Nenhuma historinha por aqui ainda.
          <br />
          Que tal criar a primeira?
        </p>
      </div>

      <Link
        to="/admin"
        className="mt-1 rounded-full px-6 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95"
        style={{
          background: "var(--gold)",
          color: "oklch(0.99 0.01 80)",
          boxShadow: "0 4px 18px -4px oklch(0.73 0.16 65 / 0.48)",
        }}
      >
        Abrir painel Admin
      </Link>
    </div>
  );
}
