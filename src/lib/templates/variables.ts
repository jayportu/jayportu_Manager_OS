/**
 * Sistema de variables para plantillas.
 * Reemplaza {variable} en el body por el valor correspondiente.
 *
 * Las variables NO encontradas se dejan como están (visible al usuario)
 * para que sepa que falta info.
 */

import type { Contact, DjProfile } from "@/types/database";
import { CONTACT_TYPE_LABELS } from "@/types/database";

export interface TemplateVars {
  // Del contacto
  contact_name?: string;
  contact_person?: string;
  contact_city?: string;
  contact_country?: string;
  contact_type?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  contact_instagram?: string;
  contact_role?: string;
  contact_music_style?: string;
  // Del DJ (Jaime)
  my_name?: string;
  my_tagline?: string;
  my_genres?: string;
  my_city?: string;
  my_whatsapp?: string;
  my_email?: string;
  my_instagram?: string;
  presskit_url?: string;
  // Genéricos
  date?: string;       // hoy (corto)
  date_long?: string;  // hoy (largo)
}

/** Variables disponibles con descripción para mostrar en el UI */
export const AVAILABLE_VARIABLES: Array<{
  key: keyof TemplateVars;
  label: string;
  example: string;
}> = [
  { key: "contact_name", label: "Nombre del contacto", example: "Club La Feria" },
  { key: "contact_person", label: "Persona de contacto", example: "Camila" },
  { key: "contact_city", label: "Ciudad", example: "Santiago" },
  { key: "contact_type", label: "Tipo (Club, Bar...)", example: "Club" },
  { key: "contact_email", label: "Email del contacto", example: "booking@..." },
  { key: "contact_whatsapp", label: "WhatsApp del contacto", example: "56987..." },
  { key: "contact_instagram", label: "Instagram del contacto", example: "@..." },
  { key: "contact_role", label: "Cargo del contacto", example: "Booker" },
  { key: "contact_music_style", label: "Estilo musical", example: "Tech House" },
  { key: "my_name", label: "Mi nombre artístico", example: "JAY PORTU" },
  { key: "my_tagline", label: "Mi tagline", example: "DJ chileno..." },
  { key: "my_genres", label: "Mis géneros", example: "House, Tech House" },
  { key: "my_city", label: "Mi ciudad", example: "Santiago" },
  { key: "my_whatsapp", label: "Mi WhatsApp", example: "56988188531" },
  { key: "my_email", label: "Mi email público", example: "hola@jayportu.com" },
  { key: "my_instagram", label: "Mi Instagram", example: "@jay_portu" },
  { key: "presskit_url", label: "URL de mi press kit", example: "https://..." },
  { key: "date", label: "Hoy (corto)", example: "22 may" },
  { key: "date_long", label: "Hoy (largo)", example: "jueves 22 de mayo" },
];

/** Construye TemplateVars a partir de contact + djProfile + presskit base URL */
export function buildVars(
  contact: Contact | null,
  djProfile: DjProfile | null,
  baseUrl?: string
): TemplateVars {
  const today = new Date();
  return {
    // Contact
    contact_name: contact?.name || "",
    contact_person: contact?.contact_person || "",
    contact_city: contact?.city || "",
    contact_country: contact?.country || "",
    contact_type: contact ? CONTACT_TYPE_LABELS[contact.type] : "",
    contact_email: contact?.email || "",
    contact_whatsapp: contact?.whatsapp || "",
    contact_instagram: contact?.instagram || "",
    contact_role: contact?.contact_role || "",
    contact_music_style: contact?.music_style || "",
    // DJ
    my_name: djProfile?.artist_name || "",
    my_tagline: djProfile?.tagline || "",
    my_genres: djProfile?.genres?.join(", ") || "",
    my_city: djProfile?.city || "",
    my_whatsapp: djProfile?.whatsapp || "",
    my_email: djProfile?.public_email || "",
    my_instagram: djProfile?.instagram_url || "",
    presskit_url:
      djProfile?.public_slug && baseUrl
        ? `${baseUrl}/p/${djProfile.public_slug}`
        : "",
    // Fechas
    date: today.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
    }),
    date_long: today.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }),
  };
}

/**
 * Reemplaza {variable} en el body.
 * Variables no resueltas (valor undefined/'') quedan como {variable} para
 * que el usuario vea qué falta.
 */
export function resolveTemplate(
  body: string,
  vars: TemplateVars
): { text: string; missing: string[] } {
  const missing: string[] = [];
  const text = body.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key: string) => {
    const v = (vars as Record<string, string | undefined>)[key];
    if (v === undefined || v === "") {
      if (!missing.includes(key)) missing.push(key);
      return match; // dejar literal
    }
    return v;
  });
  return { text, missing };
}
