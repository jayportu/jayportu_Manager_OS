import "server-only";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  welcomeDjEmailHtml,
  welcomeDjEmailText,
  presskitLiveEmailHtml,
  presskitLiveEmailText,
} from "@/lib/email/templates";
import { isPresskitLiveReady } from "@/lib/match/completeness";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

/**
 * Correos de activación (E1 / E3). Best-effort + one-shot:
 *  - Si Resend no está configurado o algo falla, NO rompe la acción que los
 *    llama (onboarding / guardar perfil) — solo loguea.
 *  - La bandera *_sent_at evita reenviar. Se setea SOLO si el envío fue ok, así
 *    un fallo transitorio de Resend reintenta en la próxima oportunidad.
 *  - Las banderas se setean con el client del usuario (dueño de su fila); no
 *    están en EDITABLE_PROFILE_FIELDS ni las protege el trigger, así que el
 *    update pasa. Spoofearlas solo se autoperjudica (no recibir su correo).
 */

/** E1 · Bienvenida. Llamar tras completar el onboarding. */
export async function maybeSendWelcomeEmail(): Promise<void> {
  try {
    if (!isResendConfigured()) return;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data } = await supabase
      .from("dj_profile")
      .select("artist_name, welcome_email_sent_at")
      .eq("user_id", user.id)
      .maybeSingle();
    const p = data as { artist_name: string | null; welcome_email_sent_at: string | null } | null;
    if (!p || p.welcome_email_sent_at) return;

    const name = p.artist_name || "DJ";
    const profileUrl = `${SITE}/perfil`;
    const res = await sendEmail({
      to: user.email,
      subject: "Estás dentro de DROP. — armemos tu press kit",
      html: welcomeDjEmailHtml({ artistName: name, profileUrl }),
      text: welcomeDjEmailText({ artistName: name, profileUrl }),
    });
    if (res.ok) {
      await supabase
        .from("dj_profile")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  } catch (e) {
    console.error("maybeSendWelcomeEmail:", e);
  }
}

/** E3 · Press kit vivo. Llamar tras guardar el perfil; dispara al quedar live-ready. */
export async function maybeSendPresskitLiveEmail(): Promise<void> {
  try {
    if (!isResendConfigured()) return;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data } = await supabase
      .from("dj_profile")
      .select(
        "artist_name, public_slug, presskit_live_email_sent_at, avatar_url, hero_image_url, bio_short, genres, city, public_email, whatsapp"
      )
      .eq("user_id", user.id)
      .maybeSingle();
    const p = data as
      | {
          artist_name: string | null;
          public_slug: string | null;
          presskit_live_email_sent_at: string | null;
          avatar_url: string | null;
          hero_image_url: string | null;
          bio_short: string | null;
          genres: string[] | null;
          city: string | null;
          public_email: string | null;
          whatsapp: string | null;
        }
      | null;
    if (!p || p.presskit_live_email_sent_at) return;
    if (!p.public_slug) return;
    if (!isPresskitLiveReady(p)) return;

    const name = p.artist_name || "DJ";
    const presskitUrl = `${SITE}/p/${p.public_slug}`;
    const res = await sendEmail({
      to: user.email,
      subject: "Tu press kit en DROP. está vivo",
      html: presskitLiveEmailHtml({ artistName: name, presskitUrl }),
      text: presskitLiveEmailText({ artistName: name, presskitUrl }),
    });
    if (res.ok) {
      await supabase
        .from("dj_profile")
        .update({ presskit_live_email_sent_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }
  } catch (e) {
    console.error("maybeSendPresskitLiveEmail:", e);
  }
}
