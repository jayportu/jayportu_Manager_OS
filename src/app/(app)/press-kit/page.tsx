import { getMyProfile } from "@/lib/queries/dj-profile";
import {
  getEventsSummary,
  listBookings,
} from "@/lib/queries/presskit";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  Eye,
  MousePointerClick,
  Send,
  Download,
  ExternalLink,
  ArrowRight,
  Inbox,
  FileText,
  Wand2,
  Settings,
} from "lucide-react";
import {
  PRESSKIT_EVENT_LABELS,
  BOOKING_STATUS_LABELS,
} from "@/types/database";
import { CopyLinkButton } from "./copy-link-button";
import { SlugEditor } from "./slug-editor";
import { ShareTools } from "./share-tools";
import { relativeTime } from "@/lib/format";

export default async function PressKitAdminPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const [summary, bookings] = await Promise.all([
    getEventsSummary(7),
    listBookings(),
  ]);

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
  const publicUrl = `${baseUrl}/p/${profile.public_slug}`;

  const views = summary.byEvent["view"] || 0;
  const clicks = Object.entries(summary.byEvent)
    .filter(([k]) => k.startsWith("click_"))
    .reduce((acc, [, v]) => acc + v, 0);
  const formOpens = summary.byEvent["form_open"] || 0;
  const formSubmits = summary.byEvent["form_submit"] || 0;

  const pendingBookings = bookings.filter((b) => b.status === "nuevo").length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* ═══ Hero brutalist ═══ */}
      <div className="border-2 border-border bg-bg-panel p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — PRESS KIT · LANDING PÚBLICA
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3 justify-between">
          <h1 className="font-display text-4xl md:text-6xl leading-none">
            PRESS KIT<span className="text-orange">.</span>
          </h1>
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            últimos 7 días · {views} views · {clicks} clicks
          </div>
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Tu landing pública en{" "}
          <span className="font-mono text-fg">{publicUrl}</span>. Compártela
          en IG bio, mensajes a bookers, propuestas.
        </p>
      </div>

      {/* Estado del press kit (modo actual + PDF si aplica) */}
      <Card
        className={`p-5 mb-6 ${
          profile.press_kit_mode === "pdf"
            ? "bg-accent-soft/40 border-accent/30"
            : ""
        }`}
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              profile.press_kit_mode === "pdf"
                ? "bg-accent text-bg"
                : "bg-secondary border border-border text-fg-muted"
            }`}
          >
            {profile.press_kit_mode === "pdf" ? (
              <FileText className="w-6 h-6" />
            ) : (
              <Wand2 className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-fg-muted font-semibold mb-1">
              Modo actual
            </div>
            <div className="text-lg font-semibold">
              {profile.press_kit_mode === "pdf"
                ? "PDF propio"
                : "Generado por la app"}
            </div>
            {profile.press_kit_mode === "pdf" ? (
              <div className="text-sm text-fg-muted mt-1">
                Tu press kit público muestra el PDF que subiste:{" "}
                <strong className="text-fg">
                  {profile.press_kit_pdf_filename || "press-kit.pdf"}
                </strong>{" "}
                ({formatBytes(profile.press_kit_pdf_size_bytes)})
              </div>
            ) : (
              <div className="text-sm text-fg-muted mt-1">
                Tu press kit público se arma automáticamente desde tus datos
                de perfil (bio, géneros, links, tech rider).
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {profile.press_kit_mode === "pdf" && profile.press_kit_pdf_url && (
              <a
                href={profile.press_kit_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1 justify-end"
              >
                Abrir PDF <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Link
              href="/configuracion"
              className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1 justify-end"
            >
              Cambiar modo <Settings className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </Card>

      {/* URL pública */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            URL pública
          </h2>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1"
          >
            Ver press kit <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="flex-1 px-3 py-2 bg-bg border border-border rounded-md text-sm font-mono overflow-x-auto whitespace-nowrap">
            {publicUrl}
          </code>
          <CopyLinkButton url={publicUrl} />
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <SlugEditor currentSlug={profile.public_slug} baseUrl={baseUrl} />
        </div>
      </Card>

      {/* Share tools — QR generator + UTM picker (Bloque A · A8) */}
      <ShareTools publicUrl={publicUrl} artistSlug={profile.public_slug} />

      {/* KPIs últimos 7 días */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold">
          Métricas · últimos 7 días
        </h2>
        <Link
          href="/press-kit/stats"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Ver estadísticas completas
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Visitas" value={views} icon={Eye} />
        <KpiCard
          label="Clicks"
          value={clicks}
          icon={MousePointerClick}
        />
        <KpiCard
          label="Formulario abierto"
          value={formOpens}
          icon={Download}
        />
        <KpiCard
          label="Formulario enviado"
          value={formSubmits}
          icon={Send}
          highlight={formSubmits > 0}
        />
      </div>

      {/* Desglose de clicks por canal */}
      <Card className="p-6 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">
          Desglose por evento
        </h2>
        {Object.keys(summary.byEvent).length === 0 ? (
          <div className="text-sm text-fg-muted text-center py-6">
            Aún no hay eventos. Comparte tu URL pública para empezar a recibir
            visitas y trackearlas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(summary.byEvent)
              .sort((a, b) => b[1] - a[1])
              .map(([event, count]) => (
                <div
                  key={event}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg border border-border"
                >
                  <span className="text-sm text-fg-muted">
                    {PRESSKIT_EVENT_LABELS[
                      event as keyof typeof PRESSKIT_EVENT_LABELS
                    ] || event}
                  </span>
                  <span className="font-display text-xl text-accent">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Booking submissions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Bookings recibidos
            {pendingBookings > 0 && (
              <span className="ml-2 text-accent">({pendingBookings} pendientes)</span>
            )}
          </h2>
        </div>
        {bookings.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-lg">
            <Inbox className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
            <p className="text-sm text-fg-muted">
              Aún no recibes bookings. Cuando alguien envíe el formulario,
              aparecerá acá.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/press-kit/bookings/${b.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg border border-border hover:border-accent/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-fg group-hover:text-accent transition-colors">
                      {b.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-secondary text-fg-muted border border-border">
                      {BOOKING_STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <div className="text-xs text-fg-muted mt-1 truncate">
                    {b.venue && <>{b.venue} · </>}
                    {b.event_type && <>{b.event_type} · </>}
                    {relativeTime(b.created_at)}
                  </div>
                  {b.message && (
                    <div className="text-xs text-fg-subtle mt-1 truncate italic">
                      &ldquo;{b.message}&rdquo;
                    </div>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-fg-muted group-hover:text-accent transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold">
          {label}
        </span>
        <Icon className="w-4 h-4 text-fg-subtle" />
      </div>
      <div
        className={`font-display text-4xl leading-none tracking-wider ${
          highlight ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </div>
    </Card>
  );
}
