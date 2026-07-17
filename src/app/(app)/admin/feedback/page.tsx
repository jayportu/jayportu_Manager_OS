/**
 * Sprint 23.5 — /admin/feedback · Inbox de feedback enviado por beta users.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { listFeedbackReports } from "@/lib/queries/beta";
import { SectionHero, Badge } from "@/components/hos";
import { FeedbackTable } from "./feedback-table";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
  await assertAdmin();
  const reports = await listFeedbackReports({ limit: 200 });
  const counts = {
    new: reports.filter((r) => r.status === "new").length,
    in_progress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <SectionHero
        kicker="ADMIN · FEEDBACK"
        title="FEEDBACK"
        actions={
          <>
            <Badge tone="warn" solid>
              {counts.new} NUEVOS
            </Badge>
            <Badge tone="info" solid>
              {counts.in_progress} EN CURSO
            </Badge>
            <Badge tone="up" solid>
              {counts.resolved} RESUELTOS
            </Badge>
          </>
        }
      />

      <FeedbackTable initialReports={reports} />
    </div>
  );
}
