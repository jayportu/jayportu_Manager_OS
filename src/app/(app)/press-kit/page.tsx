import { getMyProfile } from "@/lib/queries/dj-profile";
import {
  getEventsSummary,
  listBookings,
} from "@/lib/queries/presskit";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink,
  ArrowRight,
  Inbox,
  FileText,
  Wand2,
} from "lucide-react";
import {
  PRESSKIT_EVENT_LABELS,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/types/database";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  KpiTile,
  Badge,
  EmptyState,
} from "@/components/hos";
import { CopyLinkButton } from "./copy-link-button";
import { SlugEditor } from "./slug-editor";
import { ShareTools } from "./share-tools";
import { PressKitSection } from "./press-kit-section";
import { relativeTime } from "@/lib/format";

/* Estado del booking → tono del Badge. */
const BOOKING_TONE: Record<
  BookingStatus,
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  nuevo: "info",
  leido: "neutral",
  respondido: "neutral",
  cotizado: "warn",
  contraofertado: "warn",
  agendado: "up",
  rechazado: "down",
};

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
      <SectionHero
        kicker="Perfil · Press kit"
        title="Press kit"
        sub="Tu landing pública para bookers y prensa. Compártela en IG bio, mensajes a bookers y propuestas."
        actions={
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            últimos 7 días · {views} views · {clicks} clicks
          </span>
        }
      />

      {/* Estado del press kit (modo actual + PDF si aplica) */}
      <GlassPanel
        className={`mb-6 ${
          profile.press_kit_mode === "pdf" ? "border-orange/30" : ""
        }`}
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
              profile.press_kit_mode === "pdf"
                ? "bg-orange text-ink"
                : "bg-white/[0.06] border border-white/10 text-white/55"
            }`}
          >
            {profile.press_kit_mode === "pdf" ? (
              <FileText className="w-6 h-6" />
            ) : (
              <Wand2 className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/45 font-semibold mb-1">
              Modo actual
            </div>
            <div className="text-lg font-semibold">
              {profile.press_kit_mode === "pdf"
                ? "PDF propio"
                : "Generado por la app"}
            </div>
            {profile.press_kit_mode === "pdf" ? (
              <div className="text-sm text-white/50 mt-1">
                Tu press kit público muestra el PDF que subiste:{" "}
                <strong className="text-white">
                  {profile.press_kit_pdf_filename || "press-kit.pdf"}
                </strong>{" "}
                ({formatBytes(profile.press_kit_pdf_size_bytes)})
              </div>
            ) : (
              <div className="text-sm text-white/50 mt-1">
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
                className="text-xs text-orange hover:underline inline-flex items-center gap-1 justify-end"
              >
                Abrir PDF <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </GlassPanel>

      {/* Editor de modo del press kit (movido desde Configuración) */}
      <div className="mb-6">
        <PressKitSection
          mode={profile.press_kit_mode}
          pdfUrl={profile.press_kit_pdf_url}
          pdfFilename={profile.press_kit_pdf_filename}
          pdfSizeBytes={profile.press_kit_pdf_size_bytes}
          publicSlug={profile.public_slug}
        />
      </div>

      {/* URL pública */}
      <GlassPanel className="mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <MonoLabel>URL pública</MonoLabel>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/45 hover:text-orange inline-flex items-center gap-1"
          >
            Ver press kit <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="flex-1 px-3 py-2 rounded-xl border border-white/12 bg-white/[0.04] text-sm font-mono text-white/90 overflow-x-auto whitespace-nowrap">
            {publicUrl}
          </code>
          <CopyLinkButton url={publicUrl} />
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <SlugEditor currentSlug={profile.public_slug} baseUrl={baseUrl} />
        </div>
      </GlassPanel>

      {/* Share tools — QR generator + UTM picker (Bloque A · A8) */}
      <ShareTools publicUrl={publicUrl} artistSlug={profile.public_slug} />

      {/* KPIs últimos 7 días */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xs uppercase tracking-widest text-white/45 font-semibold">
          Métricas · últimos 7 días
        </h2>
        <Link
          href="/press-kit/stats"
          className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:underline"
        >
          Ver estadísticas completas
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile label="Visitas" value={views} />
        <KpiTile label="Clicks" value={clicks} />
        <KpiTile label="Formulario abierto" value={formOpens} />
        <KpiTile
          label="Formulario enviado"
          value={formSubmits}
          accent={formSubmits > 0}
        />
      </div>

      {/* Desglose de clicks por canal */}
      <GlassPanel className="mb-6">
        <div className="mb-4">
          <MonoLabel>Desglose por evento</MonoLabel>
        </div>
        {Object.keys(summary.byEvent).length === 0 ? (
          <EmptyState
            title="Aún no hay eventos"
            sub="Comparte tu URL pública para empezar a recibir visitas y trackearlas."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(summary.byEvent)
              .sort((a, b) => b[1] - a[1])
              .map(([event, count]) => (
                <div
                  key={event}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8"
                >
                  <span className="text-sm text-white/60">
                    {PRESSKIT_EVENT_LABELS[
                      event as keyof typeof PRESSKIT_EVENT_LABELS
                    ] || event}
                  </span>
                  <span className="font-display text-xl text-orange">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        )}
      </GlassPanel>

      {/* Booking submissions */}
      <GlassPanel>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <MonoLabel>
            Bookings recibidos
            {pendingBookings > 0 && (
              <span className="ml-2 text-orange">({pendingBookings} pendientes)</span>
            )}
          </MonoLabel>
        </div>
        {bookings.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Aún no recibes bookings"
            sub="Cuando alguien envíe el formulario, aparecerá acá."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {bookings.map((b) => (
              <Link
                key={b.id}
                href={`/press-kit/bookings/${b.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:border-orange/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white group-hover:text-orange transition-colors">
                      {b.name}
                    </span>
                    <Badge tone={BOOKING_TONE[b.status] ?? "neutral"}>
                      {BOOKING_STATUS_LABELS[b.status]}
                    </Badge>
                  </div>
                  <div className="text-xs text-white/50 mt-1 truncate">
                    {b.venue && <>{b.venue} · </>}
                    {b.event_type && <>{b.event_type} · </>}
                    {relativeTime(b.created_at)}
                  </div>
                  {b.message && (
                    <div className="text-xs text-white/40 mt-1 truncate italic">
                      &ldquo;{b.message}&rdquo;
                    </div>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-orange transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
