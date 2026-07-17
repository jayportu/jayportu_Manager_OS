import {
  Users,
  UserCheck,
  TrendingUp,
  Bell,
  FileImage,
  Megaphone,
} from "lucide-react";
import {
  SectionHero,
  GlassPanel,
  Badge,
  TableShell,
  Th,
  Td,
  EmptyState,
  MonoLabel,
} from "@/components/hos";
import {
  assertAdmin,
  getAllUsers,
  getGlobalMetrics,
} from "@/lib/queries/admin";
import { relativeTime, dateTime, shortDate } from "@/lib/format";
import { DeletePendingUserButton } from "./delete-pending-user-button";
import { AccountStatusControl } from "./account-status-control";
import { VerifyDjButton } from "./verify-dj-button";
import { DjVerificationChips } from "./dj-verification-chips";
import { DropPickButton } from "./drop-pick-button";

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
      {/* Header — la navegación entre secciones la da la barra fija (admin/layout). */}
      <SectionHero
        kicker="Admin"
        title="Backoffice"
        sub="Vista privada. Métricas globales y listado de todos los usuarios registrados."
      />

      {/* KPIs */}
      <section className="mb-7">
        <div className="mb-3">
          <MonoLabel>Métricas globales</MonoLabel>
        </div>
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
        <div className="mb-3">
          <MonoLabel>Usuarios ({users.length})</MonoLabel>
        </div>
        {users.length === 0 ? (
          <EmptyState icon={Users} title="No hay usuarios registrados aún." />
        ) : (
          <GlassPanel padded={false}>
            <TableShell bare>
              <thead>
                <tr>
                  <Th>Artista</Th>
                  <Th>Email</Th>
                  <Th>Ciudad</Th>
                  <Th>Signup</Th>
                  <Th>Último login</Th>
                  <Th align="right">Cont.</Th>
                  <Th align="right">Posts</Th>
                  <Th align="right">Snaps</Th>
                  <Th>Estado</Th>
                  <Th align="right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isOnboarded = !!u.onboarding_completed_at;
                  return (
                    <tr
                      key={u.user_id}
                      className="transition-colors hover:bg-white/[0.06]"
                    >
                      <Td className="font-semibold text-white/90">
                        {u.artist_name || (
                          <span className="text-white/40 italic">sin nombre</span>
                        )}
                        {u.is_admin && (
                          <span className="ml-2 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                            admin
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs text-white/60">{u.email}</Td>
                      <Td className="text-xs text-white/60">{u.city || "—"}</Td>
                      <Td className="text-xs text-white/60 whitespace-nowrap">
                        {shortDate(u.created_at)}
                      </Td>
                      <Td className="text-xs text-white/60 whitespace-nowrap">
                        {u.last_sign_in_at
                          ? relativeTime(u.last_sign_in_at)
                          : (
                            <span className="text-white/40 italic">nunca</span>
                          )}
                      </Td>
                      <Td align="right" className="tabular-nums text-white/75">
                        {u.contacts_count}
                      </Td>
                      <Td align="right" className="tabular-nums text-white/75">
                        {u.posts_count}
                      </Td>
                      <Td align="right" className="tabular-nums text-white/75">
                        {u.snapshots_count}
                      </Td>
                      <Td>
                        {u.account_status === "banned" ? (
                          <span title={u.account_status_reason || undefined}>
                            <Badge tone="down">baneado</Badge>
                          </span>
                        ) : u.account_status === "suspended" ? (
                          <span title={u.account_status_reason || undefined}>
                            <Badge tone="warn">suspendido</Badge>
                          </span>
                        ) : isOnboarded ? (
                          <span
                            title={`Completó el wizard ${dateTime(u.onboarding_completed_at!)}`}
                          >
                            <Badge tone="up">activo</Badge>
                          </span>
                        ) : (
                          <Badge tone="warn">pendiente</Badge>
                        )}
                      </Td>
                      <Td align="right">
                        {u.is_admin ? (
                          <span className="text-white/40 text-xs">—</span>
                        ) : isOnboarded ? (
                          <div className="inline-flex flex-col items-end gap-1.5">
                            <VerifyDjButton
                              djUserId={u.user_id}
                              verified={!!u.verified_at}
                              name={u.artist_name || u.email}
                            />
                            <DjVerificationChips
                              djUserId={u.user_id}
                              verifications={u.verifications}
                            />
                            <DropPickButton
                              djUserId={u.user_id}
                              isPick={u.is_drop_pick}
                              name={u.artist_name || u.email}
                            />
                            <AccountStatusControl
                              userId={u.user_id}
                              artistName={u.artist_name}
                              status={u.account_status}
                            />
                          </div>
                        ) : (
                          <DeletePendingUserButton
                            userId={u.user_id}
                            email={u.email}
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </GlassPanel>
        )}
      </section>

      <p className="text-[11px] text-white/40 mt-6 text-center">
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
    <div className="hos-clay rounded-2xl px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
          — {label}
        </div>
        <Icon className="w-3.5 h-3.5 text-white/30" />
      </div>
      <div className="font-display text-3xl leading-none tabular-nums">
        {value}
      </div>
      <div className="text-[10px] text-white/40 mt-1.5">{sub}</div>
    </div>
  );
}
