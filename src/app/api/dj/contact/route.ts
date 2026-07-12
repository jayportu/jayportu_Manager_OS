import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { logUsageEvent } from "@/lib/queries/beta";
import {
  bookerContactPer10Min,
  bookerContactDistinctPerDay,
} from "@/lib/limits";

/**
 * GET /api/dj/contact?dj=<user_id>
 *
 * Devuelve el contacto (email + WhatsApp) de un DJ SOLO si el visitante tiene
 * cuenta de booker ACTIVA (o es el dueño del perfil). Para todos los demás
 * —anónimos, DJs viendo a otros DJs, bookers suspendidos/baneados— responde
 * { unlocked: false } sin filtrar dato.
 *
 * Por qué un endpoint y no renderizarlo en /p/[slug]: esa página es pública y
 * cacheada (revalidate=60). Si el email/wsp fueran al HTML, cualquiera los
 * sacaría con "ver código fuente". Acá el contacto NUNCA sale al cliente salvo
 * que el server confirme que es un booker autenticado y activo.
 *
 * F0 · anti-harvesting (S4): antes bastaba con que existiera una fila de booker
 * (`allowed = !!booker`) → cualquier cuenta booker podía iterar `?dj=<uuid>` y
 * cosechar PII de todos los DJs sin límite ni rastro. Ahora:
 *   - se exige cuenta activa (bloquea suspendidos/baneados);
 *   - rate limit por ráfaga (10 min) y cap de DJs DISTINTOS por día;
 *   - se loguea cada acceso (`booker_contact_viewed`) para métrica + detección.
 * Decisión A2: NO se exige verificación (un booker no verificado puede ver
 * contactos, pero con estos límites). Es reversible a "solo verificados"
 * cambiando el gate si se observa abuso.
 */
export const dynamic = "force-dynamic";

const LOCKED = { unlocked: false as const };

export async function GET(request: NextRequest) {
  const djUserId = request.nextUrl.searchParams.get("dj");
  if (!djUserId) return NextResponse.json(LOCKED);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json(LOCKED);

  const isOwner = user.id === djUserId;
  const admin = createAdminClient();

  // El dueño ve su propio contacto sin límites. Un no-dueño debe ser booker
  // activo y pasar los controles antiabuso antes de revelar PII ajena.
  if (!isOwner) {
    const { data: booker } = await supabase
      .from("booker_accounts")
      .select("account_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!booker || booker.account_status !== "active") {
      return NextResponse.json(LOCKED);
    }

    // (1) Anti-ráfaga: cap por instancia warm (in-memory, defense-in-depth).
    const burst = rateLimit(request, {
      key: `dj-contact:${user.id}`,
      max: bookerContactPer10Min(),
      windowMs: 10 * 60 * 1000,
    });
    if (!burst.ok) return NextResponse.json(LOCKED, { status: 429 });

    // (2) Cap de DJs DISTINTOS por día (rolling 24h). Conteo confiable en DB vía
    // service_role: usage_events no tiene RLS select-own para el user.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentErr } = await admin
      .from("usage_events")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("event", "booker_contact_viewed")
      .gte("created_at", since);
    if (!recentErr) {
      const seen = new Set<string>();
      for (const row of (recent ?? []) as Array<{
        metadata: Record<string, unknown> | null;
      }>) {
        const id = row.metadata?.["dj_user_id"];
        if (typeof id === "string") seen.add(id);
      }
      // Un DJ ya visto hoy NO cuenta como nuevo; solo se bloquean DJs nuevos
      // una vez alcanzado el cupo distinto/día.
      if (!seen.has(djUserId) && seen.size >= bookerContactDistinctPerDay()) {
        return NextResponse.json(LOCKED, { status: 429 });
      }
    }
    // Si recentErr: fail-open (no romper UX legítima por un hipo del tracking);
    // el gate activo + el cap por ráfaga siguen aplicando.
  }

  // Contacto del DJ destino: se lee con service_role (no es data del visitante).
  const { data: prof } = await admin
    .from("dj_profile")
    .select("public_email, whatsapp")
    .eq("user_id", djUserId)
    .maybeSingle();

  // Log del acceso (best-effort) — solo cuando un booker revela contacto ajeno.
  // El tracking nunca debe romper la respuesta, así que se aísla.
  if (!isOwner) {
    try {
      await logUsageEvent({
        event: "booker_contact_viewed",
        page: "/api/dj/contact",
        metadata: { dj_user_id: djUserId },
      });
    } catch {
      /* best-effort: ignorar fallos de tracking */
    }
  }

  return NextResponse.json({
    unlocked: true,
    email: (prof?.public_email as string) || "",
    whatsapp: (prof?.whatsapp as string) || "",
  });
}
