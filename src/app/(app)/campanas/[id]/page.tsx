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
import { ArrowLeft, Megaphone } from "lucide-react";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignStatus,
} from "@/types/database";
import { relativeTime } from "@/lib/format";
import { CampaignContactRow } from "./contact-row";
import { CampaignActions } from "./campaign-actions";
import { AddContactsDialog } from "./add-contacts-dialog";
import {
  SectionHero,
  KpiTile,
  GlassPanel,
  MonoLabel,
  Badge,
  EmptyState,
} from "@/components/hos";

/* Estado de campaña → tono de Badge (Hybrid OS) — igual mapeo que /campanas lista */
const STATUS_TONE: Record<
  CampaignStatus,
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  draft: "neutral",
  active: "info",
  paused: "warn",
  done: "up",
  archived: "neutral",
};

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
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a Campañas
      </Link>

      <SectionHero
        kicker="Negocio · Campañas"
        title={campaign.name}
        sub={campaign.goal || undefined}
        actions={
          <CampaignActions campaignId={campaign.id} status={campaign.status} />
        }
      />

      {/* Badges de estado/canal + metadata */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[campaign.status]}>
          {CAMPAIGN_STATUS_LABELS[campaign.status]}
        </Badge>
        <Badge tone="info">{CAMPAIGN_CHANNEL_LABELS[campaign.channel]}</Badge>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          Creada {relativeTime(campaign.created_at)}
          {template ? ` · Plantilla: ${template.name}` : ""}
        </span>
      </div>

      {/* KPIs — kit KpiTile (reemplaza Kpi local) */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiTile label="Total" value={total} />
        <KpiTile label="Pendientes" value={counts.pendiente || 0} />
        <KpiTile label="Enviados" value={sent} />
        <KpiTile
          label="Respondieron"
          value={responded}
          accent={responded > 0}
        />
        <KpiTile
          label="Conversión"
          value={`${conversionRate}%`}
          accent={conversionRate >= 20}
        />
      </div>

      {/* Barra de conversión — track sólido, fill naranja (token) */}
      {sent > 0 && (
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/55">
            <span>Conversión</span>
            <span className="font-bold text-orange">{conversionRate}%</span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,.09)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, conversionRate))}%`,
                background: "rgb(var(--drop-orange))",
              }}
            />
          </div>
        </div>
      )}

      {/* Action: agregar contactos */}
      <div className="mb-3 flex justify-end">
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
        <EmptyState
          icon={Megaphone}
          title="La campaña no tiene contactos."
          sub="Agrega contactos de tu CRM para empezar a hacer push."
          action={
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
              buttonVariant="clayPrimary"
            />
          }
        />
      ) : (
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <MonoLabel>Contactos</MonoLabel>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {contacts.length} en la campaña
            </span>
          </div>
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
        </GlassPanel>
      )}
    </div>
  );
}
