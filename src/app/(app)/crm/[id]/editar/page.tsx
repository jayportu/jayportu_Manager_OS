import { getContact } from "@/lib/queries/contacts";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactForm } from "../../contact-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarContactoPage({ params }: PageProps) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href={`/crm/${id}`}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a {contact.name}
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-7">
        Editar contacto
      </h1>
      <ContactForm initial={contact} />
    </div>
  );
}
