import { Button } from "@/components/ui/button";
import {
  SectionHero,
  GlassPanel,
  KpiTile,
  Badge,
  Alert,
  EmptyState,
  MonoLabel,
} from "@/components/hos";
import {
  TrendingUp,
  ArrowRight,
  Users,
  Calendar,
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

  // Kicker del hero: fecha/hora local de Santiago (mismo formato que antes,
  // ahora inyectado en SectionHero — el "— " prefijo lo antepone MonoLabel).
  const heroKicker = `${new Date()
    .toLocaleDateString("es-CL", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      timeZone: "America/Santiago",
    })
    .toUpperCase()
    .replace(/\./g, "")} · ${new Date().toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Santiago",
  })}`;

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
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Hero — SectionHero canónico (Hybrid OS). Watermark DROP. de fondo
          conservado dentro del contenedor relative/overflow-hidden. */}
      <div className="relative overflow-hidden">
        <span
          aria-hidden="true"
          className="absolute pointer-events-none select-none hidden md:inline"
          style={{
            top: "-40px",
            right: "-50px",
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "180px",
            lineHeight: 0.85,
            color: "rgb(var(--drop-orange) / 0.07)",
            letterSpacing: "-0.02em",
          }}
        >
          DROP.
        </span>
        <SectionHero
          kicker={heroKicker}
          title={`${greeting}, ${displayName}`}
          sub={heroSubtitle}
        />
      </div>

      {/* CTA si el perfil está incompleto */}
      {profileIncomplete && (
        <Link
          href="/configuracion"
          className="mb-6 block transition-opacity hover:opacity-90"
        >
          <Alert tone="warn" title="Perfil incompleto">
            Define tu nombre artístico, bio, estilos y canales públicos para
            que el dashboard y press kit muestren tu identidad real.{" "}
            <strong className="font-semibold">Completar ahora →</strong>
          </Alert>
        </Link>
      )}

      {isFirstTime && (
        <section className="mb-7">
          <MonoLabel className="mb-3 block">Primeros pasos</MonoLabel>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {FIRST_STEPS.map((s) => (
              <EmptyState
                key={s.title}
                icon={s.icon}
                title={s.title}
                sub={s.desc}
                action={
                  <Button variant="clayPrimary" size="sm" asChild>
                    <Link href={s.href}>
                      {s.cta}
                      <ArrowRight width={12} height={12} />
                    </Link>
                  </Button>
                }
              />
            ))}
          </div>
        </section>
      )}

      {!isFirstTime && (
      <>
      {/* KPIs · Hybrid OS clay tiles */}
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Contactos */}
        <KpiTile label="Contactos" value={stats.total} sub="en tu CRM" />
        {/* Pipeline activo — siempre destacado (accent) */}
        <KpiTile
          label="Pipeline activo"
          value={pipelineActive}
          sub="en proceso"
          accent
        />
        {/* Follow-ups — delta en rojo si hay atrasados */}
        <KpiTile
          label="Follow-ups"
          value={totalPending}
          delta={overdueCount > 0 ? `${overdueCount} atrasados` : "pendientes"}
          tone={overdueCount > 0 ? "down" : "flat"}
        />
        {/* Score promedio — destacado (accent) si ≥70 */}
        <KpiTile
          label="Score promedio"
          value={stats.total > 0 ? stats.avgScore : "—"}
          sub="de tus contactos"
          accent={stats.avgScore >= 70 && stats.total > 0}
        />
      </div>

      {/* Two columns: Follow-ups + Top contactos */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5 mb-5">
        {/* Follow-ups pendientes */}
        <GlassPanel className="lg:col-span-4">
          <div className="flex justify-between items-center mb-4">
            <MonoLabel>Seguimientos pendientes</MonoLabel>
            <Link
              href="/crm"
              className="text-xs text-accent hover:underline"
            >
              Ver CRM →
            </Link>
          </div>
          {pendingFollowUps.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sin follow-ups pendientes"
              sub="Crea uno desde la ficha de cualquier contacto."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {pendingFollowUps.slice(0, 6).map((f) => {
                const overdue = new Date(f.due_at) < now;
                return (
                  <Link
                    key={f.id}
                    href={`/crm/${f.contact_id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-3.5 py-3 transition-colors hover:border-accent/30"
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
                    <Badge
                      tone={
                        overdue
                          ? "down"
                          : f.priority === "alta"
                          ? "warn"
                          : "neutral"
                      }
                    >
                      {dateTime(f.due_at)}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </GlassPanel>

        {/* Top contactos por score */}
        <GlassPanel className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <MonoLabel>Top contactos</MonoLabel>
            <Link
              href="/crm"
              className="text-xs text-accent hover:underline"
            >
              Ver todos →
            </Link>
          </div>
          {top5.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin contactos aún"
              action={
                <Button variant="clayPrimary" size="sm" asChild>
                  <Link href="/crm/nuevo">
                    Crear primero
                    <ArrowRight width={12} height={12} />
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {top5.map((c) => {
                const sc = scoreColor(c.score);
                return (
                  <Link
                    key={c.id}
                    href={`/crm/${c.id}`}
                    className="group flex items-center gap-3 rounded-xl border border-border bg-bg-subtle px-3.5 py-3 transition-colors hover:border-accent/30"
                  >
                    <div className="w-9 h-9 rounded-full bg-bg text-fg border border-border flex items-center justify-center text-xs font-bold shrink-0">
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
        </GlassPanel>
      </div>

      {/* Recent interactions */}
      {recentInteractions.length > 0 && (
        <GlassPanel className="mb-5">
          <div className="flex justify-between items-center mb-4">
            <MonoLabel>Actividad reciente</MonoLabel>
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
        </GlassPanel>
      )}
      </>
      )}

      <div className="text-center text-[10px] uppercase tracking-widest text-fg-subtle py-6">
        {profile?.city || "Santiago"} · {profile?.country || "Chile"} · DROP. v0.13
      </div>
    </div>
  );
}
