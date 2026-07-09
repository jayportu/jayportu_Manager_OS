import { getContact } from "@/lib/queries/contacts";
import { listInteractionsByContact } from "@/lib/queries/interactions";
import { listFollowUpsByContact } from "@/lib/queries/follow-ups";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { buildVars } from "@/lib/templates/variables";
import { TemplatePicker } from "./template-picker";
import { NewEventButton } from "../../calendario/new-event-button";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  Mail,
  Instagram,
  Globe,
  Phone,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
} from "@/types/database";
import { initials, scoreColor, normalizeUrl, whatsappLink } from "@/lib/format";
import { computeScoreForContact, scoreLevel } from "@/lib/scoring";
import { InteractionTimeline } from "./interaction-timeline";
import { AddInteractionButton } from "./add-interaction-button";
import { FollowUpsSection } from "./follow-ups-section";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const [interactions, followUps, djProfile] = await Promise.all([
    listInteractionsByContact(id),
    listFollowUpsByContact(id),
    getMyProfile(),
  ]);

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

  // Vars para plantillas (resuelve {contact_name}, {my_name}, {presskit_url}, etc.)
  const templateVars = buildVars(contact, djProfile, baseUrl);

  const sc = scoreColor(contact.score);
  const level = scoreLevel(contact.score);
  // Recalcular en vivo para mostrar el desglose actualizado
  const breakdown = computeScoreForContact(
    contact,
    interactions.length,
    contact.last_contact_at
  );
  const igHandle = contact.instagram?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  const igUrl = igHandle ? `https://instagram.com/${igHandle}` : null;
  const waUrl = whatsappLink(contact.whatsapp);
  const mailtoUrl = contact.email ? `mailto:${contact.email}` : null;
  const webUrl = contact.website ? normalizeUrl(contact.website) : null;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/crm"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a CRM
      </Link>

      {/* Header */}
      <Card className="p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-ink text-white border-2 border-border flex items-center justify-center font-bold text-lg shrink-0">
            {initials(contact.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {contact.name}
              </h1>
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${sc.bg} ${sc.text}`}
              >
                {contact.score}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-secondary text-fg-muted border border-border">
                {CONTACT_STATUS_LABELS[contact.status]}
              </span>
            </div>
            <div className="text-sm text-fg-muted mt-1">
              {CONTACT_TYPE_LABELS[contact.type]}
              {contact.city ? ` · ${contact.city}` : ""}
              {contact.country ? `, ${contact.country}` : ""}
              {contact.music_style ? ` · ${contact.music_style}` : ""}
            </div>
            {contact.contact_person && (
              <div className="text-sm mt-2">
                <span className="text-fg-muted">Contacto: </span>
                <span className="text-fg">{contact.contact_person}</span>
                {contact.contact_role && (
                  <span className="text-fg-muted"> · {contact.contact_role}</span>
                )}
              </div>
            )}
            {contact.score_reason && (
              <div className="text-xs text-fg-muted mt-2 italic">
                &ldquo;{contact.score_reason}&rdquo;
              </div>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/crm/${contact.id}/editar`}>
              <Edit className="w-4 h-4" />
              Editar
            </Link>
          </Button>
        </div>

        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-border">
          {waUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </Button>
          )}
          {mailtoUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={mailtoUrl}>
                <Mail className="w-4 h-4" />
                Email
              </a>
            </Button>
          )}
          {igUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={igUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="w-4 h-4" />
                Instagram
              </a>
            </Button>
          )}
          {webUrl && (
            <Button asChild size="sm" variant="outline">
              <a href={webUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="w-4 h-4" />
                Web
              </a>
            </Button>
          )}
          {contact.whatsapp && (
            <Button asChild size="sm" variant="ghost">
              <a href={`tel:+${contact.whatsapp.replace(/\D/g, "")}`}>
                <Phone className="w-4 h-4" />
                Llamar
              </a>
            </Button>
          )}
          <TemplatePicker
            contactId={contact.id}
            contactName={contact.name}
            contactWhatsapp={contact.whatsapp}
            contactEmail={contact.email}
            vars={templateVars}
          />
          <NewEventButton
            contactId={contact.id}
            buttonLabel="Agendar evento"
            buttonVariant="outline"
            buttonSize="sm"
          />
        </div>
      </Card>

      {/* Sprint 19 — Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange mb-3">
            — TAGS
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map((t) => (
              <Link
                key={t}
                href={`/crm?tag=${encodeURIComponent(t)}`}
                className="inline-flex items-center border-2 border-border bg-cream font-mono text-[10px] font-bold lowercase px-2 py-0.5 hover:bg-orange transition-colors"
              >
                #{t}
              </Link>
            ))}
          </div>
          <p className="text-[10px] text-fg-subtle mt-3">
            Click en un tag para ver todos los contactos que lo tienen.
          </p>
        </Card>
      )}

      {/* Sprint 19 — Notas privadas (solo si hay contenido) */}
      {contact.private_notes && contact.private_notes.trim().length > 0 && (
        <Card className="p-5 mb-5 bg-ink text-white" style={{ borderColor: "#0A0A0A" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
              🔒 NOTAS PRIVADAS
            </div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange text-ink">
              solo tú
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {contact.private_notes}
          </p>
          <p className="text-[10px] text-orange mt-3 opacity-70">
            Nunca exportado · nunca en press kit · nunca compartido.
          </p>
        </Card>
      )}

      {/* Desglose del score */}
      <Card className="p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Score automático
          </h2>
          <span className={`text-xs ${sc.text}`}>{level.label}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`font-display text-5xl ${sc.text}`}>
            {breakdown.score}
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {breakdown.factors.map((f, idx) => (
              <div
                key={idx}
                className="text-xs flex items-center gap-1.5 px-2 py-1 rounded bg-bg border border-border"
              >
                <span
                  className={`font-bold ${
                    f.value >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {f.value >= 0 ? "+" : ""}
                  {f.value}
                </span>
                <span className="text-fg-muted truncate">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-[10px] text-fg-subtle mt-3">
          Calculado automáticamente. Mejora completando info, registrando
          interacciones recientes y moviendo el estado del pipeline.
        </div>
      </Card>

      {/* Follow-ups */}
      <FollowUpsSection contactId={contact.id} followUps={followUps} />

      {/* Timeline */}
      <Card className="p-6 mt-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Historial de interacciones
          </h2>
          <AddInteractionButton contactId={contact.id} />
        </div>
        <InteractionTimeline interactions={interactions} />
      </Card>

      {/* Notas */}
      {contact.notes && (
        <Card className="p-6 mt-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">
            Notas
          </h2>
          <div className="text-sm text-fg whitespace-pre-wrap leading-relaxed">
            {contact.notes}
          </div>
        </Card>
      )}
    </div>
  );
}
