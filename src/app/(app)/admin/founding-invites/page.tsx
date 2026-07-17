import { ArrowLeft, Star } from "lucide-react";
import { MonoLabel } from "@/components/hos";
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
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <MonoLabel>Admin · Founding Bookers</MonoLabel>
          <h1 className="mt-1.5 flex items-center gap-2 font-display text-4xl leading-[0.9] tracking-tight md:text-5xl">
            <Star className="h-7 w-7 shrink-0 text-accent" />
            Founding Bookers<span className="text-orange">.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/55">
            {invites.length} invitaciones · {pending} pendientes · {accepted}{" "}
            aceptadas. La invitación es de un solo uso: al registrarse, el booker
            queda <strong>Founding</strong> (badge ★) y verificado automáticamente.
          </p>
        </div>
        <a
          href="/admin"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Backoffice
        </a>
      </div>

      <FoundingInvitesClient invites={invites} />
    </div>
  );
}
