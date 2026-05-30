/**
 * POST /api/overpass
 *
 * Proxy server-side a Overpass API. Evita problemas CORS del browser
 * y permite failover entre mirrors sin tocar el cliente.
 *
 * Body: { ql: string }
 * Response: misma JSON de Overpass + header X-Overpass-Mirror
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

interface Body {
  ql?: string;
}

export async function POST(request: Request) {
  // Requiere sesión (no es endpoint público)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  if (!body.ql) {
    return NextResponse.json({ error: "Falta ql" }, { status: 400 });
  }

  const formBody = new URLSearchParams({ data: body.ql });
  const errors: string[] = [];

  for (const url of MIRRORS) {
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "JAY-Manager-OS/0.8 (https://dropgigs.com)",
        },
        body: formBody,
        // Timeout corto para no quedar pegado
        signal: AbortSignal.timeout(45_000),
      });

      if (upstream.ok) {
        const json = await upstream.json();
        return NextResponse.json(json, {
          headers: { "X-Overpass-Mirror": new URL(url).hostname },
        });
      }
      errors.push(`${new URL(url).hostname}: ${upstream.status}`);
    } catch (e) {
      errors.push(
        `${new URL(url).hostname}: ${e instanceof Error ? e.message : "error"}`
      );
    }
  }

  return NextResponse.json(
    { error: `Todos los mirrors fallaron: ${errors.join(" · ")}` },
    { status: 502 }
  );
}
