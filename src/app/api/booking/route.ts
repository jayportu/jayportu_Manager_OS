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
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Recorta a un máximo (endpoint anónimo → no aceptar payloads enormes). */
const clip = (s: string | undefined | null, n: number): string =>
  (s ?? "").trim().slice(0, n);

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
  // Endpoint público (form anónimo) → rate-limit anti-abuso.
  const limit = rateLimit(request, { key: "booking", max: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto." },
      { status: 429 }
    );
  }

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
    name: clip(name, 120),
    email: clip(body.email, 200),
    phone: clip(body.phone, 40),
    event_type: clip(body.event_type, 80),
    event_date: body.event_date || null,
    venue: clip(body.venue, 160),
    message: clip(body.message, 2000),
    referrer: clip(ref, 500),
    user_agent: clip(ua, 500),
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
