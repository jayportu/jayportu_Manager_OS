import { Card } from "@/components/ui/card";
import {
  Shield,
  Users,
  UserCheck,
  TrendingUp,
  Bell,
  FileImage,
  Megaphone,
} from "lucide-react";
import {
  assertAdmin,
  getAllUsers,
  getGlobalMetrics,
} from "@/lib/queries/admin";
import { relativeTime, dateTime, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await assertAdmin();

  const [metrics, users] = await Promise.all([
    getGlobalMetrics(),
    getAllUsers(),
  ]);

  const onboardingRate =
    metrics.total_users > 0
      ? Math.round((metrics.users_with_onboarding / metrics.total_users) * 100)
      : 0;
  const pushAdoption =
    metrics.total_users > 0
      ? Math.round((metrics.push_subscribers / metrics.total_users) * 100)
      : 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-accent" />
            Backoffice
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Vista privada. Métricas globales y listado de todos los usuarios
            registrados.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="/admin/beta-requests"
            className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-ink bg-orange hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
          >
            Solicitudes Beta →
          </a>
          <a
            href="/admin/feedback"
            className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
          >
            Feedback →
          </a>
          <a
            href="/admin/analytics"
            className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
          >
            Analytics →
          </a>
          <a
            href="/admin/beta-reminder"
            className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
          >
            Recordatorio Beta →
          </a>
          <span className="text-[10px] uppercase tracking-widest text-fg-subtle">
            Solo admin
          </span>
        </div>
      </div>

      {/* KPIs */}
      <section className="mb-7">
        <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3">
          Métricas globales
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Usuarios totales"
            value={metrics.total_users}
            sub={`${metrics.signups_last_30d} en últimos 30d`}
            icon={Users}
          />
          <Kpi
            label="Onboarding"
            value={`${onboardingRate}%`}
            sub={`${metrics.users_with_onboarding} de ${metrics.total_users} completados`}
            icon={UserCheck}
          />
          <Kpi
            label="Activos 7d"
            value={metrics.active_last_7d}
            sub={`con login reciente`}
            icon={TrendingUp}
          />
          <Kpi
            label="Push subs"
            value={metrics.push_subscribers}
            sub={`${pushAdoption}% adopción`}
            icon={Bell}
          />
          <Kpi
            label="Contactos"
            value={metrics.total_contacts}
            sub="en todos los CRMs"
            icon={Users}
          />
          <Kpi
            label="Snapshots"
            value={metrics.total_snapshots}
            sub="en todas las plataformas"
            icon={TrendingUp}
          />
          <Kpi
            label="Posts"
            value={metrics.total_posts}
            sub="registrados"
            icon={FileImage}
          />
          <Kpi
            label="Campañas growth"
            value={metrics.total_campaigns}
            sub="creadas"
            icon={Megaphone}
          />
        </div>
      </section>

      {/* Tabla usuarios */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3">
          Usuarios ({users.length})
        </h2>
        {users.length === 0 ? (
          <Card className="p-8 text-center text-sm text-fg-muted">
            No hay usuarios registrados aún.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-fg-muted">
                    <th className="px-3 py-2.5 font-semibold">Artista</th>
                    <th className="px-3 py-2.5 font-semibold">Email</th>
                    <th className="px-3 py-2.5 font-semibold">Ciudad</th>
                    <th className="px-3 py-2.5 font-semibold">Signup</th>
                    <th className="px-3 py-2.5 font-semibold">Último login</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Cont.</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Posts</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Snaps</th>
                    <th className="px-3 py-2.5 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isOnboarded = !!u.onboarding_completed_at;
                    return (
                      <tr
                        key={u.user_id}
                        className="border-b border-border last:border-b-0 hover:bg-bg-subtle/40 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-semibold">
                          {u.artist_name || (
                            <span className="text-fg-subtle italic">sin nombre</span>
                          )}
                          {u.is_admin && (
                            <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                              admin
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-fg-muted text-xs">
                          {u.email}
                        </td>
                        <td className="px-3 py-2.5 text-fg-muted text-xs">
                          {u.city || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-fg-muted text-xs whitespace-nowrap">
                          {shortDate(u.created_at)}
                        </td>
                        <td className="px-3 py-2.5 text-fg-muted text-xs whitespace-nowrap">
                          {u.last_sign_in_at
                            ? relativeTime(u.last_sign_in_at)
                            : (
                              <span className="text-fg-subtle italic">nunca</span>
                            )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {u.contacts_count}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {u.posts_count}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {u.snapshots_count}
                        </td>
                        <td className="px-3 py-2.5">
                          {isOnboarded ? (
                            <span
                              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 border border-success/30 text-success"
                              title={`Completó el wizard ${dateTime(u.onboarding_completed_at!)}`}
                            >
                              activo
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/15 border border-warning/30 text-warning">
                              pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <p className="text-[11px] text-fg-subtle mt-6 text-center">
        Los datos se leen vía service_role (RLS bypass). Solo accesible para
        usuarios con <code>is_admin=true</code> en dj_profile.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof Users;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">
          {label}
        </div>
        <Icon className="w-3.5 h-3.5 text-fg-subtle" />
      </div>
      <div className="font-display text-3xl leading-none tabular-nums">
        {value}
      </div>
      <div className="text-[10px] text-fg-subtle mt-1.5">{sub}</div>
    </Card>
  );
}
