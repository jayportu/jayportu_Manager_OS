import { listContacts } from "@/lib/queries/contacts";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listInteractionsByContact } from "@/lib/queries/interactions";
import { StrategyMode } from "./strategy-mode";
import type { Contact, Interaction } from "@/types/database";

export default async function IAPage() {
  const [contacts, profile] = await Promise.all([
    listContacts({ orderBy: "score" }),
    getMyProfile(),
  ]);

  // Pre-fetch interactions del top 1 para hidratar el primer render
  const firstContact = contacts[0];
  let firstInteractions: Interaction[] = [];
  if (firstContact) {
    firstInteractions = await listInteractionsByContact(firstContact.id);
  }

  // Serializamos contactos al cliente (sin sensible)
  const serializable = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    score: c.score,
  })) satisfies Array<Pick<Contact, "id" | "name" | "type" | "status" | "score">>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          IA · Strategy Mode
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Genera un prompt completo con el contexto de un contacto, ábrelo en
          ChatGPT, copia la respuesta de vuelta y guárdala como nota o mensaje.
        </p>
      </div>

      <StrategyMode
        contacts={serializable}
        firstContact={firstContact || null}
        firstInteractions={firstInteractions}
        djProfile={profile}
      />
    </div>
  );
}
