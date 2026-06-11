import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { unsubscribeFanByRsvp } from "@/lib/queries/events";

/**
 * Endpoint para el header List-Unsubscribe (Gmail/Yahoo bulk sender
 * requirement desde Feb 2024) y el link "Cancelar avisos" del email a fans.
 *
 * IMPORTANTE — el GET NO muta estado. Los clientes de correo y antivirus
 * hacen GET-prefetch de los links de un email: si la baja se ejecutara en el
 * GET, un escáner desuscribiría al fan sin que él haga clic. Por eso:
 *   - GET  → muestra una página de confirmación con un botón que hace POST.
 *   - POST → ejecuta la baja real (apaga notify_future del RSVP). Cubre tanto
 *     el clic confirmado como el one-click POST de Gmail (RFC 8058).
 */

function pageDone(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Desuscripción · DROP.</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#F4EFE7;color:#0A0A0A;margin:0;padding:48px 16px;text-align:center}
h1{font-size:32px;margin:0 0 16px;letter-spacing:-0.02em}
.dot{color:#FF5C00}
p{max-width:480px;margin:8px auto;line-height:1.5}
.mono{font-family:'Space Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;color:#7A7670;text-transform:uppercase;margin-top:32px}
</style>
</head>
<body>
<h1>Listo<span class="dot">.</span></h1>
<p>Dejaste de recibir avisos de próximos shows. No te llegarán más correos automáticos de este tipo.</p>
<p>Si tienes alguna duda, escríbenos a <strong>hola@dropgigs.com</strong>.</p>
<div class="mono">— DROP. · THE DJ OS</div>
</body>
</html>`;
}

function pageConfirm(): string {
  // El form hace POST a la MISMA URL (sin `action`) → conserva el ?rsvp=… de
  // la query. La baja solo ocurre cuando el fan presiona el botón.
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Cancelar avisos · DROP.</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#F4EFE7;color:#0A0A0A;margin:0;padding:48px 16px;text-align:center}
h1{font-size:32px;margin:0 0 16px;letter-spacing:-0.02em}
.dot{color:#FF5C00}
p{max-width:480px;margin:8px auto 24px;line-height:1.5}
button{font-family:inherit;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;background:#0A0A0A;color:#F4EFE7;border:2px solid #0A0A0A;padding:14px 28px;cursor:pointer}
button:hover{background:#FF5C00;border-color:#FF5C00}
.mono{font-family:'Space Mono',Consolas,monospace;font-size:11px;letter-spacing:2px;color:#7A7670;text-transform:uppercase;margin-top:32px}
</style>
</head>
<body>
<h1>¿Cancelar avisos<span class="dot">?</span></h1>
<p>Dejarás de recibir correos cuando este DJ anuncie un próximo show. Puedes volver a activarlos haciendo RSVP a un evento.</p>
<form method="POST">
<button type="submit">Sí, cancelar avisos</button>
</form>
<div class="mono">— DROP. · THE DJ OS</div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  // Rate limit estricto — el abuso típico es scripted.
  const limit = rateLimit(request, {
    key: "unsubscribe-post",
    max: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) return new NextResponse(null, { status: 429 });

  // A4: baja real de un fan (avisos de shows). El link lleva el id de su RSVP.
  const rsvp = request.nextUrl.searchParams.get("rsvp");
  if (rsvp) {
    await unsubscribeFanByRsvp(rsvp);
  } else {
    const email = request.nextUrl.searchParams.get("email") || "unknown";
    // Hoy DROP. solo manda transaccionales → log-only (sin lista de marketing).
    console.log("[unsubscribe] POST one-click", { email });
  }
  // HTML 200: el fan que confirmó ve "Listo"; Gmail one-click ignora el body.
  return new NextResponse(pageDone(), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, {
    key: "unsubscribe-get",
    max: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return new NextResponse("Demasiados intentos. Espera unos minutos.", {
      status: 429,
    });
  }
  // NO muta: solo muestra la confirmación (evita que prefetchers de correo
  // desuscriban fans sin intención).
  return new NextResponse(pageConfirm(), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
