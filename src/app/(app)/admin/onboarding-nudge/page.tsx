import { assertAdmin } from "@/lib/queries/admin";
import { getOnboardingNudgeCandidates } from "@/lib/queries/onboarding-nudge";

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
      <div className="mb-6 border-2 border-border bg-bg-panel p-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — ADMIN · NUDGE DE ONBOARDING
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          PERFILES A MEDIAS<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          DJs que crearon cuenta hace +24h y dejaron el onboarding sin terminar.
          A cada uno se le manda <b>un</b> recordatorio con lo que le falta.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span
            className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 border-2 ${
              enabled
                ? "bg-success/15 border-success/40 text-success"
                : "bg-warning/15 border-warning/50 text-warning"
            }`}
          >
            {enabled ? "● Envío ACTIVO" : "○ Dormido (dry-run)"}
          </span>
          <span className="font-mono text-[11px] text-fg-muted">
            {candidates.length}{" "}
            {candidates.length === 1 ? "candidato" : "candidatos"} ahora mismo
          </span>
        </div>
        {!enabled && (
          <p className="font-mono text-[11px] text-fg-subtle mt-3 leading-relaxed">
            {"// "}El cron corre en seco: no manda nada hasta que pongas{" "}
            <span className="text-fg">ONBOARDING_NUDGE_ENABLED=true</span> en
            Vercel. Esta lista es exactamente a quién le llegaría.
          </p>
        )}
      </div>

      {candidates.length === 0 ? (
        <div className="border-2 border-dashed border-border/40 bg-cream p-10 text-center text-sm text-fg-muted">
          Nadie con onboarding a medias hace +24h. 🎉
        </div>
      ) : (
        <div className="border-2 border-border bg-bg-panel divide-y-2 divide-border/10">
          {candidates.map((c) => (
            <div key={c.user_id} className="p-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="font-display text-lg leading-none min-w-[140px]">
                {c.artist_name}
              </div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-border/30 text-fg-muted">
                {c.percent}% completo
              </span>
              <span className="font-mono text-[11px] text-fg-subtle">
                empezó {hace(c.created_at)}
              </span>
              <div className="w-full flex flex-wrap gap-1.5 mt-1">
                {c.missing.slice(0, 6).map((m) => (
                  <span
                    key={m}
                    className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-cream border border-border/20 text-fg-muted"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
