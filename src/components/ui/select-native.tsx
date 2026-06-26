import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/**
 * DROP. — SelectNative (Type Beat).
 * Borde 2px ink, fondo white, chevron a la derecha.
 */
export type SelectNativeProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const SelectNative = React.forwardRef<HTMLSelectElement, SelectNativeProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none border-2 border-ink bg-bg-panel pl-3 pr-9 py-2 text-sm text-ink font-sans placeholder:text-fg-muted focus-visible:outline-none focus-visible:border-orange disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink" />
      </div>
    );
  }
);
SelectNative.displayName = "SelectNative";

export { SelectNative };
