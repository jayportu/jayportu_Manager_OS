import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "stacked" (default) = JAY arriba + PORTU abajo, cuadrado 500x500
   *  "horizontal" = JAY PORTU en línea, 6761x984
   */
  variant?: "stacked" | "horizontal";
  /** "light" para fondos oscuros (default), "dark" para fondos claros */
  tone?: "light" | "dark";
  /** Tamaño visual. Stacked: cuadrado px. Horizontal: alto px (ancho responsive). */
  size?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({
  variant = "stacked",
  tone = "light",
  size = 64,
  className,
  priority = false,
}: LogoProps) {
  const isStacked = variant === "stacked";
  const src = isStacked
    ? `/brand/logo-mark-${tone}.png`
    : `/brand/logo-${tone}.png`;

  const width = isStacked ? size : Math.round(size * (6761 / 984));
  const height = size;
  const alt = "JAY PORTU";

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
