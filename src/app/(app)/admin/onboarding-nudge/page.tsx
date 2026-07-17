import { assertAdmin } from "@/lib/queries/admin";
import { getOnboardingNudgeCandidates } from "@/lib/queries/onboarding-nudge";
import { SectionHero, Badge, GlassPanel, ClayChip, EmptyState } from "@/components/hos";

export const dynamic = "force-dynamic";

function hace(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 48) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default async function OnboardingNudgePage() {
  await assertAdmin();
  const enabled = process.env.ONBOARDING_NUDGE_ENABLED === "true";
  const candidates = await getOnboardingNudgeCandidates();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <SectionHero
        kicker="ADMIN · NUDGE DE ONBOARDING"
        title="PERFILES A MEDIAS"
        actions={
          <>
            <Badge tone={enabled ? "up" : "warn"}>
              {enabled ? "● Envío ACTIVO" : "○ Dormido (dry-run)"}
            </Badge>
            <span className="font-mono text-[11px] text-white/45">
              {candidates.length}{" "}
              {candidates.length === 1 ? "candidato" : "candidatos"} ahora mismo
            </span>
          </>
        }
      />

      <p className="text-sm text-white/55 mb-4 max-w-2xl">
        DJs que crearon cuenta hace +24h y dejaron el onboarding sin terminar.
        A cada uno se le manda <b>un</b> recordatorio con lo que le falta.
      </p>

      {!enabled && (
        <p className="font-mono text-[11px] text-white/35 mb-6 leading-relaxed max-w-2xl">
          {"// "}El cron corre en seco: no manda nada hasta que pongas{" "}
          <span className="text-white/70">ONBOARDING_NUDGE_ENABLED=true</span> en
          Vercel. Esta lista es exactamente a quién le llegaría.
        </p>
      )}

      {candidates.length === 0 ? (
        <EmptyState title="Nadie con onboarding a medias hace +24h. 🎉" />
      ) : (
        <GlassPanel padded={false}>
          {candidates.map((c) => (
            <div
              key={c.user_id}
              className="border-b border-white/[0.06] p-4 flex flex-wrap items-center gap-x-4 gap-y-2 last:border-b-0"
            >
              <div className="font-display text-lg leading-none min-w-[140px] text-white/90">
                {c.artist_name}
              </div>
              <Badge tone="neutral">{c.percent}% completo</Badge>
              <span className="font-mono text-[11px] text-white/35">
                empezó {hace(c.created_at)}
              </span>
              <div className="w-full flex flex-wrap gap-1.5 mt-1">
                {c.missing.slice(0, 6).map((m) => (
                  <ClayChip key={m}>{m}</ClayChip>
                ))}
              </div>
            </div>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}
