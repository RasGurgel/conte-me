import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type GateState = "checking" | "denied" | "ok";

function AdminLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState<GateState>("checking");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userErr || !userRes.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userRes.user.id);
      if (cancelled) return;
      if (rolesErr) {
        setReason(rolesErr.message);
        setState("denied");
        return;
      }
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!isAdmin) {
        setReason(
          "Sua conta ainda não tem permissão de administrador. Peça para liberarem o acesso.",
        );
        setState("denied");
        return;
      }
      setState("ok");
    };

    void check();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (state === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Verificando acesso…
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-5 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Acesso negado
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">{reason}</p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="rounded-full bg-amber px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Sair e entrar com outra conta
        </button>
        <a href="/" className="text-xs text-muted-foreground underline">
          Voltar à biblioteca
        </a>
      </div>
    );
  }

  return <Outlet />;
}
