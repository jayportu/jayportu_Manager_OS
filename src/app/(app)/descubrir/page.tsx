import { listLeads, countLeadsByStatus } from "@/lib/queries/discovered-leads";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  CONTACT_TYPE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  type LeadStatus,
} from "@/types/database";
import { OVERPASS_PRESETS_LIST } from "./presets";
import { DiscoverTabs } from "./discover-tabs";
import { LeadActions } from "./lead-actions";
import { relativeTime } from "@/lib/format";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  Badge,
  ClayChip,
  EmptyState,
} from "@/components/hos";

interface PageProps {
  searchParams: Promise<{
    status?: LeadStatus;
    tab?: string;
  }>;
}

export default async function DescubrirPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status: LeadStatus = sp.status || "new";
  const [leads, counts] = await Promise.all([
    listLeads({ status, limit: 100 }),
    countLeadsByStatus(),
  ]);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <SectionHero
        kicker="Negocio · Descubrir"
        title="Descubrir oportunidades"
        sub="Encuentra clubes, bares, productoras y otros contactos potenciales. Cuando uno te interese, lo promueves al CRM con 1 click."
      />

      {/* Tabs de descubrimiento */}
      <DiscoverTabs presets={OVERPASS_PRESETS_LIST} />

      {/* Filtros por status — SSR: hrefs y parsing de status intactos, solo ClayChip envuelto en <Link> */}
      <div className="mb-4 mt-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
          Filtrar
        </span>
        {(["new", "reviewed", "added_to_crm", "dismissed"] as LeadStatus[]).map(
          (s) => {
            const isActive = status === s;
            const count = counts[s] || 0;
            return (
              <Link key={s} href={`/descubrir?status=${s}`}>
                <ClayChip active={isActive}>
                  {LEAD_STATUS_LABELS[s]} {count > 0 && <span>· {count}</span>}
                </ClayChip>
              </Link>
            );
          }
        )}
      </div>

      {/* Lista */}
      {leads.length === 0 ? (
        <EmptyState
          icon={Search}
          title={
            status === "new"
              ? "Sin leads nuevos"
              : `Sin leads en estado "${LEAD_STATUS_LABELS[status]}"`
          }
          sub="Usa las búsquedas arriba para empezar a descubrir."
        />
      ) : (
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <MonoLabel>Leads</MonoLabel>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {LEAD_STATUS_LABELS[status]} · {leads.length}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-white/10 p-4 transition-colors hover:border-white/25 hover:bg-white/[0.03] md:p-5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{lead.name}</h3>
                      <Badge tone="info">
                        {CONTACT_TYPE_LABELS[lead.type]}
                      </Badge>
                      <Badge tone="neutral">
                        {LEAD_SOURCE_LABELS[lead.source]}
                      </Badge>
                    </div>
                    <div className="text-xs text-fg-muted mt-1">
                      {lead.city && <>{lead.city} · </>}
                      {lead.address && <>{lead.address} · </>}
                      {relativeTime(lead.created_at)}
                    </div>
                    <div className="text-xs text-fg-muted mt-1 flex flex-wrap gap-3">
                      {lead.instagram && (
                        <a
                          href={`https://instagram.com/${lead.instagram.replace(
                            /^@/,
                            ""
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          @{lead.instagram.replace(/^@/, "")}
                        </a>
                      )}
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-accent hover:underline"
                        >
                          {lead.email}
                        </a>
                      )}
                      {lead.website && (
                        <a
                          href={
                            /^https?:\/\//i.test(lead.website)
                              ? lead.website
                              : `https://${lead.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline truncate max-w-xs inline-block align-bottom"
                        >
                          {lead.website.replace(/^https?:\/\//i, "")}
                        </a>
                      )}
                      {lead.phone && (
                        <span className="text-fg">{lead.phone}</span>
                      )}
                    </div>
                    {lead.notes && (
                      <div className="text-xs text-fg-subtle mt-2 italic">
                        {lead.notes}
                      </div>
                    )}
                  </div>
                  <LeadActions
                    leadId={lead.id}
                    status={lead.status}
                    promotedContactId={lead.promoted_contact_id}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
