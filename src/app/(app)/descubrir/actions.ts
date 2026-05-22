"use server";

import {
  runOverpassQuery,
  normalizeOverpassElement,
  findPreset,
} from "@/lib/overpass";
import {
  bulkUpsertLeads,
  updateLeadStatus,
  setPromotedContactId,
  getLead,
  deleteLead,
} from "@/lib/queries/discovered-leads";
import { createContact } from "@/lib/queries/contacts";
import { revalidatePath } from "next/cache";
import type {
  ContactInsert,
  ContactType,
  DiscoveredLeadInsert,
  LeadStatus,
} from "@/types/database";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

/**
 * Corre una búsqueda Overpass por preset id, normaliza resultados,
 * y los inserta como discovered_leads (skip duplicados).
 */
export async function runOverpassPresetAction(
  presetId: string
): Promise<Result<{ inserted: number; skipped: number; total: number }>> {
  try {
    const preset = findPreset(presetId);
    if (!preset) return { ok: false, error: "Preset desconocido" };

    const response = await runOverpassQuery(preset.ql);
    const elements = response.elements || [];

    const leads: DiscoveredLeadInsert[] = elements
      .filter((el) => el.tags && (el.tags["name"] || el.tags["operator"]))
      .map((el) => {
        const normalized = normalizeOverpassElement(el, preset);
        return {
          name: normalized.name,
          type: preset.inferredType as ContactType,
          city: normalized.city,
          country: normalized.country,
          address: normalized.address,
          lat: normalized.lat,
          lng: normalized.lng,
          instagram: normalized.instagram,
          website: normalized.website,
          phone: normalized.phone,
          email: normalized.email,
          source: "overpass" as const,
          source_id: normalized.source_id,
          source_query: preset.id,
          raw_data: normalized.raw_data,
        };
      });

    const { inserted, skipped } = await bulkUpsertLeads(leads);
    revalidatePath("/descubrir");
    return {
      ok: true,
      data: { inserted, skipped, total: elements.length },
    };
  } catch (e) {
    return err(e);
  }
}

/**
 * Promueve un lead a contact del CRM.
 * Crea contact con datos del lead + actualiza status.
 */
export async function promoteLeadAction(
  leadId: string
): Promise<Result<{ contact_id: string }>> {
  try {
    const lead = await getLead(leadId);
    if (!lead) return { ok: false, error: "Lead no encontrado" };
    if (lead.promoted_contact_id) {
      return { ok: true, data: { contact_id: lead.promoted_contact_id } };
    }

    const contactInput: ContactInsert = {
      name: lead.name,
      type: lead.type,
      city: lead.city || "Santiago",
      country: lead.country || "Chile",
      instagram: lead.instagram,
      whatsapp: lead.whatsapp.replace(/\D/g, ""),
      email: lead.email,
      website: lead.website,
      contact_person: "",
      contact_role: "",
      music_style: lead.music_style_guess || "",
      main_channel: lead.whatsapp
        ? "whatsapp"
        : lead.email
        ? "email"
        : "instagram",
      status: "nuevo",
      notes: [
        lead.address ? `Dirección: ${lead.address}` : "",
        lead.phone ? `Teléfono: ${lead.phone}` : "",
        lead.ai_summary ? `\nResumen IA:\n${lead.ai_summary}` : "",
        lead.action_recommended
          ? `\nAcción recomendada: ${lead.action_recommended}`
          : "",
        lead.notes ? `\n\nNotas:\n${lead.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      source: `discover_${lead.source}`,
    };

    const contact = await createContact(contactInput);
    await setPromotedContactId(leadId, contact.id);

    revalidatePath("/descubrir");
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: { contact_id: contact.id } };
  } catch (e) {
    return err(e);
  }
}

export async function updateLeadStatusAction(
  id: string,
  status: LeadStatus
): Promise<Result> {
  try {
    await updateLeadStatus(id, status);
    revalidatePath("/descubrir");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function deleteLeadAction(id: string): Promise<Result> {
  try {
    await deleteLead(id);
    revalidatePath("/descubrir");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

/**
 * Parser simple de texto pegado por el usuario.
 * Extrae líneas con patrones tipo: nombre, @ig, email, web.
 *
 * Formato esperado (1 lead por bloque, separados por línea en blanco):
 *   Nombre del lugar
 *   @instagram
 *   email@dominio.com
 *   https://web.com
 *   notas opcionales
 *
 * En sprint futuro: pasar a IA local Ollama para parsing más inteligente.
 */
export async function importManualTextAction(
  text: string,
  defaultType: ContactType = "otro"
): Promise<Result<{ inserted: number; parsed: number }>> {
  try {
    const blocks = text
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const leads: DiscoveredLeadInsert[] = [];

    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length === 0) continue;

      // Primera línea = nombre
      const name = lines[0];
      let instagram = "";
      let email = "";
      let website = "";
      let phone = "";
      let whatsapp = "";
      const notes: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Instagram
        const igMatch =
          line.match(/^@([a-zA-Z0-9_.]+)/) ||
          line.match(/instagram\.com\/([a-zA-Z0-9_.]+)/i);
        if (igMatch && !instagram) {
          instagram = igMatch[1];
          continue;
        }
        // Email
        const emailMatch = line.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
        if (emailMatch && !email) {
          email = emailMatch[0];
          continue;
        }
        // Website (no Instagram)
        const urlMatch = line.match(/https?:\/\/\S+/i);
        if (urlMatch && !urlMatch[0].includes("instagram.com") && !website) {
          website = urlMatch[0];
          continue;
        }
        // Phone / WhatsApp
        const phoneMatch = line.match(/\+?\d[\d\s().-]{6,}/);
        if (phoneMatch && !whatsapp && !phone) {
          const clean = phoneMatch[0].replace(/\D/g, "");
          if (clean.length >= 8) {
            whatsapp = clean;
            phone = phoneMatch[0];
            continue;
          }
        }
        // Default: nota
        notes.push(line);
      }

      leads.push({
        name,
        type: defaultType,
        city: "Santiago",
        country: "Chile",
        instagram,
        email,
        website,
        whatsapp,
        phone,
        source: "manual_text",
        source_id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        notes: notes.join("\n"),
      });
    }

    const { inserted } = await bulkUpsertLeads(leads);
    revalidatePath("/descubrir");
    return {
      ok: true,
      data: { inserted, parsed: leads.length },
    };
  } catch (e) {
    return err(e);
  }
}

