import "server-only";

/**
 * F1 · Correos de activación del booker. Best-effort + one-shot (patrón de
 * activation-emails.ts del DJ):
 *  - Si Resend no está configurado o algo falla, NO rompe la request que lo
 *    llama (el layout) — solo loguea.
 *  - La bandera welcome_email_sent_at (0074) evita reenviar; se setea SOLO si el
 *    envío fue ok, así un fallo transitorio reintenta en la próxima oportunidad.
 */

import { createClient } from "@/lib/supabase/server";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  bookerBienvenidaEmailHtml,
  bookerBienvenidaEmailText,
} from "@/lib/email/templates/booker";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

/** Bienvenida del booker. Llamar en el primer paso por el portal (layout). */
export async function maybeSendBookerWelcomeEmail(): Promise<void> {
  try {
    if (!isResendConfigured()) return;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data } = await supabase
      .from("booker_accounts")
      .select("full_name, welcome_email_sent_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const b = data as
      | { full_name: string | null; welcome_email_sent_at: string | null }
      | null;
    if (!b || b.welcome_email_sent_at) return;

    const bookerName = b.full_name || "";
    const searchUrl = `${SITE}/booker/buscar`;
    const res = await sendEmail({
      to: user.email,
      subject: "Bienvenido a DROP. — encuentra tu DJ",
      html: bookerBienvenidaEmailHtml({ bookerName, searchUrl }),
      text: bookerBienvenidaEmailText({ bookerName, searchUrl }),
    });
    if (res.ok) {
      await supabase
        .from("booker_accounts")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  } catch (e) {
    console.error("maybeSendBookerWelcomeEmail:", e);
  }
}
