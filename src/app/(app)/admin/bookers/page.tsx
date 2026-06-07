import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKER_TYPES } from "@/types/database";
import { shortDate } from "@/lib/format";
import { VerifyBookerButton } from "./verify-button";

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
  is_founding: boolean;
  created_at: string;
}

export default async function AdminBookersPage() {
  await assertAdmin();

  const admin = createAdminClient();
  const { data } = await admin
    .from("booker_accounts")
    .select(
      "user_id, full_name, email, booker_type, city, country, in_directory, accepts_pitches, verified_at, is_founding, created_at"
    )
    .order("created_at", { ascending: false });
  const bookers = (data as BookerRow[]) ?? [];

  const verifiedCount = bookers.filter((b) => b.verified_at).length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-7 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" />
            Bookers
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {bookers.length} cuentas · {verifiedCount} verificadas. Verificar
            habilita el badge ✓ y la aparición en el directorio de lugares.
          </p>
        </div>
        <a
          href="/admin"
          className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
        >
          ← Backoffice
        </a>
      </div>

      {bookers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-fg-muted">
          No hay cuentas de booker todavía.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle border-b border-border">
                <tr className="text-left text-[10px] uppercase tracking-wider text-fg-muted">
                  <th className="px-3 py-2.5 font-semibold">Nombre / Org</th>
                  <th className="px-3 py-2.5 font-semibold">Email</th>
                  <th className="px-3 py-2.5 font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 font-semibold">Ciudad</th>
                  <th className="px-3 py-2.5 font-semibold">Signup</th>
                  <th className="px-3 py-2.5 font-semibold">Directorio</th>
                  <th className="px-3 py-2.5 font-semibold">Pitches</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {bookers.map((b) => (
                  <tr
                    key={b.user_id}
                    className="border-b border-border last:border-b-0 hover:bg-bg-subtle/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 font-semibold">
                      {b.full_name || (
                        <span className="text-fg-subtle italic">sin nombre</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted text-xs">{b.email}</td>
                    <td className="px-3 py-2.5 text-fg-muted text-xs">
                      {TYPE_LABEL[b.booker_type] ?? b.booker_type}
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted text-xs">
                      {[b.city, b.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-fg-muted text-xs whitespace-nowrap">
                      {shortDate(b.created_at)}
                    </td>
                    <td className="px-3 py-2.5">{b.in_directory ? "Sí" : "—"}</td>
                    <td className="px-3 py-2.5">{b.accepts_pitches ? "Sí" : "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {b.is_founding && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange/20 border border-orange/50 text-orange font-bold">
                            ★ founding
                          </span>
                        )}
                        {b.verified_at ? (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 border border-success/30 text-success">
                            verificado
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/15 border border-warning/30 text-warning">
                            sin verificar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <VerifyBookerButton
                        bookerUserId={b.user_id}
                        verified={!!b.verified_at}
                        name={b.full_name || b.email}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
