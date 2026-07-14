import { listContacts, listAllUserTags, getContactStats } from "@/lib/queries/contacts";
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
import {
  SectionHero,
  KpiTile,
  GlassPanel,
  MonoLabel,
  Badge,
  ClayChip,
  EmptyState,
  Alert,
  TableShell,
  Th,
  Td,
  MobileRecordCard,
  RecordRow,
} from "@/components/hos";

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

/* Estado → tono de Badge (mapeo semántico sobre los 11 estados del pipeline) */
const STATUS_TONE: Record<ContactStatus, "up" | "warn" | "down" | "info" | "neutral"> = {
  nuevo: "info",
  contactado: "info",
  respondio: "info",
  interesado: "warn",
  propuesta_enviada: "warn",
  negociando: "warn",
  confirmado: "up",
  realizado: "up",
  perdido: "down",
  recontactar_despues: "neutral",
  ignorar: "neutral",
};

/* Avatar con iniciales — tokens DROP (bg-orange/text-ink), sin hex */
function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange font-display text-sm text-ink"
    >
      {initials(name)}
    </span>
  );
}

/* Score = pill con la forma de Badge, pero el color/número siguen 100% calculados
 * por `scoreColor` (lib/format) — no se re-deriva un tono nuevo. Solo cambia el
 * contenedor visual (pill redondeada mono, en vez del box brutalista anterior). */
function ScoreChip({ score }: { score: number }) {
  const sc = scoreColor(score);
  return (
    <span
      className={`inline-flex min-w-[2.4rem] items-center justify-center rounded-full px-2.5 py-1 font-mono text-[11px] font-bold ${sc.bg} ${sc.text}`}
    >
      {score}
    </span>
  );
}

