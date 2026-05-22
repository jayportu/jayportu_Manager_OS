import { listLeads, countLeadsByStatus } from "@/lib/queries/discovered-leads";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Compass, Search } from "lucide-react";
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
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-accent" />
          Descubrir oportunidades
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Encuentra clubes, bares, productoras y otros contactos potenciales.
          Cuando uno te interese, lo promueves al CRM con 1 click.
        </p>
      </div>

      {/* Tabs de descubrimiento */}
      <DiscoverTabs presets={OVERPASS_PRESETS_LIST} />

      {/* Filtros por status */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4 mt-8">
        {(["new", "reviewed", "added_to_crm", "dismissed"] as LeadStatus[]).map(
          (s) => {
            const isActive = status === s;
            const count = counts[s] || 0;
            return (
              <Link
                key={s}
                href={`/descubrir?status=${s}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-accent-soft border-accent/30 text-accent"
                    : "border-border text-fg-muted hover:text-fg hover:border-fg-muted"
                }`}
              >
                {LEAD_STATUS_LABELS[s]} {count > 0 && <span>· {count}</span>}
              </Link>
            );
          }
        )}
      </div>

      {/* Lista */}
      {leads.length === 0 ? (
        <Card className="p-10 text-center">
          <Search className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">
            {status === "new"
              ? "Sin leads nuevos"
              : `Sin leads en estado "${LEAD_STATUS_LABELS[status]}"`}
          </h3>
          <p className="text-sm text-fg-muted">
            Usa las búsquedas arriba para empezar a descubrir.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{lead.name}</h3>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                      {CONTACT_TYPE_LABELS[lead.type]}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                      {LEAD_SOURCE_LABELS[lead.source]}
                    </span>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
