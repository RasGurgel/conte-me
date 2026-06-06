import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const BUILD_MARKER = "mobile-fix-2026-06-01";

export const Route = createFileRoute("/diagnostico-mobile")({
  head: () => ({
    meta: [
      { title: "Diagnóstico mobile — Conte-me!" },
      { name: "description", content: "Verificação de versão e cache no dispositivo." },
    ],
  }),
  component: DiagnosticoMobile,
});

type Info = {
  url: string;
  loadedAt: string;
  ua: string;
  swSupported: boolean;
  swControlled: boolean;
  swRegistrations: number;
  cacheNames: string[];
  musicEnabled: string | null;
  badgeInDom: boolean;
};

function DiagnosticoMobile() {
  const [info, setInfo] = useState<Info | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const collect = async (): Promise<Info> => {
    const swSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
    let swRegistrations = 0;
    let swControlled = false;
    if (swSupported) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        swRegistrations = regs.length;
        swControlled = !!navigator.serviceWorker.controller;
      } catch {
        /* ignore */
      }
    }
    let cacheNames: string[] = [];
    try {
      if (typeof caches !== "undefined") cacheNames = await caches.keys();
    } catch {
      /* ignore */
    }
    let musicEnabled: string | null = null;
    try {
      musicEnabled = localStorage.getItem("book.music.enabled");
    } catch {
      /* ignore */
    }
    const badgeInDom =
      typeof document !== "undefined" &&
      !!document.body?.innerText?.toLowerCase().includes("edit with lovable");
    return {
      url: typeof window !== "undefined" ? window.location.href : "",
      loadedAt: new Date().toISOString(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      swSupported,
      swControlled,
      swRegistrations,
      cacheNames,
      musicEnabled,
      badgeInDom,
    };
  };

  useEffect(() => {
    void collect().then(setInfo);
  }, []);

  const handleClean = async () => {
    setCleaning(true);
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
      }
      if (typeof caches !== "undefined") {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n).catch(() => undefined)));
      }
      try {
        const keep = localStorage.getItem("book.music.enabled");
        localStorage.clear();
        if (keep !== null) localStorage.setItem("book.music.enabled", keep);
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
    window.location.replace("/?v=" + Date.now());
  };

  return (
    <div className="min-h-dvh bg-background px-5 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <header className="text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Diagnóstico mobile
          </h1>
          <p className="mt-1 text-xs italic text-muted-foreground">
            Verifica a versão e o cache deste dispositivo
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Versão do build</h2>
          <p className="mt-1 font-mono text-base text-amber">{BUILD_MARKER}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Se este marcador aparecer no celular, o aparelho está na versão nova.
          </p>
        </section>

        {info ? (
          <section className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            <Row label="URL" value={info.url} mono />
            <Row label="Carregado em" value={info.loadedAt} mono />
            <Row label="SW suportado" value={String(info.swSupported)} />
            <Row label="SW controlando" value={String(info.swControlled)} />
            <Row label="SW registrados" value={String(info.swRegistrations)} />
            <Row
              label="Caches"
              value={info.cacheNames.length ? info.cacheNames.join(", ") : "(nenhum)"}
              mono
            />
            <Row label="book.music.enabled" value={String(info.musicEnabled)} />
            <Row label="Badge no DOM" value={String(info.badgeInDom)} />
            <Row label="User-Agent" value={info.ua} mono />
          </section>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Coletando informações…
          </div>
        )}

        <button
          onClick={handleClean}
          disabled={cleaning}
          className="w-full rounded-full bg-amber px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {cleaning ? "Limpando…" : "Limpar cache e recarregar"}
        </button>

        <a
          href="/"
          className="block text-center text-sm text-muted-foreground underline"
        >
          Voltar à biblioteca
        </a>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/50 py-1 last:border-b-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={mono ? "break-all font-mono text-xs text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
