import Link from "next/link";
import { Building2, BadgeCheck } from "lucide-react";
import {
  SectionHero,
  GlassPanel,
  Badge,
  TableShell,
  Th,
  Td,
  EmptyState,
} from "@/components/hos";
import { Button } from "@/components/ui/button";
import { assertAdmin } from "@/lib/queries/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKER_TYPES } from "@/types/database";
import { shortDate } from "@/lib/format";
import { VerifyBookerButton } from "./verify-button";
import { BookerStatusControl } from "./booker-status-control";
import type { AccountStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  BOOKER_TYPES.map((t) => [t.value, t.label])
);

interface BookerRow {
  user_id: string;
  full_name: string;
  email: string;
  booker_type: string;
  city: string;
  country: string;
  in_directory: boolean;
  accepts_pitches: boolean;
  verified_at: string | null;
  verification_requested_at: string | null;
  verification_evidence: string | null;
  is_founding: boolean;
  account_status: AccountStatus;
  created_at: string;
}

export default async function AdminBookersPage() {
  await assertAdmin();

  const admin = createAdminClient();
  const { data } = await admin
    .from("booker_accounts")
    .select(
      "user_id, full_name, email, booker_type, city, country, in_directory, accepts_pitches, verified_at, verification_requested_at, verification_evidence, is_founding, account_status, created_at"
    )
    .order("created_at", { ascending: false });
  const bookers = (data as BookerRow[]) ?? [];

  const verifiedCount = bookers.filter((b) => b.verified_at).length;
  // F2b — cola de verificación self-service: pidieron, aún no verificados, activos.
  const pending = bookers.filter(
    (b) =>
      b.verification_requested_at &&
      !b.verified_at &&
      b.account_status === "active"
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <SectionHero
        kicker="Admin · Bookers"
        title="Bookers"
        sub={`${bookers.length} cuentas · ${verifiedCount} verificadas. Verificar habilita el badge ✓ y la aparición en el directorio de lugares.`}
        actions={
          <Button asChild variant="clay" size="sm">
            <Link href="/admin">← Backoffice</Link>
          </Button>
        }
      />

      {pending.length > 0 && (
        <GlassPanel padded={false} className="mb-6 border-warning/40">
          <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2.5">
            <BadgeCheck className="w-4 h-4 text-warning" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-warning">
              Pendientes de verificación · {pending.length}
            </span>
          </div>
          <ul className="divide-y divide-white/[0.06]">
            {pending.map((b) => (
              <li
                key={b.user_id}
                className="p-4 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white/90">
                    {b.full_name || (
                      <span className="text-white/40 italic">sin nombre</span>
                    )}
                    <span className="text-white/55 font-normal"> · {b.email}</span>
                  </div>
                  <div className="text-[11px] text-white/45 mt-0.5">
                    {TYPE_LABEL[b.booker_type] ?? b.booker_type}
                    {b.city ? ` · ${b.city}` : ""} · pidió{" "}
                    {shortDate(b.verification_requested_at ?? "")}
                  </div>
                  {b.verification_evidence && (
                    <p className="text-[13px] text-white/60 mt-2 whitespace-pre-wrap break-words border-l-2 border-white/15 pl-3">
                      {b.verification_evidence}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <VerifyBookerButton
                    bookerUserId={b.user_id}
                    verified={false}
                    name={b.full_name || b.email}
                  />
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      {bookers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No hay cuentas de booker todavía."
        />
      ) : (
        <GlassPanel padded={false}>
          <TableShell bare>
            <thead>
              <tr>
                <Th>Nombre / Org</Th>
                <Th>Email</Th>
                <Th>Tipo</Th>
                <Th>Ciudad</Th>
                <Th>Signup</Th>
                <Th>Directorio</Th>
                <Th>Pitches</Th>
                <Th>Estado</Th>
                <Th align="right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {bookers.map((b) => (
                <tr
                  key={b.user_id}
                  className="transition-colors hover:bg-white/[0.06]"
                >
                  <Td className="font-semibold text-white/90">
                    {b.full_name || (
                      <span className="text-white/40 italic">sin nombre</span>
                    )}
                  </Td>
                  <Td className="text-white/60 text-xs">{b.email}</Td>
                  <Td className="text-white/60 text-xs">
                    {TYPE_LABEL[b.booker_type] ?? b.booker_type}
                  </Td>
                  <Td className="text-white/60 text-xs">
                    {[b.city, b.country].filter(Boolean).join(", ") || "—"}
                  </Td>
                  <Td className="text-white/60 text-xs whitespace-nowrap">
                    {shortDate(b.created_at)}
                  </Td>
                  <Td>{b.in_directory ? "Sí" : "—"}</Td>
                  <Td>{b.accepts_pitches ? "Sí" : "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      {b.is_founding && (
                        <Badge tone="warn" solid>
                          ★ founding
                        </Badge>
                      )}
                      {b.verified_at ? (
                        <Badge tone="up">verificado</Badge>
                      ) : (
                        <Badge tone="warn">sin verificar</Badge>
                      )}
                      {b.account_status === "suspended" && (
                        <Badge tone="warn">suspendido</Badge>
                      )}
                      {b.account_status === "banned" && (
                        <Badge tone="down">baneado</Badge>
                      )}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="inline-flex flex-col items-end gap-1.5">
                      <VerifyBookerButton
                        bookerUserId={b.user_id}
                        verified={!!b.verified_at}
                        name={b.full_name || b.email}
                      />
                      <BookerStatusControl
                        bookerUserId={b.user_id}
                        name={b.full_name || b.email}
                        status={b.account_status}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </GlassPanel>
      )}
    </div>
  );
}
