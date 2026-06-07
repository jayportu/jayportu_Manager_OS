import { listContacts, listAllUserTags } from "@/lib/queries/contacts";
import {
  CONTACT_TYPES,
  CONTACT_STATUS,
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
  type ContactStatus,
  type ContactType,
} from "@/types/database";
import { SelectNative } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Upload, Users } from "lucide-react";
import { relativeTime, initials, scoreColor } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: ContactType;
    status?: ContactStatus;
    score?: string;
    /** Sprint 19 — comma-separated list of tags for AND filter */
    tag?: string;
    tags?: string;
  }>;
}

/** Sprint 19 — Helper para construir URL preservando otros params + cambiando tags */
function buildHref(
  current: Record<string, string | undefined>,
  override: Partial<Record<"tag" | "tags", string | undefined>>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...override };
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.trim().length > 0) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/crm?${qs}` : "/crm";
}

export default async function CrmPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Sprint 19 — Parse tags from URL (acepta ?tag=x para uno o ?tags=x,y,z para varios)
  const activeTags = (sp.tags || sp.tag || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  const [contacts, allTags] = await Promise.all([
    listContacts({
      search: sp.q,
      type: sp.type,
      status: sp.status,
      minScore: sp.score ? parseInt(sp.score, 10) : undefined,
      tags: activeTags.length > 0 ? activeTags : undefined,
    }),
    listAllUserTags(),
  ]);

  // KPIs derivados (cálculo en memoria sobre el resultado filtrado)
  const pipelineStatuses = new Set<ContactStatus>([
    "interesado",
    "propuesta_enviada",
    "negociando",
  ]);
  const inPipeline = contacts.filter((c) => pipelineStatuses.has(c.status)).length;
  const scoreAvg =
    contacts.length > 0
      ? Math.round(
          contacts.reduce((sum, c) => sum + (c.score || 0), 0) / contacts.length
        )
      : 0;
  const venueTypes = new Set<ContactType>([
    "club",
    "bar",
    "rooftop",
    "festival",
    "productora",
  ]);
  const venuesCount = contacts.filter((c) => venueTypes.has(c.type)).length;
  const isFiltered =
    !!(sp.q || sp.type || sp.status || sp.score || activeTags.length > 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* ═══ Hero brutalist ═══ */}
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-5 relative overflow-hidden">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — CRM · CONTACTOS{isFiltered ? " · FILTRADOS" : ""}
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-4 justify-between">
          <h1 className="font-display text-4xl md:text-6xl leading-none">
            {String(contacts.length).padStart(2, "0")} CONTACTO
            {contacts.length === 1 ? "" : "S"}
            <span className="text-orange">.</span>
          </h1>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm">
              <Link href="/crm/importar">
                <Upload className="w-4 h-4" />
                Importar CSV
              </Link>
            </Button>
            <Button asChild size="sm" variant="orange">
              <Link href="/crm/nuevo">
                <Plus className="w-4 h-4" />
                Nuevo contacto
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ KPIs · grid 4 col zero-gap borde ink ═══ */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink mb-5">
          <div className="bg-white p-4 border-r-2 border-ink border-b-2 md:border-b-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
              — VENUES
            </div>
            <div className="font-display text-3xl md:text-4xl leading-none mt-2">
              {String(venuesCount).padStart(2, "0")}
            </div>
            <div className="font-mono text-[10px] mt-2 text-fg-muted">
              Clubes · bares · festivales
            </div>
          </div>
          <div className="bg-orange p-4 md:border-r-2 border-ink border-b-2 md:border-b-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
              — EN PIPELINE
            </div>
            <div className="font-display text-3xl md:text-4xl leading-none mt-2">
              {String(inPipeline).padStart(2, "0")}
            </div>
            <div className="font-mono text-[10px] mt-2">
              Interesado · negociando · propuesta
            </div>
          </div>
          <div className="bg-white p-4 border-r-2 border-ink">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
              — SCORE PROMEDIO
            </div>
            <div className="font-display text-3xl md:text-4xl leading-none mt-2">
              {scoreAvg || "—"}
            </div>
            <div className="font-mono text-[10px] mt-2 text-fg-muted">
              {scoreAvg >= 70
                ? "Calidad alta"
                : scoreAvg >= 50
                ? "Mixto"
                : "Para depurar"}
            </div>
          </div>
          <div className="bg-ink text-cream p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
              — TOTAL
            </div>
            <div className="font-display text-3xl md:text-4xl leading-none mt-2">
              {String(contacts.length).padStart(2, "0")}
            </div>
            <div className="font-mono text-[10px] mt-2 opacity-70">
              {isFiltered ? "Filtrados" : "Todos los contactos"}
            </div>
          </div>
        </div>
      )}

      {/* Sprint 19 — Filtro por tags */}
      {(allTags.length > 0 || activeTags.length > 0) && (
        <Card className="p-4 mb-3">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange mb-2">
            — TAGS · FILTRO AND
          </div>
          {activeTags.length > 0 && (
            <div className="mb-3">
              <div className="font-mono text-[9px] font-bold uppercase text-fg-muted mb-1.5">
                Activos:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeTags.map((t) => {
                  const remaining = activeTags.filter((x) => x !== t);
                  const newTags = remaining.length > 0 ? remaining.join(",") : undefined;
                  return (
                    <Link
                      key={t}
                      href={buildHref(sp, { tag: undefined, tags: newTags })}
                      className="inline-flex items-center gap-1.5 border-2 border-ink bg-orange font-mono text-[10px] font-bold lowercase px-2 py-0.5"
                    >
                      <span>#{t}</span>
                      <span className="text-ink/60">×</span>
                    </Link>
                  );
                })}
                <Link
                  href={buildHref(sp, { tag: undefined, tags: undefined })}
                  className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 underline text-fg-muted hover:text-ink"
                >
                  limpiar
                </Link>
              </div>
            </div>
          )}
          {allTags.length > 0 && (
            <div>
              <div className="font-mono text-[9px] font-bold uppercase text-fg-muted mb-1.5">
                {activeTags.length > 0 ? "Sumar otro:" : "Filtrar por:"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTags
                  .filter((t) => !activeTags.includes(t.tag))
                  .slice(0, 30)
                  .map((t) => {
                    const newTags = [...activeTags, t.tag].join(",");
                    return (
                      <Link
                        key={t.tag}
                        href={buildHref(sp, { tag: undefined, tags: newTags })}
                        className="inline-flex items-center gap-1.5 border-2 border-ink bg-cream font-mono text-[10px] font-bold lowercase px-2 py-0.5 hover:bg-orange transition-colors"
                      >
                        <span>#{t.tag}</span>
                        <span className="text-fg-muted">{t.count}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Filtros */}
      <Card className="p-4 mb-5">
        <form className="grid grid-cols-1 md:grid-cols-5 gap-3" action="/crm">
          {/* Preserva los tags activos al aplicar los demás filtros */}
          {activeTags.length > 0 && (
            <input type="hidden" name="tags" value={activeTags.join(",")} />
          )}
          <Input
            type="search"
            name="q"
            placeholder="Buscar nombre, ciudad, contacto…"
            defaultValue={sp.q || ""}
            className="md:col-span-2"
          />
          <SelectNative name="type" defaultValue={sp.type || ""}>
            <option value="">Tipo: todos</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTACT_TYPE_LABELS[t]}
              </option>
            ))}
          </SelectNative>
          <SelectNative name="status" defaultValue={sp.status || ""}>
            <option value="">Estado: todos</option>
            {CONTACT_STATUS.map((s) => (
              <option key={s} value={s}>
                {CONTACT_STATUS_LABELS[s]}
              </option>
            ))}
          </SelectNative>
          <SelectNative name="score" defaultValue={sp.score || ""}>
            <option value="">Score: todos</option>
            <option value="80">80+ Alta prioridad</option>
            <option value="60">60+ Buena oportunidad</option>
            <option value="40">40+ Tibia</option>
          </SelectNative>
          <div className="md:col-span-5 flex gap-2 justify-end">
            <Button type="submit" variant="outline" size="sm">
              Aplicar filtros
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/crm">Limpiar</Link>
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista */}
      {contacts.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold text-base mb-1">Sin contactos aún</h3>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
            Empieza creando tu primer contacto manualmente o importando un CSV
            de tu agenda existente.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/crm/importar">
                <Upload className="w-4 h-4" />
                Importar CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/crm/nuevo">
                <Plus className="w-4 h-4" />
                Nuevo contacto
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-muted">
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Ciudad</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold">Score</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Último contacto</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const sc = scoreColor(c.score);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-bg-subtle transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/${c.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-full bg-ink text-cream border-2 border-ink flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-fg group-hover:text-accent transition-colors truncate">
                              {c.name}
                            </div>
                            <div className="text-xs text-fg-muted truncate md:hidden">
                              {CONTACT_TYPE_LABELS[c.type]} · {c.city || "—"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-fg-muted hidden md:table-cell">
                        {CONTACT_TYPE_LABELS[c.type]}
                      </td>
                      <td className="px-4 py-3 text-fg-muted hidden lg:table-cell">
                        {c.city || "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 border-2 border-ink bg-cream text-ink">
                          {CONTACT_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block min-w-[40px] text-center font-mono text-[11px] font-bold px-2 py-1 ${sc.bg} ${sc.text}`}
                        >
                          {c.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-muted text-xs hidden lg:table-cell">
                        {relativeTime(c.last_contact_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
