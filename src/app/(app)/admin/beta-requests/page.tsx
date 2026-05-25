/**
 * Sprint 23.5 — Workflow admin de solicitudes beta.
 *
 * Lista todas las solicitudes con su estado, expandible para ver
 * motivación completa. Acciones inline: aprobar, rechazar, waitlist.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { listBetaRequests } from "@/lib/queries/beta";
import { BetaRequestsTable } from "./beta-requests-table";

export const dynamic = "force-dynamic";

export default async function BetaRequestsPage() {
  await assertAdmin();
  const requests = await listBetaRequests({ limit: 200 });
  const counts = {
    new: requests.filter((r) => r.status === "new").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    waitlist: requests.filter((r) => r.status === "waitlist").length,
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 border-2 border-ink bg-white p-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — ADMIN · BETA REQUESTS
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          BETA.<span className="text-orange"></span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
          <span className="px-2.5 py-1 bg-orange border-2 border-ink">
            {counts.new} NUEVOS
          </span>
          <span className="px-2.5 py-1 bg-success text-white border-2 border-success">
            {counts.approved} APROBADOS
          </span>
          <span className="px-2.5 py-1 bg-warning border-2 border-ink">
            {counts.waitlist} WAITLIST
          </span>
          <span className="px-2.5 py-1 bg-danger text-white border-2 border-danger">
            {counts.rejected} RECHAZADOS
          </span>
        </div>
      </div>

      <BetaRequestsTable initialRequests={requests} />
    </div>
  );
}
