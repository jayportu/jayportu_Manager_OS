import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * Solo disponible "stacked" — JAY arriba + PORTU abajo, cuadrado 500x500.
   *
   * Nota: en versiones anteriores existía "horizontal" pero los PNGs eran
   * incorrectos. Para mantener compatibilidad con call sites antiguos, la
   * prop sigue existiendo pero siempre renderiza el stacked. Si querés
   * un logo horizontal real, agregá un PNG nuevo y actualizá este file.
   */
  variant?: "stacked" | "horizontal";
  /** "light" para fondos oscuros (default), "dark" para fondos claros */
  tone?: "light" | "dark";
  /** Tamaño cuadrado en px */
  size?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({
  tone = "light",
  size = 64,
  className,
  priority = false,
}: LogoProps) {
  const src = `/brand/logo-mark-${tone}.png`;
  const alt = "JAY PORTU";

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
