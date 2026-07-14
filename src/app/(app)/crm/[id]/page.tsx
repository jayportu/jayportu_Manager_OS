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
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Badge } from "@/components/hos";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
} from "@/types/database";
import { initials, scoreColor, normalizeUrl, whatsappLink } from "@/lib/format";
import { computeScoreForContact, scoreLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
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
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      {/* Back */}
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a CRM
      </Link>

      {/* Header */}
      <GlassPanel className="mb-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange font-display text-xl text-ink">
            {initials(contact.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-3xl leading-none text-fg">
                {contact.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em]",
                  sc.bg,
                  sc.text
                )}
              >
                {contact.score}
              </span>
              <Badge>{CONTACT_STATUS_LABELS[contact.status]}</Badge>
            </div>
            <div className="mt-1.5 text-sm text-fg-muted">
              {CONTACT_TYPE_LABELS[contact.type]}
              {contact.city ? ` · ${contact.city}` : ""}
              {contact.country ? `, ${contact.country}` : ""}
              {contact.music_style ? ` · ${contact.music_style}` : ""}
            </div>
            {contact.contact_person && (
              <div className="mt-2 text-sm">
                <span className="text-fg-subtle">Contacto: </span>
                <span className="text-fg">{contact.contact_person}</span>
                {contact.contact_role && (
                  <span className="text-fg-subtle"> · {contact.contact_role}</span>
                )}
              </div>
            )}
            {contact.score_reason && (
              <div className="mt-2 text-xs italic text-fg-subtle">
                &ldquo;{contact.score_reason}&rdquo;
              </div>
            )}
          </div>
          <Button asChild variant="clay" size="sm">
            <Link href={`/crm/${contact.id}/editar`}>
              <Edit className="h-3.5 w-3.5" />
              Editar
            </Link>
          </Button>
        </div>

        {/* Acciones rápidas */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
          {waUrl && (
            <Button asChild variant="clay" size="sm">
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </Button>
          )}
          {mailtoUrl && (
            <Button asChild variant="clay" size="sm">
              <a href={mailtoUrl}>
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
            </Button>
          )}
          {igUrl && (
            <Button asChild variant="clay" size="sm">
              <a href={igUrl} target="_blank" rel="noopener noreferrer">
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </a>
            </Button>
          )}
          {webUrl && (
            <Button asChild variant="clay" size="sm">
              <a href={webUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="h-3.5 w-3.5" />
                Web
              </a>
            </Button>
          )}
          {contact.whatsapp && (
            <Button asChild variant="clay" size="sm">
              <a href={`tel:+${contact.whatsapp.replace(/\D/g, "")}`}>
                <Phone className="h-3.5 w-3.5" />
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
      </GlassPanel>

      {/* Sprint 19 — Tags */}
      {contact.tags && contact.tags.length > 0 && (
        <GlassPanel className="mb-5">
          <MonoLabel>Tags</MonoLabel>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {contact.tags.map((t) => (
              <Link
                key={t}
                href={`/crm?tag=${encodeURIComponent(t)}`}
                className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] font-bold lowercase text-fg-muted transition-colors hover:border-orange hover:text-orange"
              >
                #{t}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-fg-subtle">
            Click en un tag para ver todos los contactos que lo tienen.
          </p>
        </GlassPanel>
      )}

      {/* Sprint 19 — Notas privadas (solo si hay contenido) */}
      {contact.private_notes && contact.private_notes.trim().length > 0 && (
        <div className="hos-clay mb-5 overflow-hidden rounded-2xl border border-orange/25 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange">
              <Lock className="h-3 w-3" />
              Notas privadas
            </span>
            <span className="rounded-full bg-orange px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
              solo tú
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
            {contact.private_notes}
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-orange/70">
            Nunca exportado · nunca en press kit · nunca compartido.
          </p>
        </div>
      )}

      {/* Desglose del score */}
      <GlassPanel className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <MonoLabel>Score automático</MonoLabel>
          <span className={cn("text-xs", sc.text)}>{level.label}</span>
        </div>
        <div className="flex items-center gap-5">
          <div className={cn("font-display text-5xl leading-none", sc.text)}>
            {breakdown.score}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1.5 md:grid-cols-3">
            {breakdown.factors.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-subtle/40 px-2 py-1 text-xs"
              >
                <span
                  className={cn(
                    "font-bold",
                    f.value >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {f.value >= 0 ? "+" : ""}
                  {f.value}
                </span>
                <span className="truncate text-fg-muted">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 text-[10px] text-fg-subtle">
          Calculado automáticamente. Mejora completando info, registrando
          interacciones recientes y moviendo el estado del pipeline.
        </div>
      </GlassPanel>

      {/* Follow-ups */}
      <FollowUpsSection contactId={contact.id} followUps={followUps} />

      {/* Timeline */}
      <GlassPanel className="mt-5">
        <div className="mb-5 flex items-center justify-between">
          <MonoLabel>Historial de interacciones</MonoLabel>
          <AddInteractionButton contactId={contact.id} />
        </div>
        <InteractionTimeline interactions={interactions} />
      </GlassPanel>

      {/* Notas */}
      {contact.notes && (
        <GlassPanel className="mt-5">
          <MonoLabel>Notas</MonoLabel>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">
            {contact.notes}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
