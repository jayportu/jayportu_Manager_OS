import { listTemplates } from "@/lib/queries/templates";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CHANNEL_LABELS,
} from "@/types/database";
import { SeedButton } from "./seed-button";

export default async function PlantillasPage() {
  const templates = await listTemplates();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Plantillas
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Mensajes reutilizables con variables. Las usas desde la ficha de
            cada contacto.
          </p>
        </div>
        <Button asChild>
          <Link href="/plantillas/nueva">
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin plantillas aún</h3>
          <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
            Carga 6 plantillas de ejemplo para arrancar (primer contacto,
            follow-up, propuesta, etc.) o crea las tuyas desde cero.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <SeedButton />
            <Button asChild variant="outline">
              <Link href="/plantillas/nueva">Crear desde cero</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/plantillas/${t.id}`}>
              <Card className="p-5 h-full hover:border-accent/30 transition-colors group cursor-pointer">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="font-semibold group-hover:text-accent transition-colors">
                    {t.name}
                  </h3>
                  {t.times_used > 0 && (
                    <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider shrink-0">
                      {t.times_used}× usada
                    </span>
                  )}
                </div>
                <div className="flex gap-2 text-[10px] uppercase tracking-wider mb-3">
                  <span className="px-2 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                    {TEMPLATE_CATEGORY_LABELS[t.category]}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                    {TEMPLATE_CHANNEL_LABELS[t.channel_suggested]}
                  </span>
                </div>
                {t.subject && (
                  <div className="text-xs text-fg-muted mb-2">
                    <span className="font-semibold">Asunto:</span> {t.subject}
                  </div>
                )}
                <p className="text-xs text-fg-muted line-clamp-4 whitespace-pre-wrap leading-relaxed">
                  {t.body}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
