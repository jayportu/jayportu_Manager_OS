import { Star } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import { listFoundingInvites } from "@/lib/queries/founding-invites";
import { FoundingInvitesClient } from "./founding-invites-client";

export const dynamic = "force-dynamic";

export default async function AdminFoundingInvitesPage() {
  await assertAdmin();
  const invites = await listFoundingInvites();

  const pending = invites.filter((i) => i.status === "pending").length;
  const accepted = invites.filter((i) => i.status === "accepted").length;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-7 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Star className="w-6 h-6 text-accent" />
            Founding Bookers
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {invites.length} invitaciones · {pending} pendientes · {accepted}{" "}
            aceptadas. La invitación es de un solo uso: al registrarse, el booker
            queda <strong>Founding</strong> (badge ★) y verificado automáticamente.
          </p>
        </div>
        <a
          href="/admin"
          className="inline-flex items-center gap-1.5 h-9 px-3 border-2 border-border bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
        >
          ← Backoffice
        </a>
      </div>

      <FoundingInvitesClient invites={invites} />
    </div>
  );
}
