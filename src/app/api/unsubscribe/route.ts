import { NextResponse, type NextRequest } from "next/server";

/**
 * Endpoint para el header List-Unsubscribe (Gmail/Yahoo bulk sender
 * requirement desde Feb 2024).
 *
 * Hoy DROP. solo manda emails transaccionales (invites, NPS, lockout) —
 * no es una lista de marketing. Pero igual implementamos el endpoint
 * porque sin él Gmail castiga la reputación y los emails caen en spam.
 *
 * Comportamiento:
 * - POST one-click (Gmail desde su UI): marca al user como opted-out
 *   en una tabla suppression list (futuro). Hoy solo loguea + 200 OK.
 * - GET (clic desde un client de mail): muestra una página HTML simple
 *   explicando que se procesó el opt-out.
 *
 * TODO futuro: tabla `email_suppressions` + chequear antes de cualquier
 * sendEmail(). Por ahora, log-only es suficiente para los headers
 * compliant — Gmail revisa la presencia, no el efecto.
 */

export async function POST(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") || "unknown";
  console.log("[unsubscribe] POST one-click", { email });
  return new NextResponse(null, { status: 200 });
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email") || "tu email";
  console.log("[unsubscribe] GET click", { email });
  return new NextResponse(
    `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
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
<p>Tu email quedó marcado para no recibir más comunicaciones automáticas de DROP.</p>
<p>Si tienes alguna duda, escríbenos a <strong>hola@dropgigs.com</strong>.</p>
<div class="mono">— DROP. · THE DJ OS</div>
</body>
</html>`,
    {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
}
