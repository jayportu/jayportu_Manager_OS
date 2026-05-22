import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Bell,
  Star,
  ArrowRight,
  Users,
  Calendar,
  Briefcase,
  Clock,
} from "lucide-react";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listContacts, countContacts } from "@/lib/queries/contacts";
import { listPendingFollowUps } from "@/lib/queries/follow-ups";
import { listRecentInteractions } from "@/lib/queries/interactions";
import Link from "next/link";
import {
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
} from "@/types/database";
import { initials, scoreColor, relativeTime, dateTime } from "@/lib/format";

// Por ahora seguimos mostrando "alertas IA" mock — vienen en Sprint 4
const ALERTS_MOCK = [
  {
    icon: Bell,
    text: "Sprint 3 viene el press kit público con tracking de visitas y formularios de booking.",
    action: "Ver roadmap →",
  },
  {
    icon: Star,
    text: "Sprint 4 trae la IA local con Ollama: scoring automático y recomendaciones.",
    action: "Ver detalles →",
  },
  {
    icon: TrendingUp,
    text: "Empieza cargando tus contactos en el CRM para que el dashboard tenga data real.",
    action: "Ir al CRM →",
  },
];

export default async function DashboardPage() {
  const [profile, stats, pendingFollowUps, recentInteractions, topContacts] =
    await Promise.all([
      getMyProfile(),
      countContacts(),
      listPendingFollowUps(10),
      listRecentInteractions(8),
      listContacts({ orderBy: "score" }),
    ]);

  // Saludo según hora local
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const displayName =
    profile?.artist_name && profile.artist_name.trim().length > 0
      ? profile.artist_name.trim()
      : "Artista";

  const profileIncomplete =
    !profile?.artist_name || profile.artist_name.trim().length === 0;

  // KPIs
  const now = new Date();
  const overdueCount = pendingFollowUps.filter(
    (f) => new Date(f.due_at) < now
  ).length;
  const pipelineActive = topContacts.filter((c) =>
    [
      "contactado",
      "respondio",
      "interesado",
      "propuesta_enviada",
      "negociando",
      "confirmado",
    ].includes(c.status)
  ).length;
  const top5 = topContacts.slice(0, 5);

  const heroSubtitle =
    pendingFollowUps.length === 0 && stats.total === 0
      ? "Empieza cargando tus primeros contactos en el CRM."
      : `${pendingFollowUps.length} ${
          pendingFollowUps.length === 1 ? "follow-up pendiente" : "follow-ups pendientes"
        }${overdueCount > 0 ? ` · ${overdueCount} atrasados` : ""}.`;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-fg-muted mt-1">{heroSubtitle}</p>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold mb-2">
            Contactos
          </div>
          <div className="font-display text-4xl leading-none tracking-wider">
            {stats.total}
          </div>
          <div className="text-xs mt-2 flex items-center gap-1 text-fg-muted">
            <Users className="w-3 h-3" />
            En tu CRM
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold mb-2">
            Pipeline activo
          </div>
          <div className="font-display text-4xl leading-none tracking-wider">
            {pipelineActive}
          </div>
          <div className="text-xs mt-2 flex items-center gap-1 text-fg-muted">
            <Briefcase className="w-3 h-3" />
            En proceso
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold mb-2">
            Follow-ups
          </div>
          <div
            className={`font-display text-4xl leading-none tracking-wider ${
              overdueCount > 0 ? "text-danger" : ""
            }`}
          >
            {pendingFollowUps.length}
          </div>
          <div
            className={`text-xs mt-2 flex items-center gap-1 ${
              overdueCount > 0 ? "text-danger" : "text-fg-muted"
            }`}
          >
            {overdueCount > 0 ? (
              <>
                <TrendingDown className="w-3 h-3" />
                {overdueCount} atrasados
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                Pendientes
              </>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold mb-2">
            Score promedio
          </div>
          <div
            className={`font-display text-4xl leading-none tracking-wider ${
              stats.avgScore >= 70 ? "text-accent" : ""
            }`}
          >
            {stats.total > 0 ? stats.avgScore : "—"}
          </div>
          <div className="text-xs mt-2 flex items-center gap-1 text-fg-muted">
            <TrendingUp className="w-3 h-3" />
            de tus contactos
          </div>
        </Card>
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
                    <div className="w-9 h-9 rounded-full bg-secondary border border-border-strong flex items-center justify-center text-xs font-bold shrink-0">
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

      {/* IA Alerts (mock) — Sprint 4 trae las reales */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Recomendaciones
          </h2>
          <span className="text-[10px] uppercase tracking-widest text-fg-subtle">
            placeholder Sprint 4
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          {ALERTS_MOCK.map((alert, i) => {
            const Icon = alert.icon;
            return (
              <div
                key={i}
                className="flex gap-3 p-3.5 rounded-lg bg-bg border border-border"
              >
                <div className="w-7 h-7 rounded-md bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-fg leading-relaxed">
                    {alert.text}
                  </div>
                  <span className="text-[11px] font-semibold text-accent mt-1.5 hover:underline inline-flex items-center gap-1">
                    {alert.action}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="text-center text-[10px] uppercase tracking-widest text-fg-subtle py-6">
        {profile?.city || "Santiago"} · {profile?.country || "Chile"}
      </div>
    </div>
  );
}
