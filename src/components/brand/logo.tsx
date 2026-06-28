import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * "wordmark" = `DROP.` completo (default).
   * "monogram" = `D.` solo, para favicons/badges/sidebars compactos.
   * `stacked` y `horizontal` se preservan por retrocompatibilidad — ambos
   * renderizan el wordmark.
   */
  variant?: "wordmark" | "monogram" | "stacked" | "horizontal";
  /**
   * Tono del texto:
   * - "ink" (default) → texto INK sobre fondos claros (CREAM/WHITE)
   * - "cream" → texto CREAM sobre fondos oscuros (INK)
   * - "orange" → texto ORANGE
   *
   * Aliases legacy: "light" (= cream, para fondos oscuros) y
   * "dark" (= ink, para fondos claros) siguen siendo válidos.
   */
  tone?: "ink" | "cream" | "orange" | "light" | "dark";
  /** Tamaño del wordmark en px. */
  size?: number;
  /** Clase extra. */
  className?: string;
  /** No tiene efecto, se preserva por compat (era para next/image priority). */
  priority?: boolean;
}

function resolveTone(tone: LogoProps["tone"]): "ink" | "cream" | "orange" {
  if (tone === "light") return "cream";
  if (tone === "dark") return "ink";
  return tone ?? "ink";
}

const TONE_COLOR: Record<"ink" | "cream" | "orange", string> = {
  // "ink" = color de texto principal. Usa el token themable --drop-fg para que
  // el wordmark se vea en ambos temas: en light = #0A0A0A (idéntico al hex
  // anterior), en dark = #F7F7F7 (antes quedaba negro-sobre-negro invisible
  // en las pantallas de auth, que ahora son oscuras).
  ink: "rgb(var(--drop-fg))",
  cream: "#F4EFE7",
  orange: "#E85A0C",
};

/**
 * DROP. wordmark — renderizado como texto Satoshi Black + punto naranja.
 * El punto SIEMPRE va en orange #E85A0C (naranjo canónico), salvo cuando el
 * wordmark mismo es orange (caso extremo, el punto pasa a cream para contraste).
 */
export function Logo({
  variant = "wordmark",
  tone = "ink",
  size = 48,
  className,
}: LogoProps) {
  const color = resolveTone(tone);
  const isMonogram = variant === "monogram";
  const text = isMonogram ? "D" : "DROP";
  const dotColor = color === "orange" ? "#F4EFE7" : "#E85A0C";

  return (
    <span
      className={cn("inline-flex items-baseline select-none", className)}
      style={{
        fontFamily: "var(--font-satoshi), system-ui, sans-serif",
        fontWeight: 900,
        fontSize: `${size}px`,
        lineHeight: 0.9,
        letterSpacing: "-0.02em",
        color: TONE_COLOR[color],
      }}
      aria-label={isMonogram ? "DROP" : "DROP."}
    >
      {text}
      <span aria-hidden="true" style={{ color: dotColor, marginLeft: "-0.06em" }}>.</span>
    </span>
  );
}
