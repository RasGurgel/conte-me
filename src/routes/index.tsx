import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Story } from "@/types/story";
import { StoryCard } from "@/components/library/StoryCard";
import { DaySection } from "@/components/library/DaySection";
import { EmptyLibrary } from "@/components/library/EmptyLibrary";
import { BottomNav } from "@/components/library/BottomNav";
import { BookReader } from "@/components/reader/BookReader";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conte-me! Biblioteca" },
      {
        name: "description",
        content: "Uma historinha por dia, para dormir bem.",
      },
    ],
  }),
  component: LibraryPage,
});

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function formatLongDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function LibraryPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<"checking" | "ok">("checking");
  const [stories, setStories] = useState<Story[] | null>(null);
  const [reading, setReading] = useState<Story | null>(null);
  const today = todayISO();

  // Auth guard: require login to access library
  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        navigate({ to: "/auth" });
      } else {
        setAuthState("ok");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const load = async () => {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("date", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar biblioteca");
      setStories([]);
      return;
    }
    setStories((data || []) as unknown as Story[]);
  };

  useEffect(() => {
    if (authState === "ok") void load();
  }, [authState]);

  const grouped = useMemo(() => {
    const map = new Map<string, Story[]>();
    (stories ?? []).forEach((s) => {
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [stories]);

  if (authState === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  if (reading)
    return <BookReader key={reading.id} story={reading} onClose={() => setReading(null)} />;

  return (
    <div className="min-h-dvh pb-24">
      <header className="safe-top mx-auto max-w-md px-5 pt-4 pb-3 flex flex-col items-center">
        <h1 className="sr-only">Conte-me!</h1>
        <BrandLogo size="lg" />
        <p className="mt-2 text-xs italic text-muted-foreground text-center">
          uma historinha por dia, para dormir bem
        </p>
      </header>

      <main className="mx-auto max-w-md px-4">
        {stories === null ? (
          <div className="space-y-3 pt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[110px] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : stories.length === 0 ? (
          <EmptyLibrary />
        ) : (
          <div className="space-y-7 pt-2">
            {grouped.map(([date, items]) => (
              <DaySection key={date} label={formatLongDate(date)} isToday={date === today}>
                {items.map((s) => {
                  const state =
                    s.date < today ? "past" : s.date === today ? "today" : "future";
                  return (
                    <StoryCard
                      key={s.id}
                      story={s}
                      state={state}
                      onOpen={() => {
                        if (state === "future") {
                          toast(`🔒 Disponível em ${formatLongDate(s.date)}`);
                          return;
                        }
                        if (!s.pages?.length) {
                          toast("Esta história ainda não tem páginas.");
                          return;
                        }
                        setReading(s);
                      }}
                    />
                  );
                })}
              </DaySection>
            ))}
          </div>
        )}
      </main>

      <BottomNav active="library" />
    </div>
  );
}
