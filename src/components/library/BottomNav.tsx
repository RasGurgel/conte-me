import { Link } from "@tanstack/react-router";
import { BookOpenText, PencilLine } from "lucide-react";

export function BottomNav({ active }: { active: "library" | "admin" }) {
  const isLib = active === "library";
  const isAdmin = active === "admin";

  const activeStyle = {
    color: "var(--gold)",
    textShadow: "0 0 10px oklch(0.73 0.16 65 / 0.35)",
  };
  const inactiveStyle = { color: "oklch(0.58 0.022 68)" };
  const iconGlow = { filter: "drop-shadow(0 0 5px oklch(0.73 0.16 65 / 0.55))" };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 safe-bottom"
      style={{
        background: "oklch(0.18 0.038 52 / 0.93)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid oklch(0.73 0.16 65 / 0.18)",
        boxShadow: "0 -4px 24px oklch(0.14 0.04 52 / 0.28)",
      }}
    >
      <div className="mx-auto flex max-w-md">
        <Link
          to="/"
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium tracking-wide transition-all"
          style={isLib ? activeStyle : inactiveStyle}
        >
          <span style={isLib ? iconGlow : undefined}>
            <BookOpenText className="h-5 w-5" />
          </span>
          Biblioteca
          {isLib && (
            <span
              className="absolute bottom-0 h-[2px] w-8 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--gold), transparent)",
              }}
            />
          )}
        </Link>

        <Link
          to="/admin"
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium tracking-wide transition-all"
          style={isAdmin ? activeStyle : inactiveStyle}
        >
          <span style={isAdmin ? iconGlow : undefined}>
            <PencilLine className="h-5 w-5" />
          </span>
          Admin
          {isAdmin && (
            <span
              className="absolute bottom-0 h-[2px] w-8 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, transparent, var(--gold), transparent)",
              }}
            />
          )}
        </Link>
      </div>
    </nav>
  );
}
