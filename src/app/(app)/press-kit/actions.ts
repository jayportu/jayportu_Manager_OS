"use server";

import {
  updateProfileSlug,
  updateBookingStatus,
  updateBookingWorkflow,
} from "@/lib/queries/presskit";
import { createContact, deleteContact } from "@/lib/queries/contacts";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  bookingConfirmedDjEmailHtml,
  bookingConfirmedDjEmailText,
  bookingConfirmedBookerEmailHtml,
  bookingConfirmedBookerEmailText,
} from "@/lib/email/templates";
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

async function sendBookingConfirmedEmails(bookingId: string): Promise<void> {
  if (!isResendConfigured()) return;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: booking } = await supabase
      .from("booking_form_submissions")
      .select("name, email, event_date, venue, quoted_amount_clp")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!booking) return;

    const admin = createAdminClient();
    const { data: djRaw } = await admin
      .from("dj_profile")
      .select("artist_name, public_email, slug")
      .eq("user_id", user.id)
      .maybeSingle();

    const djProfile = djRaw as {
      artist_name?: string;
      public_email?: string;
      slug?: string;
    } | null;
    const b = booking as {
      name?: string;
      email?: string;
      event_date?: string;
      venue?: string;
      quoted_amount_clp?: number;
    };

    const djEmail = djProfile?.public_email || user.email;
    const djArtistName = djProfile?.artist_name ?? "DJ";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dropgigs.com";
    const dashboardUrl = `${siteUrl}/press-kit/bookings/${bookingId}`;
    const pressKitUrl = djProfile?.slug
      ? `${siteUrl}/dj/${djProfile.slug}`
      : siteUrl;

    let eventDateLabel = "";
    if (b.event_date && /^\d{4}-\d{2}-\d{2}$/.test(b.event_date)) {
      const [y, m, d] = b.event_date.split("-").map(Number);
      eventDateLabel = new Date(y, m - 1, d).toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (djEmail) {
      await sendEmail({
        to: djEmail,
        subject: `Evento agendado — ${b.name ?? "booker"}`,
        html: bookingConfirmedDjEmailHtml({
          djArtistName,
          bookerName: b.name ?? "booker",
          eventDate: eventDateLabel,
          venue: b.venue ?? undefined,
          amountClp: b.quoted_amount_clp ?? undefined,
          dashboardUrl,
        }),
        text: bookingConfirmedDjEmailText({
          djArtistName,
          bookerName: b.name ?? "booker",
          eventDate: eventDateLabel,
          venue: b.venue ?? undefined,
          amountClp: b.quoted_amount_clp ?? undefined,
          dashboardUrl,
        }),
      });
    }

    if (b.email) {
      await sendEmail({
        to: b.email,
        subject: `Tu evento con ${djArtistName} está confirmado`,
        html: bookingConfirmedBookerEmailHtml({
          bookerName: b.name ?? "hola",
          djArtistName,
          eventDate: eventDateLabel,
          venue: b.venue ?? undefined,
          pressKitUrl,
        }),
        text: bookingConfirmedBookerEmailText({
          bookerName: b.name ?? "hola",
          djArtistName,
          eventDate: eventDateLabel,
          venue: b.venue ?? undefined,
          pressKitUrl,
        }),
      });
    }
  } catch (e) {
    console.error("[booking-confirmed-emails]", e);
  }
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
    const { error: linkErr } = await supabase
      .from("booking_form_submissions")
      .update({ status: "respondido", created_contact_id: contact.id })
      .eq("id", bookingId)
      .eq("user_id", user.id);
    if (linkErr) {
      // Antes este UPDATE no se chequeaba: si fallaba, el contacto quedaba
      // creado pero el booking sin linkear → un reintento creaba OTRO contacto
      // (duplicado). Rollback del contacto recién creado para que el reintento
      // arranque limpio.
      await deleteContact(contact.id).catch(() => {});
      throw new Error("No se pudo vincular el contacto al booking. Reintenta.");
    }

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
    if (patch.status === "agendado") {
      await sendBookingConfirmedEmails(bookingId);
    }
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
        `No puedes aceptar contraoferta en estado '${b.status}'`
      );
    }

    // Resolver valores finales
    const finalAmount = b.counter_amount_clp ?? b.quoted_amount_clp;
    const finalDate = b.counter_event_date ?? b.event_date;

    if (!finalDate) {
      throw new Error(
        "Falta la fecha del evento para agendar. Pídele al booker que la incluya."
      );
    }

    // Promover a agendado (crea calendar_event auto via updateBookingWorkflow)
    const result = await updateBookingWorkflow(bookingId, {
      status: "agendado",
      quoted_amount_clp: finalAmount,
      event_date: finalDate,
    });

    await sendBookingConfirmedEmails(bookingId);

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
          body: `El DJ te recotizó por $${newAmount.toLocaleString("es-CL")} CLP. Toca para revisar.`,
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
