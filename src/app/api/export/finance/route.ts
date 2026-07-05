/**
 * Sprint 19 — GET /api/export/finance
 *
 * Devuelve un CSV con todos los eventos (calendar_events, cualquier tipo) que
 * tienen algún monto registrado o un payment_status distinto de 'none'.
 *
 * Query params:
 *   - from=YYYY-MM-DD   filtra por start_at >= from
 *   - to=YYYY-MM-DD     filtra por start_at < to (exclusivo)
 *   - status=paid|pending|partial   filtra por payment_status
 *
 * Columnas: fecha, hora, titulo, venue, contacto, monto_clp, estado_pago,
 *           documento, paid_at, notes.
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  PAYMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  type CalendarEventRow,
} from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

interface RowWithContact extends CalendarEventRow {
  contacts?: { name?: string } | null;
}

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: Request) {
  const limit = rateLimit(request, {
    key: "export-finance",
    max: 5,
    windowMs: 3_600_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiadas exportaciones. Intenta de nuevo más tarde." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const status = url.searchParams.get("status");

  let q = supabase
    .from("calendar_events")
    .select("*, contacts(name)")
    .eq("user_id", user.id)
    .order("start_at", { ascending: true });

  if (from) q = q.gte("start_at", `${from}T00:00:00.000Z`);
  if (to) q = q.lt("start_at", `${to}T00:00:00.000Z`);
  if (status) q = q.eq("payment_status", status);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as RowWithContact[];

  // Filtrar fuera del CSV los que no tienen ningún dato financiero
  const finance = rows.filter(
    (r) =>
      (r.amount_clp !== null && r.amount_clp !== undefined) ||
      r.payment_status !== "none"
  );

  const headers = [
    "fecha",
    "hora",
    "titulo",
    "venue",
    "contacto",
    "monto_clp",
    "estado_pago",
    "documento",
    "paid_at",
    "notas",
  ];

  const lines = [headers.join(",")];
  for (const r of finance) {
    const start = new Date(r.start_at);
    const fecha = start.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Santiago",
    });
    const hora = start.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    });
    const paidAt = r.paid_at
      ? new Date(r.paid_at).toLocaleDateString("es-CL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          timeZone: "America/Santiago",
        })
      : "";

    lines.push(
      [
        csvCell(fecha),
        csvCell(hora),
        csvCell(r.title),
        csvCell(r.location),
        csvCell(r.contacts?.name ?? ""),
        csvCell(r.amount_clp ?? ""),
        csvCell(PAYMENT_STATUS_LABELS[r.payment_status] ?? r.payment_status),
        csvCell(DOCUMENT_TYPE_LABELS[r.document_type] ?? r.document_type),
        csvCell(paidAt),
        csvCell(r.description),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const fileName = `drop-finanzas-${from || "todo"}-a-${to || "hoy"}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
