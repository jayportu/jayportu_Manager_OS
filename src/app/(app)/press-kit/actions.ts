"use server";

import { updateProfileSlug, updateBookingStatus } from "@/lib/queries/presskit";
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

    // Actualizar booking
    await supabase
      .from("booking_form_submissions")
      .update({ status: "convertido", created_contact_id: contact.id })
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
