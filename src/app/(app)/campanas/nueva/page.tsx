import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listContacts } from "@/lib/queries/contacts";
import { listTemplates } from "@/lib/queries/templates";
import { NewCampaignForm } from "./new-campaign-form";

export default async function NuevaCampanaPage() {
  const [contacts, templates] = await Promise.all([
    listContacts({ orderBy: "score" }),
    listTemplates(),
  ]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/campanas"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Nueva campaña
      </h1>
      <p className="text-sm text-fg-muted mb-7">
        Crea una iniciativa de outreach y agrega los contactos que quieres incluir.
      </p>
      <NewCampaignForm
        contacts={contacts.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          score: c.score,
        }))}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category,
        }))}
      />
    </div>
  );
}
