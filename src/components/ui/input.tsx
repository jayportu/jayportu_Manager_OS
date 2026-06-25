import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DROP. — Input (Type Beat).
 * Borde 2px ink, fondo cream/white, sin border-radius.
 * Focus: borde orange. Texto en Inter (font-sans).
 */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full border-2 border-ink bg-white px-3 py-2 text-sm text-ink font-sans file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-fg-subtle focus-visible:outline-none focus-visible:border-orange disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
