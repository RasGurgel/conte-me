import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Conte-me! ✦ Entrar" },
      { name: "description", content: "Entre ou crie sua conta para acessar a biblioteca." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

async function redirectByRole(
  userId: string,
  navigate: ReturnType<typeof useNavigate>,
) {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  navigate({ to: isAdmin ? "/admin" : "/" });
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) {
        void redirectByRole(data.user.id, navigate);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        void redirectByRole(session.user.id, navigate);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success(
          "Conta criada! Verifique seu e-mail para confirmar o cadastro.",
        );
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Bem-vindo!");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Não foi possível autenticar.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <header className="text-center">
          <h1 className="font-display text-3xl font-semibold text-foreground">
            {mode === "signin" ? "Entrar na biblioteca" : "Criar sua conta"}
          </h1>
          <p className="mt-2 text-sm italic text-muted-foreground">
            {mode === "signin"
              ? "Entre para ler as historinhas."
              : "Após confirmar o e-mail, você terá acesso à biblioteca."}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-5"
        >
          <label className="block text-sm">
            <span className="text-foreground">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-amber"
            />
          </label>
          <label className="block text-sm">
            <span className="text-foreground">Senha</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-amber"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-amber px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
          className="block w-full text-center text-sm text-muted-foreground underline"
        >
          {mode === "signin"
            ? "Não tem conta? Criar agora"
            : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
