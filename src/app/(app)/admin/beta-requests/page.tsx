/**
 * Sprint 23.5 — Workflow admin de solicitudes beta.
 *
 * Lista todas las solicitudes con su estado, expandible para ver
 * motivación completa. Acciones inline: aprobar, rechazar, waitlist.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { listBetaRequests } from "@/lib/queries/beta";
import { SectionHero, Badge } from "@/components/hos";
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
      <SectionHero
        kicker="ADMIN · BETA REQUESTS"
        title="BETA"
        actions={
          <>
            <Badge tone="warn" solid>
              {counts.new} NUEVOS
            </Badge>
            <Badge tone="up" solid>
              {counts.approved} APROBADOS
            </Badge>
            <Badge tone="neutral" solid>
              {counts.waitlist} WAITLIST
            </Badge>
            <Badge tone="down" solid>
              {counts.rejected} RECHAZADOS
            </Badge>
          </>
        }
      />

      <BetaRequestsTable initialRequests={requests} />
    </div>
  );
}