export default async function CrmPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  // Sprint 19 — Parse tags from URL (acepta ?tag=x para uno o ?tags=x,y,z para varios)
  const activeTags = (sp.tags || sp.tag || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  const filters = {
    search: sp.q,
    type: sp.type,
    status: sp.status,
    minScore:
      sp.score && Number.isFinite(parseInt(sp.score, 10))
        ? parseInt(sp.score, 10)
        : undefined,
    tags: activeTags.length > 0 ? activeTags : undefined,
  };
  const [contacts, allTags, stats] = await Promise.all([
    listContacts(filters),
    listAllUserTags(),
    // Total + KPIs HONESTOS (count exacto, mismos filtros). No derivar de
    // `contacts` que viene capado a 1000 → mentía arriba de ese tope.
    getContactStats(filters),
  ]);

  const inPipeline = stats.inPipeline;
  const scoreAvg = stats.avgScore;
  const venuesCount = stats.venuesCount;
  // Si la lista quedó corta respecto al total real, avisamos (no ocultamos).
  const listTruncated = contacts.length < stats.total;
  const isFiltered =
    !!(sp.q || sp.type || sp.status || sp.score || activeTags.length > 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <SectionHero
        kicker="Negocio · CRM"
        title={`${stats.total} CONTACTO${stats.total === 1 ? "" : "S"}`}
        sub={
          isFiltered
            ? `Resultados filtrados de tu base de contactos — ${stats.total} coinciden con los filtros activos.`
            : "Tu base de bookers, venues y productoras — filtra por tipo, estado y score."
        }
        actions={
          <>
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
          </>
        }
      />

      {/* ═══ KPIs — Clay canónico ═══ */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Venues" value={venuesCount} />
          <KpiTile label="En pipeline" value={inPipeline} />
          <KpiTile label="Score promedio" value={scoreAvg || "—"} />
          <KpiTile label="Total" value={stats.total} accent />
        </div>
      )}

      {/* Sprint 19 — Filtro por tags */}
      {(allTags.length > 0 || activeTags.length > 0) && (
        <GlassPanel className="mt-4">
          <MonoLabel>Tags · filtro AND</MonoLabel>
          {activeTags.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 font-mono text-[9px] font-bold uppercase text-white/40">
                Activos:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {activeTags.map((t) => {
                  const remaining = activeTags.filter((x) => x !== t);
                  const newTags = remaining.length > 0 ? remaining.join(",") : undefined;
                  return (
                    <Link key={t} href={buildHref(sp, { tag: undefined, tags: newTags })}>
                      <ClayChip active>#{t} ×</ClayChip>
                    </Link>
                  );
                })}
                <Link
                  href={buildHref(sp, { tag: undefined, tags: undefined })}
                  className="px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/40 underline hover:text-white/70"
                >
                  limpiar
                </Link>
              </div>
            </div>
          )}
          {allTags.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 font-mono text-[9px] font-bold uppercase text-white/40">
                {activeTags.length > 0 ? "Sumar otro:" : "Filtrar por:"}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTags
                  .filter((t) => !activeTags.includes(t.tag))
                  .slice(0, 30)
                  .map((t) => {
                    const newTags = [...activeTags, t.tag].join(",");
                    return (
                      <Link key={t.tag} href={buildHref(sp, { tag: undefined, tags: newTags })}>
                        <ClayChip>#{t.tag} {t.count}</ClayChip>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </GlassPanel>
      )}

      {/* Filtros */}
      <Card className="p-4 mb-5 mt-4">
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
        <EmptyState
          icon={Users}
          title="Sin contactos aún"
          sub="Empieza creando tu primer contacto manualmente o importando un CSV de tu agenda existente."
          action={
            <div className="flex flex-wrap justify-center gap-2">
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
          }
        />
      ) : (
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <MonoLabel>Base de contactos</MonoLabel>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {isFiltered ? "Filtrados" : "Todos"} · {contacts.length}
              {listTruncated ? ` de ${stats.total}` : ""}
            </span>
          </div>

          {/* Tabla — tablet/desktop (md+) */}
          <div className="hidden md:block">
            <TableShell bare>
              <thead>
                <tr>
                  <Th>Nombre</Th>
                  <Th>Tipo</Th>
                  <Th className="hidden lg:table-cell">Ciudad</Th>
                  <Th>Estado</Th>
                  <Th>Score</Th>
                  <Th className="hidden lg:table-cell">Último contacto</Th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-white/[0.06] transition-colors hover:bg-white/[0.06]"
                  >
                    <Td>
                      <Link href={`/crm/${c.id}`} className="group flex items-center gap-2.5">
                        <Avatar name={c.name} />
                        <span className="min-w-0 truncate font-semibold text-white/90 transition-colors group-hover:text-white">
                          {c.name}
                        </span>
                      </Link>
                    </Td>
                    <Td>{CONTACT_TYPE_LABELS[c.type]}</Td>
                    <Td className="hidden lg:table-cell">{c.city || "—"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[c.status]}>{CONTACT_STATUS_LABELS[c.status]}</Badge>
                    </Td>
                    <Td>
                      <ScoreChip score={c.score} />
                    </Td>
                    <Td className="hidden lg:table-cell">{relativeTime(c.last_contact_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>

          {/* Tarjetas — móvil (<md): mismos datos sin scroll horizontal, y con
              Estado + Último contacto que la tabla oculta en pantallas chicas. */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {contacts.map((c) => (
              <Link key={c.id} href={`/crm/${c.id}`} className="block">
                <MobileRecordCard
                  title={
                    <span className="flex items-center gap-2.5">
                      <Avatar name={c.name} />
                      <span className="truncate">{c.name}</span>
                    </span>
                  }
                  meta={<ScoreChip score={c.score} />}
                >
                  <RecordRow k="Tipo">
                    {CONTACT_TYPE_LABELS[c.type]}
                    {c.city ? ` · ${c.city}` : ""}
                  </RecordRow>
                  <RecordRow k="Estado">
                    <Badge tone={STATUS_TONE[c.status]}>{CONTACT_STATUS_LABELS[c.status]}</Badge>
                  </RecordRow>
                  <RecordRow k="Último">{relativeTime(c.last_contact_at)}</RecordRow>
                </MobileRecordCard>
              </Link>
            ))}
          </div>

          {listTruncated && (
            <div className="mt-3">
              <Alert tone="warn" title="Lista acotada">
                Mostrando los primeros {contacts.length} de {stats.total}. Usa los filtros o la
                búsqueda para acotar.
              </Alert>
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
