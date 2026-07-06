import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import type {
  Template,
  TemplateInsert,
  TemplateUpdate,
} from "@/types/database";

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listTemplates(): Promise<Template[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .order("times_used", { ascending: false })
    .order("name", { ascending: true });
  if (error) return [];
  return data as Template[];
}

export async function getTemplate(id: string): Promise<Template | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Template;
}

export async function createTemplate(
  input: TemplateInsert
): Promise<Template> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: user.id,
      name: input.name,
      category: input.category || "otro",
      channel_suggested: input.channel_suggested || "whatsapp",
      subject: input.subject || "",
      body: input.body,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Template;
}

export async function updateTemplate(
  id: string,
  patch: TemplateUpdate
): Promise<Template> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("templates")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bumpTemplateUsage(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  // Lectura previa para incrementar (no hay RPC simple en Supabase JS)
  const { data } = await supabase
    .from("templates")
    .select("times_used")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (!data) return;
  await supabase
    .from("templates")
    .update({
      times_used: (data.times_used || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("id", id);
}

// ─── Seed templates (carga inicial de ejemplos) ──────────────────────
export const SEED_TEMPLATES: TemplateInsert[] = [
  {
    name: "Primer contacto · Venue",
    category: "primer_contacto",
    channel_suggested: "whatsapp",
    body: `Hola {contact_person}, soy {my_name}, DJ chileno de {my_genres}.

Vi que {contact_name} programa noches de electrónica y me gustaría compartir mi press kit por si encaja con alguna fecha próxima: {presskit_url}

Quedo atento, saludos.`,
  },
  {
    name: "Follow-up suave",
    category: "follow_up",
    channel_suggested: "whatsapp",
    body: `Hola {contact_person}, te escribo para hacer un seguimiento del mensaje que te mandé hace unos días sobre {contact_name}.

¿Tuviste chance de revisar mi press kit? Quedo atento a cualquier comentario o duda.

Saludos!`,
  },
  {
    name: "Envío de press kit",
    category: "envio_press_kit",
    channel_suggested: "email",
    subject: "Press kit · {my_name}",
    body: `Hola {contact_person},

Te comparto mi press kit con bio, sets recientes y videos:
{presskit_url}

Estilo: {my_genres}
Base: {my_city}

Si te interesa, podemos coordinar una llamada o reunión para hablar de fechas.

Saludos,
{my_name}`,
  },
  {
    name: "Propuesta de fecha",
    category: "propuesta",
    channel_suggested: "whatsapp",
    body: `Hola {contact_person}, ¿cómo estás?

Quería proponerte una fecha en {contact_name}. Tengo disponibilidad y me encantaría tocar ahí.

¿Tienes alguna fecha abierta en las próximas semanas? Me adapto a tu agenda.

Saludos.`,
  },
  {
    name: "Agradecimiento post-show",
    category: "agradecimiento",
    channel_suggested: "whatsapp",
    body: `Hola {contact_person}, muchas gracias por la fecha del otro día en {contact_name}. La pasé genial y la energía del público fue increíble.

Quedo súper atento si surge otra oportunidad. Un abrazo!`,
  },
  {
    name: "Confirmación de show",
    category: "confirmacion",
    channel_suggested: "whatsapp",
    body: `Hola {contact_person}, confirmo show en {contact_name} para la fecha acordada.

Te paso el rider técnico actualizado y quedo atento si necesitas algo más de mi parte.

Saludos!`,
  },
];

export async function seedTemplatesIfEmpty(): Promise<{ inserted: number }> {
  const existing = await listTemplates();
  if (existing.length > 0) return { inserted: 0 };

  const { supabase, user } = await getUserOrThrow();
  const payload = SEED_TEMPLATES.map((t) => ({
    user_id: user.id,
    name: t.name,
    category: t.category,
    channel_suggested: t.channel_suggested,
    subject: t.subject || "",
    body: t.body,
  }));
  const { data, error } = await supabase
    .from("templates")
    .insert(payload)
    .select("id");
  if (error) throw new Error(error.message);
  return { inserted: data?.length ?? 0 };
}
