import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * DROP. — Label (Type Beat).
 * Mono uppercase + tracking, color ink. Pegada al input por arriba.
 */
const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
