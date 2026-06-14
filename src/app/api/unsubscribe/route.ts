import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { unsubscribeFanByRsvp } from "@/lib/queries/events";
import { addSuppression } from "@/lib/queries/suppressions";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe-token";

/**
 * Endpoint para el header List-Unsubscribe (Gmail/Yahoo bulk sender
 * requirement desde Feb 2024) y el link "darse de baja" de los correos.
 *
 * Dos usos:
 *   - `?rsvp=<uuid>`  → fan de un show (RA-7): apaga notify_future de su RSVP.
 *   - `?u=<token>`    → baja de campaña: el token firmado (HMAC) lleva el email
 *     dentro. Lo verificamos y damos de baja ESE email → un atacante no puede
 *     suprimir a terceros pasando un email arbitrario. Lo agrega a
 *     email_suppressions (los scripts de envío la consultan siempre).
 *
 * IMPORTANTE — el GET NO muta estado. Los clientes de correo y antivirus
 * hacen GET-prefetch de los links: si la baja se ejecutara en el GET, un
 * escáner desuscribiría sin que el usuario haga clic. Por eso:
 *   - GET  → página de confirmación con un botón que hace POST.
 *   - POST → baja real. Cubre el clic confirmado y el one-click POST (RFC 8058).
 */

type Kind = "fan" | "email";

function pageDone(kind: Kind): string {
  const body =
    kind === "fan"
      ? "Dejaste de recibir avisos de próximos shows. No te llegarán más correos automáticos de este tipo."
      : "Listo, te dimos de baja. No te enviaremos más correos de campaña de DROP.";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Baja · DROP.</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#F4EFE7;color:#0A0A0A;margin:0;padding:48px 16px;text-align:center}h1{font-size:32px;margin:0 0 16px;letter-spacing:-0.02em}.dot{color:#FF5C00}p{max-width:480px;margin:8px auto;line-height:1.5}.mono{font-family:'Space Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;color:#7A7670;text-transform:uppercase;margin-top:32px}</style>
</head><body>
<h1>Listo<span class="dot">.</span></h1>
<p>${body}</p>
<p>Si tienes alguna duda, escríbenos a <strong>hola@dropgigs.com</strong>.</p>
<div class="mono">— DROP. · THE DJ OS</div>
</body></html>`;
}

function pageConfirm(kind: Kind): string {
  // El form hace POST a la MISMA URL (sin `action`) → conserva los query params.
  const intro =
    kind === "fan"
      ? "Dejarás de recibir correos cuando este DJ anuncie un próximo show. Puedes volver a activarlos haciendo RSVP a un evento."
      : "Dejarás de recibir correos de campaña de DROP. Puedes volver cuando quieras escribiéndonos a hola@dropgigs.com.";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Darse de baja · DROP.</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#F4EFE7;color:#0A0A0A;margin:0;padding:48px 16px;text-align:center}h1{font-size:32px;margin:0 0 16px;letter-spacing:-0.02em}.dot{color:#FF5C00}p{max-width:480px;margin:8px auto 24px;line-height:1.5}button{font-family:inherit;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#0A0A0A;color:#F4EFE7;border:2px solid #0A0A0A;padding:14px 28px;cursor:pointer}button:hover{background:#FF5C00;border-color:#FF5C00}.mono{font-family:'Space Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;color:#7A7670;text-transform:uppercase;margin-top:32px}</style>
</head><body>
<h1>¿Darte de baja<span class="dot">?</span></h1>
<p>${intro}</p>
<form method="POST"><button type="submit">Sí, darme de baja</button></form>
<div class="mono">— DROP. · THE DJ OS</div>
</body></html>`;
}

function htmlResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, { key: "unsubscribe-post", max: 10, windowMs: 60_000 });
  if (!limit.ok) return new NextResponse(null, { status: 429 });

  const rsvp = request.nextUrl.searchParams.get("rsvp");
  const token = request.nextUrl.searchParams.get("u");
  if (rsvp) {
    await unsubscribeFanByRsvp(rsvp);
    return htmlResponse(pageDone("fan"));
  }
  if (token) {
    // El email sale del token firmado, no de un parámetro arbitrario.
    const email = verifyUnsubscribeToken(token);
    if (email) {
      await addSuppression(email, "unsubscribe", "list-unsubscribe");
    } else {
      // Token inválido/forjado: no suprimimos, pero mostramos la misma página
      // (no damos un oráculo de validez).
      console.warn("[unsubscribe] token inválido");
    }
    return htmlResponse(pageDone("email"));
  }
  // One-click sin parámetro útil (algunos clientes): no podemos identificar.
  console.log("[unsubscribe] POST one-click sin rsvp/token");
  return htmlResponse(pageDone("email"));
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, { key: "unsubscribe-get", max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return new NextResponse("Demasiados intentos. Espera unos minutos.", { status: 429 });
  }
  const kind: Kind = request.nextUrl.searchParams.get("rsvp") ? "fan" : "email";
  // NO muta: solo confirma (evita que prefetchers de correo den de baja sin intención).
  return htmlResponse(pageConfirm(kind));
}
