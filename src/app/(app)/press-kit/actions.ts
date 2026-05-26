"use server";

import {
  updateProfileSlug,
  updateBookingStatus,
  updateBookingWorkflow,
} from "@/lib/queries/presskit";
import { createContact } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { BookingStatus, ContactInsert } from "@/types/database";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function errResult(e: unknown): { ok: false; error: string } {
  return {
    ok: false,
    error: e instanceof Error ? e.message : "Error desconocido",
  };
}

export async function updateSlugAction(slug: string): Promise<Result> {
  try {
    await updateProfileSlug(slug);
    revalidatePath("/press-kit");
    revalidatePath("/configuracion");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

export async function updateBookingStatusAction(
  id: string,
  status: BookingStatus
): Promise<Result> {
  try {
    await updateBookingStatus(id, status);
    revalidatePath("/press-kit");
    revalidatePath(`/press-kit/bookings/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

/**
 * Convierte un booking en contact + actualiza booking status a "convertido"
 * con created_contact_id.
 */
export async function convertBookingToContactAction(
  bookingId: string
): Promise<Result<{ contact_id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    // Fetch booking
    const { data: booking, error: bErr } = await supabase
      .from("booking_form_submissions")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();
    if (bErr || !booking) throw new Error("Booking no encontrado");

    if (booking.created_contact_id) {
      return { ok: true, data: { contact_id: booking.created_contact_id } };
    }

    // Crear contact con datos del booking
    const contactInput: ContactInsert = {
      name: booking.name,
      type: "cliente_evento_privado",
      city: "",
      country: "Chile",
      email: booking.email,
      whatsapp: booking.phone.replace(/\D/g, ""),
      instagram: "",
      website: "",
      contact_person: booking.name,
      contact_role: booking.event_type || "Booking",
      music_style: "",
      main_channel: booking.email ? "email" : "whatsapp",
      status: "nuevo",
      notes: [
        booking.venue ? `Venue: ${booking.venue}` : "",
        booking.event_date ? `Fecha: ${booking.event_date}` : "",
        booking.event_type ? `Tipo: ${booking.event_type}` : "",
        booking.message ? `\nMensaje:\n${booking.message}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      source: "presskit_form",
    };
    const contact = await createContact(contactInput);

    // Actualizar booking — Sprint 20: el nuevo status equivalente a "convertido"
    // es 'respondido' (se creó contacto, aún no es agendado ni cotizado oficial).
    await supabase
      .from("booking_form_submissions")
      .update({ status: "respondido", created_contact_id: contact.id })
      .eq("id", bookingId)
      .eq("user_id", user.id);

    revalidatePath("/press-kit");
    revalidatePath(`/press-kit/bookings/${bookingId}`);
    revalidatePath("/crm");
    revalidatePath("/dashboard");

    return { ok: true, data: { contact_id: contact.id } };
  } catch (e) {
    return errResult(e);
  }
}

/**
 * Sprint 20 — Cambio de status con workflow auto:
 *   cotizado → crea follow_up para +3 días
 *   agendado → crea calendar_event con monto y payment_status=pending
 */
export async function updateBookingWorkflowAction(
  bookingId: string,
  patch: {
    status: BookingStatus;
    quoted_amount_clp?: number | null;
    notes_internal?: string;
    event_date?: string | null;
  }
): Promise<Result<{ followUpId?: string; calendarEventId?: string }>> {
  try {
    const result = await updateBookingWorkflow(bookingId, patch);
    revalidatePath("/press-kit");
    revalidatePath(`/press-kit/bookings/${bookingId}`);
    revalidatePath("/crm");
    revalidatePath("/calendario");
    revalidatePath("/dashboard");
    return { ok: true, data: result };
  } catch (e) {
    return errResult(e);
  }
}

/**
 * Bloque C · C4 — DJ acepta la contraoferta del booker.
 *
 * Pasa el booking a 'agendado' usando los campos counter_* como
 * definitivos (counter_amount → quoted_amount; counter_event_date →
 * event_date). Internamente delega a updateBookingWorkflow para que
 * cree el calendar_event automático del Sprint 20.
 */
export async function acceptCounterofferAction(
  bookingId: string
): Promise<Result<{ calendarEventId?: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    // Leer counter actual
    const { data: booking, error: readErr } = await supabase
      .from("booking_form_submissions")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();
    if (readErr || !booking) throw new Error("Booking no encontrado");

    const b = booking as {
      counter_amount_clp: number | null;
      counter_event_date: string | null;
      event_date: string | null;
      quoted_amount_clp: number | null;
      status: string;
    };

    if (b.status !== "contraofertado") {
      throw new Error(
        `No podés aceptar contraoferta en estado '${b.status}'`
      );
    }

    // Resolver valores finales
    const finalAmount = b.counter_amount_clp ?? b.quoted_amount_clp;
    const finalDate = b.counter_event_date ?? b.event_date;

    if (!finalDate) {
      throw new Error(
        "Falta la fecha del evento para agendar. Pedile al booker que la incluya."
      );
    }

    // Promover a agendado (crea calendar_event auto via updateBookingWorkflow)
    const result = await updateBookingWorkflow(bookingId, {
      status: "agendado",
      quoted_amount_clp: finalAmount,
      event_date: finalDate,
    });

    // C5 — Push notification al booker si tiene cuenta logueada
    if (booking.booker_user_id) {
      try {
        const { sendPushToUser } = await import("@/lib/push/server");
        const amountTxt = finalAmount
          ? ` · $${finalAmount.toLocaleString("es-CL")} CLP`
          : "";
        await sendPushToUser(booking.booker_user_id, {
          title: "Tu evento fue agendado",
          body: `El DJ aceptó tu contraoferta${amountTxt}. Próximo paso: contrato y pago.`,
          url: "/booker/requests",
          tag: `booking-${bookingId}`,
        });
      } catch (pushErr) {
        console.error("acceptCounterofferAction push error:", pushErr);
      }
    }

    revalidatePath("/press-kit");
    revalidatePath(`/press-kit/bookings/${bookingId}`);
    revalidatePath("/calendario");
    revalidatePath("/dashboard");
    revalidatePath("/booker/requests");
    return { ok: true, data: { calendarEventId: result.calendarEventId } };
  } catch (e) {
    return errResult(e);
  }
}

/**
 * Bloque C · C4 — DJ recotiza después de una contraoferta.
 *
 * Si la contraoferta del booker no le sirve, el DJ puede mandar una
 * nueva cotización. Vuelve a status='cotizado' con el nuevo monto y
 * limpia los campos counter_* para que el booker pueda contraofertar
 * de nuevo si quiere.
 */
export async function recounterAction(
  bookingId: string,
  newAmount: number,
  newDate?: string | null
): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    if (!newAmount || newAmount <= 0) {
      throw new Error("Monto inválido");
    }

    const updatePayload: Record<string, unknown> = {
      status: "cotizado",
      quoted_amount_clp: newAmount,
      quoted_at: new Date().toISOString(),
      // Limpiar counter para que el booker pueda mandar uno nuevo
      counter_amount_clp: null,
      counter_event_date: null,
      counter_message: "",
      counter_at: null,
    };
    if (newDate) updatePayload.event_date = newDate;

    // Necesitamos el booker_user_id antes del update (para push después)
    const { data: pre } = await supabase
      .from("booking_form_submissions")
      .select("booker_user_id, view_token")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase
      .from("booking_form_submissions")
      .update(updatePayload)
      .eq("id", bookingId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);

    // C5 — Push notification al booker
    if (pre?.booker_user_id) {
      try {
        const { sendPushToUser } = await import("@/lib/push/server");
        await sendPushToUser(pre.booker_user_id, {
          title: "Nueva cotización del DJ",
          body: `El DJ te recotizó por $${newAmount.toLocaleString("es-CL")} CLP. Tocá para revisar.`,
          url: `/b/${pre.view_token}`,
          tag: `booking-${bookingId}`,
        });
      } catch (pushErr) {
        console.error("recounterAction push error:", pushErr);
      }
    }

    revalidatePath("/press-kit");
    revalidatePath(`/press-kit/bookings/${bookingId}`);
    revalidatePath("/dashboard");
    revalidatePath("/booker/requests");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}
