"use server";

/**
 * Bloque C · C2 — Server action para counteroffer del Booker.
 *
 * Caso de uso: el DJ cotizó (status='cotizado'). El booker no acepta el
 * monto o quiere cambiar fecha. Desde /b/[token] manda contraoferta:
 *  - counter_amount_clp (opcional, default = el cotizado)
 *  - counter_event_date (opcional)
 *  - counter_message (opcional, libre)
 * Status pasa a 'contraofertado'. El DJ ve la counter en su dashboard.
 */
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface CounterofferInput {
  token: string;
  amount?: number | null;
  eventDate?: string | null;
  message?: string;
}

export async function submitCounterofferAction(
  input: CounterofferInput
): Promise<
  { ok: true; bookingId: string } | { ok: false; error: string }
> {
  const { token, amount, eventDate, message } = input;
  if (!token || typeof token !== "string") {
    return { ok: false, error: "Token inválido" };
  }
  // Al menos uno de los 3 debe estar presente
  if (!amount && !eventDate && !(message && message.trim().length > 0)) {
    return {
      ok: false,
      error: "Mandá al menos un monto, fecha o mensaje en la contraoferta.",
    };
  }

  // Usamos admin client para el UPDATE (RLS del booker solo cubre el
  // happy path; aquí validamos manualmente).
  const admin = createAdminClient();
  const { data: booking, error: readErr } = await admin
    .from("booking_form_submissions")
    .select("*")
    .eq("view_token", token)
    .maybeSingle();
  if (readErr || !booking) {
    return { ok: false, error: "No se encontró el booking" };
  }

  if (booking.status !== "cotizado") {
    return {
      ok: false,
      error: `No podés contraofertar en este estado (${booking.status}). Solo cuando el DJ ya cotizó.`,
    };
  }

  // Validar que si hay sesión activa, sea el dueño del booking
  // (defensa anti-spam: si alguien NO logueado adivina el token puede
  // contraofertar, pero solo una vez porque status cambia). Aceptamos
  // ambos: anónimos con token (caso "me llegó el link y respondo desde
  // mail sin login") y logueados que son owners.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && booking.booker_user_id && user.id !== booking.booker_user_id) {
    return {
      ok: false,
      error: "Este request es de otro booker, no podés contraofertar.",
    };
  }

  const updatePayload: Record<string, unknown> = {
    status: "contraofertado",
    counter_amount_clp: amount && amount > 0 ? amount : null,
    counter_event_date: eventDate || null,
    counter_message: (message ?? "").trim(),
    counter_at: new Date().toISOString(),
  };

  const { error: updErr } = await admin
    .from("booking_form_submissions")
    .update(updatePayload)
    .eq("id", booking.id);

  if (updErr) {
    console.error("submitCounterofferAction update error:", updErr);
    return { ok: false, error: "No se pudo guardar la contraoferta." };
  }

  // Track event para KPIs del DJ
  await admin.from("presskit_events").insert({
    user_id: booking.user_id, // user_id del DJ
    event: "counter_submitted",
    metadata: {
      booking_id: booking.id,
      counter_amount_clp: amount ?? null,
      counter_event_date: eventDate ?? null,
    },
  });

  // C5 — Push notification al DJ
  try {
    const { sendPushToUser } = await import("@/lib/push/server");
    const bookerName = booking.name || "Un booker";
    const amountTxt = amount
      ? ` por $${amount.toLocaleString("es-CL")} CLP`
      : "";
    await sendPushToUser(booking.user_id, {
      title: "Contraoferta recibida en DROP.",
      body: `${bookerName} te contraofertó${amountTxt}. Tocá para responder.`,
      url: `/press-kit/bookings/${booking.id}`,
      tag: `booking-${booking.id}`,
    });
  } catch (pushErr) {
    // Si el push falla, no rompemos el flow del counter
    console.error("submitCounterofferAction push error:", pushErr);
  }

  revalidatePath(`/b/${token}`);
  revalidatePath(`/press-kit/bookings/${booking.id}`);
  revalidatePath("/press-kit");

  return { ok: true, bookingId: booking.id };
}
