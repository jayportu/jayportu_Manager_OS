"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { duplicateTemplateAction } from "./actions";

/**
 * Duplica una plantilla y lleva a editar la copia. Vive superpuesto sobre el
 * card (que es un Link) → preventDefault/stopPropagation para no navegar al
 * original al clickear.
 */
export function DuplicateTemplateButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const res = await duplicateTemplateAction(id);
      if (res.ok) router.push(`/plantillas/${res.data.id}`);
      else router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={`Duplicar "${name}"`}
      aria-label={`Duplicar plantilla ${name}`}
      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-bg-panel/85 backdrop-blur-sm text-[10px] font-mono font-bold uppercase tracking-wider text-fg-muted hover:text-accent hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 transition-colors"
    >
      <Copy className="w-3.5 h-3.5" />
      {pending ? "…" : "Duplicar"}
    </button>
  );
}
