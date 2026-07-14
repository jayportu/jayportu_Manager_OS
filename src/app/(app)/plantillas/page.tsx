import { listTemplates } from "@/lib/queries/templates";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CHANNEL_LABELS,
  type TemplateChannel,
} from "@/types/database";
import { SectionHero, GlassPanel, Badge, EmptyState } from "@/components/hos";
import { SeedButton } from "./seed-button";
import { DuplicateTemplateButton } from "./duplicate-button";

/* Canal → tono de Badge (email destaca en info; whatsapp en up; resto neutral). */
const CHANNEL_TONE: Record<TemplateChannel, "up" | "warn" | "down" | "info" | "neutral"> = {
  whatsapp: "up",
  email: "info",
  instagram: "neutral",
  otro: "neutral",
};

export default async function PlantillasPage() {
  const templates = await listTemplates();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <SectionHero
        kicker="Negocio · Plantillas"
        title="Plantillas"
        sub="Mensajes reutilizables con variables. Las usas desde la ficha de cada contacto."
        actions={
          <Button asChild variant="clayPrimary" size="sm">
            <Link href="/plantillas/nueva">
              <Plus className="w-4 h-4" />
              Nueva plantilla
            </Link>
          </Button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin plantillas aún"
          sub="Carga 6 plantillas de ejemplo para arrancar (primer contacto, follow-up, propuesta, etc.) o crea las tuyas desde cero."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <SeedButton />
              <Button asChild variant="clay">
                <Link href="/plantillas/nueva">Crear desde cero</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="relative group">
              <Link href={`/plantillas/${t.id}`} className="block h-full">
                <GlassPanel sweep className="h-full">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl leading-tight transition-colors group-hover:text-[rgb(var(--drop-orange))]">
                      {t.name}
                    </h3>
                    {t.times_used > 0 && (
                      <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">
                        {t.times_used}× usada
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{TEMPLATE_CATEGORY_LABELS[t.category]}</Badge>
                    <Badge tone={CHANNEL_TONE[t.channel_suggested]}>
                      {TEMPLATE_CHANNEL_LABELS[t.channel_suggested]}
                    </Badge>
                  </div>
                  {t.subject && (
                    <div className="mt-3 text-xs text-white/60">
                      <span className="font-semibold">Asunto:</span> {t.subject}
                    </div>
                  )}
                  <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-white/50">
                    {t.body}
                  </p>
                </GlassPanel>
              </Link>
              <div className="absolute bottom-3 right-3">
                <DuplicateTemplateButton id={t.id} name={t.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
