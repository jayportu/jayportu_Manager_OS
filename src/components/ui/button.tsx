import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * DROP. — Button (Type Beat).
 * Bordes 2px ink, sin border-radius, font-mono uppercase + tracking.
 * Variantes:
 *   - default: bg ink + texto orange (CTA primario)
 *   - orange:  bg orange + texto ink (CTA secundario fuerte)
 *   - outline: borde 2px ink, fondo cream
 *   - ghost:   sin borde, sin fondo
 *   - destructive: bg danger + texto blanco
 *   - secondary: alias de outline (compat retro)
 *   - link: texto subrayable
 *   - clay: botón pill clay mate (Hybrid OS)
 *   - clayPrimary: pill naranja Hybrid OS
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 border-2",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-orange border-border hover:bg-orange hover:text-ink",
        orange:
          "bg-orange text-ink border-border hover:bg-ink hover:text-orange",
        destructive:
          "bg-danger text-white dark:text-ink border-danger hover:bg-danger/90",
        outline:
          "border-border bg-transparent text-fg hover:bg-ink hover:text-orange",
        secondary:
          "border-border bg-cream text-fg hover:bg-ink hover:text-orange",
        ghost:
          "border-transparent bg-transparent text-fg hover:bg-ink hover:text-orange",
        link:
          "border-transparent bg-transparent text-orange underline-offset-4 hover:underline tracking-normal normal-case font-sans font-semibold",
        clay:
          "hos-clay-btn rounded-full border-transparent font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/85 active:translate-y-px",
        clayPrimary:
          "rounded-full border-transparent bg-[rgb(var(--drop-orange))] font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[#0B0B0B] shadow-[var(--hos-clay-btn)] active:translate-y-px",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-[10px]",
        lg: "h-12 px-6 text-[12px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
