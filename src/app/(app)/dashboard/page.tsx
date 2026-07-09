import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Users,
  Calendar,
  Briefcase,
  Clock,
  UserPlus,
  Mail,
  FileText,
} from "lucide-react";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listContacts, countContacts } from "@/lib/queries/contacts";
import {
  listPendingFollowUps,
  countPendingFollowUps,
} from "@/lib/queries/follow-ups";
import { listRecentInteractions } from "@/lib/queries/interactions";
import Link from "next/link";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
} from "@/types/database";
import { initials, scoreColor, relativeTime, dateTime } from "@/lib/format";

const FIRST_STEPS = [
  {
    icon: UserPlus,
    title: "Carga tu primer contacto",
    desc: "Un booker, un productor, alguien con quien hayas hablado. El CRM se construye uno por uno.",
    href: "/crm/nuevo",
    cta: "Agregar contacto",
  },
  {
    icon: TrendingUp,
    title: "Registra tus stats actuales",
    desc: "Snapshot de cuántos seguidores tienes hoy. Es el punto de partida para medir crecimiento.",
    href: "/growth",
    cta: "Ir a Growth",
  },
  {
    icon: Mail,
    title: "Conecta tu Gmail",
    desc: "Enlaza la cuenta para revisar mails de bookings sin salir de la app.",
    href: "/gmail",
    cta: "Conectar Gmail",
  },
  {
    icon: FileText,
    title: "Personaliza tu press kit",
    desc: "Tu página pública con bio, música y formulario de booking. Empieza a compartirla.",
    href: "/press-kit",
    cta: "Ver press kit",
  },
];

