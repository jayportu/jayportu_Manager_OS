import "server-only";
import { sendPushToUser } from "@/lib/push/server";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/email/templates/_shared";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

/** Email de un usuario por id (admin; el destinatario puede no ser el user actual). */
async function emailFor(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function notifyBookerNewApplication(
  bookerUserId: string,
  gigTitle: string,
  djName: string
): Promise<void> {
  try {
    await sendPushToUser(bookerUserId, {
      title: "Nueva postulación 🎧",
      body: `${djName} postuló a "${gigTitle}"`,
      url: "/booker/convocatorias",
      tag: "gig-application",
    });
  } catch {
    /* best-effort */
  }
  if (isResendConfigured()) {
    const to = await emailFor(bookerUserId);
    if (to) {
      await sendEmail({
        to,
        subject: `Nueva postulación a "${gigTitle}"`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0A0A0A">
          <p><b>${escapeHtml(djName)}</b> postuló a tu convocatoria <b>${escapeHtml(gigTitle)}</b>.</p>
          <p><a href="${SITE}/booker/convocatorias">Ver postulantes</a></p>
        </div>`,
      }).catch(() => {});
    }
  }
}

export async function notifyDjApplicationResult(
  djUserId: string,
  gigTitle: string,
  accepted: boolean
): Promise<void> {
  const verb = accepted ? "aceptada ✅" : "no seleccionada";
  try {
    await sendPushToUser(djUserId, {
      title: accepted ? "¡Te aceptaron! 🎉" : "Actualización de postulación",
      body: `Tu postulación a "${gigTitle}" fue ${verb}.`,
      url: "/convocatorias",
      tag: "gig-result",
    });
  } catch {
    /* best-effort */
  }
  if (isResendConfigured()) {
    const to = await emailFor(djUserId);
    if (to) {
      await sendEmail({
        to,
        subject: accepted
          ? `¡Te aceptaron en "${gigTitle}"!`
          : `Tu postulación a "${gigTitle}"`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0A0A0A">
          <p>Tu postulación a <b>${escapeHtml(gigTitle)}</b> fue <b>${verb}</b>.</p>
          <p><a href="${SITE}/convocatorias">Ver mis postulaciones</a></p>
        </div>`,
      }).catch(() => {});
    }
  }
}
