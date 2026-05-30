import {
  getCampaign,
  listCampaignContacts,
  countCampaignContactsByStatus,
} from "@/lib/queries/campaigns";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listContacts } from "@/lib/queries/contacts";
import { getTemplate } from "@/lib/queries/templates";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Megaphone } from "lucide-react";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_CHANNEL_LABELS,
} from "@/types/database";
import { relativeTime } from "@/lib/format";
import { CampaignContactRow } from "./contact-row";
import { CampaignActions } from "./campaign-actions";
import { AddContactsDialog } from "./add-contacts-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [contacts, counts, profile, allContacts, template] =
    await Promise.all([
      listCampaignContacts(id),
      countCampaignContactsByStatus(id),
      getMyProfile(),
      listContacts({ orderBy: "score" }),
      campaign.template_id ? getTemplate(campaign.template_id) : Promise.resolve(null),
    ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const responded =
    (counts.respondio || 0) +
    (counts.interesado || 0) +
    (counts.convertido || 0);
  const sent =
    (counts.enviado || 0) + responded + (counts.no_respondio || 0);
  const conversionRate = sent > 0 ? Math.round((responded / sent) * 100) : 0;

  // IDs ya en la campaña para excluir del dialog de agregar
  const existingIds = new Set(contacts.map((c) => c.contact_id));
  const candidates = allContacts.filter((c) => !existingIds.has(c.id));

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <Link
        href="/campanas"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>

      <Card className="p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Megaphone className="w-5 h-5 text-accent shrink-0" />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                {CAMPAIGN_STATUS_LABELS[campaign.status]}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                {CAMPAIGN_CHANNEL_LABELS[campaign.channel]}
              </span>
            </div>
            {campaign.goal && (
              <p className="text-sm text-fg-muted mt-2">{campaign.goal}</p>
            )}
            <div className="text-xs text-fg-subtle mt-2">
              Creada {relativeTime(campaign.created_at)}
              {template ? ` · Plantilla: ${template.name}` : ""}
            </div>
          </div>
          <CampaignActions
            campaignId={campaign.id}
            status={campaign.status}
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-border">
          <Kpi label="Total" value={total} />
          <Kpi label="Pendientes" value={counts.pendiente || 0} />
          <Kpi label="Enviados" value={sent} />
          <Kpi
            label="Respondieron"
            value={responded}
            highlight={responded > 0}
          />
          <Kpi
            label="Conversión"
            value={`${conversionRate}%`}
            highlight={conversionRate >= 20}
          />
        </div>
      </Card>

      {/* Action: agregar contactos */}
      <div className="flex justify-end mb-3">
        <AddContactsDialog
          campaignId={campaign.id}
          candidates={candidates.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            score: c.score,
            tags: c.tags ?? [],
          }))}
        />
      </div>

      {/* Lista de contactos */}
      {contacts.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-fg-muted mb-3">
            La campaña no tiene contactos.
          </p>
          <AddContactsDialog
            campaignId={campaign.id}
            candidates={candidates.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
              score: c.score,
              tags: c.tags ?? [],
            }))}
            buttonLabel="Agregar primer contacto"
            buttonVariant="default"
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {contacts.map((c, i) => (
              <CampaignContactRow
                key={c.id}
                row={c}
                campaignId={campaign.id}
                isFirst={i === 0}
                templateBody={template?.body || ""}
                templateSubject={template?.subject || ""}
                campaignMessage={campaign.message_base}
                campaignChannel={campaign.channel}
                djProfile={profile}
                baseUrl={baseUrl}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-bg border border-border">
      <div className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">
        {label}
      </div>
      <div
        className={`font-display text-2xl leading-none mt-1 ${
          highlight ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
