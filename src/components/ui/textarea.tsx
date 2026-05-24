import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DROP. — Textarea (Type Beat).
 * Mismo lenguaje que Input: borde 2px ink, fondo white, sin radius.
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full border-2 border-ink bg-white px-3 py-2 text-sm text-ink font-sans placeholder:text-fg-muted focus-visible:outline-none focus-visible:border-orange disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
