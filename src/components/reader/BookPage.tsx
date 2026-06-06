import type { Page } from "@/types/story";

function bgStyle(url?: string): React.CSSProperties {
  return url
    ? { backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "var(--cream)" };
}

export function BookPage({ page, title, subtitle }: { page: Page; title?: string; subtitle?: string }) {
  const layout = page.layout;

  if (layout === "cover") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={bgStyle(page.image_url)}>
        <div
          className="absolute inset-x-0 bottom-0 h-[55%]"
          style={{
            background:
              "linear-gradient(to top, var(--cream) 12%, oklch(0.97 0.025 80 / 0.85) 50%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-8 pb-24 text-center">
          {title && <h1 className="book-title">{title}</h1>}
          {subtitle && <p className="book-subtitle">{subtitle}</p>}
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-foreground/55">
            deslize para começar →
          </p>
        </div>
      </div>
    );
  }

  if (layout === "top-image") {
    return (
      <div className="flex h-full w-full flex-col" style={{ background: "var(--cream)" }}>
        <div className="h-[58%] w-full" style={bgStyle(page.image_url)} />
        <div className="flex flex-1 items-center justify-center px-6 py-5">
          <p className="book-text text-center">{page.text}</p>
        </div>
      </div>
    );
  }

  if (layout === "wide-scene-soft-block") {
    return (
      <div className="flex h-full w-full flex-col" style={{ background: "var(--cream)" }}>
        <div className="h-[62%] w-full" style={bgStyle(page.image_url)} />
        <div className="flex flex-1 items-center justify-center px-5 py-5">
          <div className="soft-block max-w-[92%]">
            <p className="book-text text-center">{page.text}</p>
          </div>
        </div>
      </div>
    );
  }

  if (layout === "center-character") {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-between px-5"
        style={{ background: "var(--cream)", paddingTop: "5vh", paddingBottom: "5vh" }}
      >
        {page.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.image_url}
            alt=""
            className="mx-auto rounded-[18px] object-contain"
            style={{ maxHeight: "58vh" }}
          />
        ) : (
          <div />
        )}
        <p className="book-text px-2 text-center">{page.text}</p>
      </div>
    );
  }

  if (layout === "full-art-footer-text") {
    return (
      <div className="relative h-full w-full overflow-hidden" style={bgStyle(page.image_url)}>
        <div
          className="absolute inset-x-0 bottom-0 h-[45%]"
          style={{
            background:
              "linear-gradient(to top, var(--cream) 15%, oklch(0.97 0.025 80 / 0.8) 60%, transparent 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 px-8 pb-20 text-center">
          <p className="book-text">{page.text}</p>
        </div>
      </div>
    );
  }

  if (layout === "minimal-final") {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-8 px-6"
        style={{ background: "var(--cream)" }}
      >
        {page.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.image_url}
            alt=""
            className="rounded-[16px] object-contain"
            style={{ maxHeight: "55vh" }}
          />
        )}
        <p className="book-text italic text-center">{page.text || "Fim."}</p>
      </div>
    );
  }

  // default: bg-image-text-card
  const top = page.text_position === "top";
  return (
    <div className="relative h-full w-full overflow-hidden" style={bgStyle(page.image_url)}>
      <div
        className="absolute inset-x-0 h-[55%]"
        style={{
          top: top ? 0 : "auto",
          bottom: top ? "auto" : 0,
          background: top
            ? "linear-gradient(to bottom, oklch(0.97 0.025 80 / 0.9), transparent)"
            : "linear-gradient(to top, oklch(0.97 0.025 80 / 0.9), transparent)",
        }}
      />
      <div
        className={`absolute inset-x-0 px-5 ${top ? "top-0 pt-16" : "bottom-0 pb-20"}`}
      >
        <div className="text-card mx-auto max-w-[92%]">
          <p className="book-text">{page.text}</p>
        </div>
      </div>
    </div>
  );
}
