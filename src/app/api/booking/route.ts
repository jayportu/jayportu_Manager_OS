/**
 * POST /api/booking
 * Recibe el formulario público del press kit.
 * Crea booking_form_submissions y NO crea contacto automático
 * (Jaime decide en /press-kit si convertir o no, para evitar spam).
 */
import { createBookingSubmission } from "@/lib/queries/presskit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface BookingBody {
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  event_type?: string;
  event_date?: string | null;
  venue?: string;
  message?: string;
}

export async function POST(request: Request) {
  let body: BookingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { user_id, name } = body;
  if (!user_id) {
    return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
  }
  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  const ua = request.headers.get("user-agent") || "";
  const ref = request.headers.get("referer") || "";

  const submission = await createBookingSubmission({
    user_id,
    name: name.trim(),
    email: body.email?.trim() || "",
    phone: body.phone?.trim() || "",
    event_type: body.event_type?.trim() || "",
    event_date: body.event_date || null,
    venue: body.venue?.trim() || "",
    message: body.message?.trim() || "",
    referrer: ref,
    user_agent: ua,
  });

  if (!submission) {
    return NextResponse.json(
      { error: "No se pudo guardar el booking" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: submission.id });
}
