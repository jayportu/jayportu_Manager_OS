import "server-only";

/**
 * Constantes de marca + helpers de envoltura de emails DROP.
 * Extraído de templates.ts (refactor T-3, 2026-07): mismo código, sin cambios.
 */

export const INK = "#0A0A0A";
export const CREAM = "#F4EFE7";
export const ORANGE = "#FF5C00";
export const MUTED = "#7A7670";
export const BORDER = "#E5E1D8";

export const FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif";
export const FONT_MONO = "Consolas,'Courier New',monospace";

/**
 * Envuelve un fragmento de HTML con el shell branded de DROP.
 * (header con logo wordmark + body + footer estándar).
 *
 * @param title — <title> del HTML, también ayuda al subject preview en algunos clients.
 * @param preheader — texto preview que aparece al lado del subject en el inbox.
 * @param content — fragmento HTML del cuerpo (lo que va entre header y footer).
 * @param footerReason — explicación de por qué la persona recibe el email (CAN-SPAM).
 */


/**
 * Envuelve un fragmento de HTML con el shell branded de DROP.
 * (header con logo wordmark + body + footer estándar).
 *
 * @param title — <title> del HTML, también ayuda al subject preview en algunos clients.
 * @param preheader — texto preview que aparece al lado del subject en el inbox.
 * @param content — fragmento HTML del cuerpo (lo que va entre header y footer).
 * @param footerReason — explicación de por qué la persona recibe el email (CAN-SPAM).
 */
export function wrapEmail(opts: {
  title: string;
  preheader?: string;
  content: string;
  footerReason: string;
}): string {
  const { title, preheader = "", content, footerReason } = opts;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:${CREAM}; font-family:${FONT_SANS}; color:${INK};">

  <!-- Preheader oculto (preview en inbox) -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden; mso-hide:all; height:0; width:0; font-size:0; line-height:0;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM};">
    <tr>
      <td align="center" style="padding:24px 16px 40px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px; width:100%; background:#ffffff; border:1px solid ${BORDER}; border-radius:6px;">

          <!-- Header brandeado: ink + wordmark PNG (con fallback texto) + tagline -->
          <tr>
            <td align="center" style="background:${INK}; padding:36px 24px 32px 24px; border-radius:6px 6px 0 0;">
              <a href="https://dropgigs.com" style="text-decoration:none; display:inline-block;">
                <img src="https://dropgigs.com/brand/wordmark-light.png"
                     alt="DROP."
                     width="200"
                     height="84"
                     style="display:block; margin:0 auto; width:200px; height:auto; max-width:200px; border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic;" />
              </a>
              <div style="font-family:${FONT_MONO}; font-size:10px; color:${MUTED}; letter-spacing:0.3em; margin-top:14px; text-transform:uppercase;">
                — The DJ OS —
              </div>
            </td>
          </tr>

          <!-- Body (contenido específico del email) -->
          <tr>
            <td style="padding:32px 32px 16px 32px; font-family:${FONT_SANS}; color:${INK}; line-height:1.5;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px; border-top:1px solid ${BORDER};">
              <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; line-height:1.5; margin:12px 0 8px 0;">
                ${footerReason}
              </p>
              <p style="font-family:${FONT_SANS}; font-size:12px; color:${MUTED}; margin:8px 0 0 0;">
                DROP<span style="color:${ORANGE};">.</span> — Santiago, Chile · <a href="https://dropgigs.com" style="color:${MUTED}; text-decoration:underline;">dropgigs.com</a> · <a href="mailto:hola@dropgigs.com" style="color:${MUTED}; text-decoration:underline;">hola@dropgigs.com</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}


/**
 * Botón CTA branded (ink bg, orange text, monospace, uppercase).
 * Usa el mismo estilo que el de followUpdates (consistencia).
 */
export function ctaButton(label: string, url: string): string {
  return `<a href="${safeUrl(url)}" style="display:inline-block; padding:14px 22px; background:${INK}; color:${ORANGE}; text-decoration:none; font-family:${FONT_MONO}; font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; border:2px solid ${INK}; border-radius:2px;">${escapeHtml(label)} →</a>`;
}


/**
 * Saneamiento de URLs antes de meterlas en un href de un correo.
 * - Solo permite esquemas http(s) → bloquea javascript:, data:, etc.
 * - Escapa comillas/ángulos → no se puede romper fuera del atributo href.
 * Hoy todas las URLs se arman server-side desde slugs/tokens (no input de
 * usuario), pero esto blinda el día que alguna derive de algo editable.
 */
export function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "#";
    return escapeHtml(u.toString());
  } catch {
    return "#";
  }
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
