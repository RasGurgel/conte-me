import { useEffect, useState } from "react";

export function ProgressDots({ current, total }: { current: number; total: number }) {
  const [showLabel, setShowLabel] = useState(true);
  useEffect(() => {
    setShowLabel(true);
    const t = window.setTimeout(() => setShowLabel(false), 3000);
    return () => clearTimeout(t);
  }, [current]);

  if (total <= 1) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-1.5">
      {total <= 14 ? (
        <div className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-300"
              style={
                i === current
                  ? {
                      width: "8px",
                      height: "8px",
                      background: "var(--gold)",
                      boxShadow: "0 0 7px oklch(0.73 0.16 65 / 0.70)",
                    }
                  : {
                      width: "5px",
                      height: "5px",
                      background: "oklch(0.50 0.02 70 / 0.38)",
                    }
              }
            />
          ))}
        </div>
      ) : (
        <div
          className="relative h-[3px] w-[40%] overflow-hidden rounded-full"
          style={{ background: "oklch(0.50 0.02 70 / 0.22)" }}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full transition-[width]"
            style={{
              width: `${((current + 1) / total) * 100}%`,
              background: "var(--gold)",
              boxShadow: "0 0 4px oklch(0.73 0.16 65 / 0.60)",
            }}
          />
        </div>
      )}
      <span
        className={`text-[10px] font-medium uppercase tracking-widest transition-opacity duration-500 ${
          showLabel ? "opacity-100" : "opacity-0"
        }`}
        style={{ color: "oklch(0.55 0.02 70 / 0.65)" }}
      >
        {current + 1} / {total}
      </span>
    </div>
  );
}
