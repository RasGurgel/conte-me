import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const BUILD_MARKER = "mobile-fix-2026-06-01";
const BUILD_KEY = "conte-me.build";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-6xl font-semibold text-foreground">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A historinha que você procurava não está aqui.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-amber px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar à biblioteca
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold text-foreground">
          Algo deu errado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente em instantes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-amber px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Tentar de novo
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no",
      },
      { httpEquiv: "Cache-Control", content: "no-cache, no-store, must-revalidate" },
      { httpEquiv: "Pragma", content: "no-cache" },
      { httpEquiv: "Expires", content: "0" },
      { title: "Conte-me! Histórias para dormir bem" },
      {
        name: "description",
        content: "Uma historinha por dia, para dormir bem.",
      },
      { name: "theme-color", content: "#f7f0e0" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Conte-me!" },
      { property: "og:title", content: "Conte-me! Histórias para dormir bem" },
      {
        property: "og:description",
        content: "Uma historinha por dia, para dormir bem.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Conte-me! Histórias para dormir bem" },
      { name: "description", content: "Biblioteca de Historinhas Infantis para fazer dormir" },
      { property: "og:description", content: "Biblioteca de Historinhas Infantis para fazer dormir" },
      { name: "twitter:description", content: "Biblioteca de Historinhas Infantis para fazer dormir" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e7c93d61-14a6-40c7-9371-2ad64bd08e8f/id-preview-4ef7ac46--92365b56-d301-495f-b60b-db731926274d.lovable.app-1780185821804.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e7c93d61-14a6-40c7-9371-2ad64bd08e8f/id-preview-4ef7ac46--92365b56-d301-495f-b60b-db731926274d.lovable.app-1780185821804.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Build version check: if the device is loading from a stale HTML shell
    // (PWA installed before this version), force a single hard reload with a
    // cache-busting query string so the next navigation fetches fresh HTML.
    try {
      const stored = localStorage.getItem(BUILD_KEY);
      if (stored !== BUILD_MARKER) {
        localStorage.setItem(BUILD_KEY, BUILD_MARKER);
        const url = new URL(window.location.href);
        if (!url.searchParams.has("v")) {
          url.searchParams.set("v", Date.now().toString());
          window.location.replace(url.toString());
          return;
        }
      }
    } catch {
      /* ignore */
    }
    if (!("serviceWorker" in navigator)) return;
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => undefined)));
      } catch {
        /* ignore */
      }
      try {
        if (typeof caches !== "undefined") {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n).catch(() => undefined)));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}