export default async function DashboardPage() {
  const [
    profile,
    stats,
    pendingFollowUps,
    followUpCounts,
    recentInteractions,
    topContacts,
  ] = await Promise.all([
    getMyProfile(),
    countContacts(),
    listPendingFollowUps(10),
    countPendingFollowUps(),
    listRecentInteractions(8),
    // Solo se usan los 5 primeros (top5 = topContacts.slice(0,5)). Antes esto
    // bajaba hasta 1000 filas para mostrar 5 → limit:5. Los KPIs/totales reales
    // van por countContacts (count exacto), no por el largo de esta lista.
    listContacts({ orderBy: "score", limit: 5 }),
  ]);

  // Saludo según hora local de Santiago (Vercel corre en UTC).
  // Antes usábamos new Date().getHours() que daba el saludo equivocado:
  // a las 17:00 hora Chile, UTC es 20:00 → "Buenas noches" incorrecto.
  const hour = parseInt(
    new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    }).format(new Date()),
    10
  );
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const displayName =
    profile?.artist_name && profile.artist_name.trim().length > 0
      ? profile.artist_name.trim()
      : "Artista";

  const profileIncomplete =
    !profile?.artist_name || profile.artist_name.trim().length === 0;

  // KPIs — conteos REALES (sin el tope de listPendingFollowUps(10)).
  const now = new Date(); // usado para marcar atrasados en la lista renderizada
  const totalPending = followUpCounts.total;
  const overdueCount = followUpCounts.overdue;
  // Pipeline activo: del conteo REAL (countContacts.byStatus, todos los
  // contactos) — antes filtraba topContacts (topado en 500 + otro denominador
  // que las demás KPIs).
  const pipelineActive = [
    "contactado",
    "respondio",
    "interesado",
    "propuesta_enviada",
    "negociando",
    "confirmado",
  ].reduce((sum, s) => sum + (stats.byStatus[s] ?? 0), 0);
  const top5 = topContacts.slice(0, 5);

  const isFirstTime =
    stats.total === 0 &&
    totalPending === 0 &&
    recentInteractions.length === 0;

  const heroSubtitle = isFirstTime
    ? "Bienvenido a DROP. Estos son tus próximos pasos para arrancar."
    : `${totalPending} ${
        totalPending === 1 ? "follow-up pendiente" : "follow-ups pendientes"
      }${overdueCount > 0 ? ` · ${overdueCount} atrasados` : ""}.`;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto grid-paper">
      {/* Hero header — Type Beat */}
      <div className="border-2 border-border bg-bg-panel p-6 md:p-8 mb-6 relative overflow-hidden">
        {/* Watermark DROP. al fondo */}
        <span
          aria-hidden="true"
          className="absolute pointer-events-none select-none hidden md:inline"
          style={{
            top: "-40px",
            right: "-50px",
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "180px",
            lineHeight: 0.85,
            color: "rgba(255,92,0,0.07)",
            letterSpacing: "-0.02em",
          }}
        >
          DROP.
        </span>
        <div className="relative">
          <div className="font-mono text-[11px] font-bold tracking-[0.12em] text-orange uppercase">
            — {new Date().toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Santiago" }).toUpperCase().replace(/\./g, "")} · {new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Santiago" })}
          </div>
          <h1
            className="mt-2 leading-none break-words"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "clamp(34px, 7vw, 72px)",
              lineHeight: 0.88,
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
            }}
          >
            {greeting.toUpperCase()},{" "}
            <span className="text-fg">{displayName.toUpperCase()}</span>
            <span className="text-orange">.</span>
          </h1>
          <p className="text-sm md:text-base mt-3 max-w-2xl text-fg">{heroSubtitle}</p>
        </div>
      </div>

      {/* CTA si el perfil está incompleto */}
      {profileIncomplete && (
        <Link
          href="/configuracion"
          className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-accent-soft border border-accent/30 hover:border-accent transition-colors group"
        >
          <div className="w-8 h-8 rounded-md bg-accent text-bg flex items-center justify-center font-bold text-sm shrink-0">
            !
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-fg">
              Completa tu perfil de DJ
            </div>
            <div className="text-xs text-fg-muted mt-0.5">
              Define tu nombre artístico, bio, estilos y canales públicos para
              que el dashboard y press kit muestren tu identidad real.
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-accent group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      )}

      {isFirstTime && (
        <section className="mb-7">
          <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3">
            Primeros pasos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {FIRST_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.title}
                  href={s.href}
                  className="flex gap-4 p-5 rounded-xl bg-secondary border border-border hover:border-accent/40 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-fg group-hover:text-accent transition-colors">
                      {s.title}
                    </div>
                    <div className="text-xs text-fg-muted mt-1 leading-snug">
                      {s.desc}
                    </div>
                    <div className="text-[11px] font-semibold text-accent mt-2 inline-flex items-center gap-1">
                      {s.cta}
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {!isFirstTime && (
      <>
      {/* KPIs · grid brutalist zero-gap, tiles alternados */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-border mb-7">
        {/* Contactos · ink */}
        <KpiTile
          label="Contactos"
          value={stats.total}
          footer="En tu CRM"
          icon={Users}
          variant="ink"
        />
        {/* Pipeline · orange */}
        <KpiTile
          label="Pipeline activo"
          value={pipelineActive}
          footer="En proceso"
          icon={Briefcase}
          variant="orange"
        />
        {/* Follow-ups · white o danger si hay atrasados */}
        <KpiTile
          label="Follow-ups"
          value={totalPending}
          footer={
            overdueCount > 0 ? `${overdueCount} atrasados` : "Pendientes"
          }
          icon={overdueCount > 0 ? TrendingDown : Clock}
          variant={overdueCount > 0 ? "danger" : "white"}
        />
        {/* Score · white con accent si ≥70 */}
        <KpiTile
          label="Score promedio"
          value={stats.total > 0 ? stats.avgScore : "—"}
          footer="de tus contactos"
          icon={TrendingUp}
          variant={stats.avgScore >= 70 && stats.total > 0 ? "orange" : "white"}
        />
      </div>

      {/* Two columns: Follow-ups + Top contactos */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5 mb-5">
        {/* Follow-ups pendientes */}
        <Card className="lg:col-span-4 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Follow-ups pendientes
            </h2>
            <Link
              href="/crm"
              className="text-xs text-accent hover:underline"
            >
              Ver CRM →
            </Link>
          </div>
          {pendingFollowUps.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Calendar className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
              <p className="text-sm text-fg-muted">
                Sin follow-ups pendientes. Crea uno desde la ficha de cualquier
                contacto.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {pendingFollowUps.slice(0, 6).map((f) => {
                const overdue = new Date(f.due_at) < now;
                return (
                  <Link
                    key={f.id}
                    href={`/crm/${f.contact_id}`}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-bg border border-border hover:border-accent/30 transition-colors group"
                  >
                    <Clock
                      className={`w-4 h-4 shrink-0 ${
                        overdue
                          ? "text-danger"
                          : f.priority === "alta"
                          ? "text-warning"
                          : "text-fg-muted"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                        {f.contact_name || "(contacto borrado)"}
                      </div>
                      <div className="text-xs text-fg-muted truncate mt-0.5">
                        {f.note || "(sin nota)"}
                      </div>
                    </div>
                    <div
                      className={`text-xs whitespace-nowrap ${
                        overdue ? "text-danger font-semibold" : "text-fg-muted"
                      }`}
                    >
                      {dateTime(f.due_at)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Top contactos por score */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Top contactos
            </h2>
            <Link
              href="/crm"
              className="text-xs text-accent hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          {top5.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border rounded-lg">
              <Users className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
              <p className="text-sm text-fg-muted">Sin contactos aún.</p>
              <Link
                href="/crm/nuevo"
                className="text-xs text-accent hover:underline mt-2 inline-block"
              >
                Crear primero →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {top5.map((c) => {
                const sc = scoreColor(c.score);
                return (
                  <Link
                    key={c.id}
                    href={`/crm/${c.id}`}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-bg border border-border hover:border-accent/30 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-bg-subtle text-fg border border-border flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-fg-muted truncate">
                        {CONTACT_TYPE_LABELS[c.type]} · {CONTACT_STATUS_LABELS[c.status]}
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-1 rounded shrink-0 ${sc.bg} ${sc.text}`}
                    >
                      {c.score}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent interactions */}
      {recentInteractions.length > 0 && (
        <Card className="p-6 mb-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Actividad reciente
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {recentInteractions.slice(0, 6).map((i) => (
              <Link
                key={i.id}
                href={`/crm/${i.contact_id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-subtle transition-colors group text-sm"
              >
                <span className="text-xs text-fg-subtle w-20 shrink-0">
                  {relativeTime(i.happened_at)}
                </span>
                <span className="font-medium text-fg group-hover:text-accent transition-colors truncate">
                  {i.contact_name || "(borrado)"}
                </span>
                <span className="text-xs text-fg-muted truncate">
                  {i.direction === "in" ? "← " : "→ "}
                  {i.note || `(${i.channel})`}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}
      </>
      )}

      <div className="text-center text-[10px] uppercase tracking-widest text-fg-subtle py-6">
        {profile?.city || "Santiago"} · {profile?.country || "Chile"} · DROP. v0.13
      </div>
    </div>
  );
}

// ─── KPI tile brutalist ──────────────────────────────────────────────
// Tiles alternados (ink / orange / white / danger) sin gaps, border-border
// global. Mantiene la grilla compacta y plana del mockup.
function KpiTile({
  label,
  value,
  footer,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number | string;
  footer: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "ink" | "orange" | "white" | "danger";
}) {
  // KPI unificadas: misma superficie; el acento va en borde-superior + número
  // (naranjo/danger), no en fondos llenos. Adiós "arcoíris".
  const styles = {
    ink: {
      bg: "bg-bg-panel",
      labelText: "text-fg-subtle",
      valueText: "text-fg",
      footerText: "text-fg-muted",
    },
    orange: {
      bg: "bg-bg-panel border-t-2 border-t-accent",
      labelText: "text-fg-subtle",
      valueText: "text-accent",
      footerText: "text-fg-muted",
    },
    white: {
      bg: "bg-bg-panel",
      labelText: "text-fg-subtle",
      valueText: "text-fg",
      footerText: "text-fg-muted",
    },
    danger: {
      bg: "bg-bg-panel border-t-2 border-t-danger",
      labelText: "text-fg-subtle",
      valueText: "text-danger",
      footerText: "text-fg-muted",
    },
  }[variant];

  return (
    <div
      className={`${styles.bg} p-5 border-border [&:not(:last-child)]:border-r-2 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r-2 [&:nth-child(-n+2)]:border-b-2 md:[&:nth-child(-n+2)]:border-b-0`}
    >
      <div
        className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${styles.labelText} mb-2`}
      >
        — {label}
      </div>
      <div
        className={`font-display leading-none tracking-tight ${styles.valueText}`}
        style={{ fontSize: "clamp(40px, 5vw, 60px)" }}
      >
        {value}
      </div>
      <div
        className={`text-[11px] mt-2 flex items-center gap-1.5 font-mono uppercase tracking-wider ${styles.footerText}`}
      >
        <Icon className="w-3 h-3" />
        {footer}
      </div>
    </div>
  );
}
