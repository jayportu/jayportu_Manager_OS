import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/dj/contact?dj=<user_id>
 *
 * Devuelve el contacto (email + WhatsApp) de un DJ SOLO si el visitante tiene
 * cuenta de booker (o es el dueño del perfil). Para todos los demás —anónimos
 * y DJs viendo a otros DJs— responde { unlocked: false } sin filtrar dato.
 *
 * Por qué un endpoint y no renderizarlo en /p/[slug]: esa página es pública y
 * cacheada (revalidate=60). Si el email/wsp fueran al HTML, cualquiera los
 * sacaría con "ver código fuente". Acá el contacto NUNCA sale al cliente salvo
 * que el server confirme que es un booker autenticado.
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

  // El dueño ve su propio contacto. Si no, debe tener cuenta de booker.
  let allowed = user.id === djUserId;
  if (!allowed) {
    const { data: booker } = await supabase
      .from("booker_accounts")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    allowed = !!booker;
  }
  if (!allowed) return NextResponse.json(LOCKED);

  // Contacto del DJ destino: se lee con service_role (no es data del visitante).
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("dj_profile")
    .select("public_email, whatsapp")
    .eq("user_id", djUserId)
    .maybeSingle();

  return NextResponse.json({
    unlocked: true,
    email: (prof?.public_email as string) || "",
    whatsapp: (prof?.whatsapp as string) || "",
  });
}
