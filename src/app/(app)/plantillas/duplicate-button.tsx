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
      className="hos-clay inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange disabled:opacity-50"
    >
      <Copy className="w-3.5 h-3.5" />
      {pending ? "…" : "Duplicar"}
    </button>
  );
}
