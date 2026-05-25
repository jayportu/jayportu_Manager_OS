/**
 * Sprint 23.5 — /admin/feedback · Inbox de feedback enviado por beta users.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { listFeedbackReports } from "@/lib/queries/beta";
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
      <div className="mb-6 border-2 border-ink bg-white p-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — ADMIN · FEEDBACK
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          FEEDBACK<span className="text-orange">.</span>
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
          <span className="px-2.5 py-1 bg-orange border-2 border-ink">
            {counts.new} NUEVOS
          </span>
          <span className="px-2.5 py-1 bg-info text-white border-2 border-info">
            {counts.in_progress} EN CURSO
          </span>
          <span className="px-2.5 py-1 bg-success text-white border-2 border-success">
            {counts.resolved} RESUELTOS
          </span>
        </div>
      </div>

      <FeedbackTable initialReports={reports} />
    </div>
  );
}
