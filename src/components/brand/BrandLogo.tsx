import logo from "@/assets/logo-conte-me.png";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  sm: "h-12",
  md: "h-16",
  lg: "h-28 sm:h-32",
};

export function BrandLogo({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <img
      src={logo}
      alt="Conte-me! Histórias Infantis"
      draggable={false}
      loading="eager"
      decoding="async"
      className={`${sizeMap[size]} w-auto select-none drop-shadow-sm ${className}`}
    />
  );
}
