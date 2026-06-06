import type { ReactNode } from "react";

export function DaySection({
  label,
  isToday,
  children,
}: {
  label: string;
  isToday: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="h-px flex-1"
          style={{
            background: isToday
              ? "linear-gradient(to right, var(--gold), transparent)"
              : "linear-gradient(to right, var(--border), transparent)",
          }}
        />
        <h2
          className="font-display shrink-0 text-[11px] font-medium uppercase tracking-widest"
          style={{ color: isToday ? "var(--gold)" : "var(--ink-soft)" }}
        >
          {label}
          {isToday && <span className="ml-1.5 opacity-80">✦</span>}
        </h2>
        <span
          className="h-px flex-1"
          style={{
            background: isToday
              ? "linear-gradient(to left, var(--gold), transparent)"
              : "linear-gradient(to left, var(--border), transparent)",
          }}
        />
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
