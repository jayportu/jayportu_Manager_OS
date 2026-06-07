/**
 * POST /api/booking
 * Recibe el formulario público del press kit.
 * Crea booking_form_submissions y NO crea contacto automático
 * (Jaime decide en /press-kit si convertir o no, para evitar spam).
 *
 * Bloque B — Si el visitante tiene sesión de booker activa, asociamos
 * el booking a su booker_user_id para que aparezca en /booker/requests.
 */
import { createBookingSubmission } from "@/lib/queries/presskit";
import { createClient } from "@/lib/supabase/server";
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
  // Exigir al menos una vía de contacto (el form promete "respondo en 24h").
  const contactEmail = (body.email || "").trim();
  const contactPhone = (body.phone || "").trim();
  if (!contactEmail && !contactPhone) {
    return NextResponse.json(
      { error: "Déjanos un email o teléfono de contacto" },
      { status: 400 }
    );
  }

  const ua = request.headers.get("user-agent") || "";
  const ref = request.headers.get("referer") || "";

  // Bloque B — Si hay un booker logueado, asociamos el booking
  let bookerUserId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user: visitor },
    } = await supabase.auth.getUser();
    if (visitor) {
      // Solo asociamos si NO es el dueño del press kit (un DJ probando su form)
      // y si tiene booker_account (no es otro DJ).
      if (visitor.id !== user_id) {
        const { data: booker } = await supabase
          .from("booker_accounts")
          .select("user_id")
          .eq("user_id", visitor.id)
          .maybeSingle();
        if (booker) bookerUserId = visitor.id;
      }
    }
  } catch {
    // Falla silenciosa: si no podemos detectar booker, queda anónimo.
  }

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
    booker_user_id: bookerUserId,
  });

  if (!submission) {
    return NextResponse.json(
      { error: "No se pudo guardar el booking" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: submission.id,
    view_token: submission.view_token,
  });
}
