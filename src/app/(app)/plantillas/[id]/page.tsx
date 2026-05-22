import { getTemplate } from "@/lib/queries/templates";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateForm } from "../template-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: PageProps) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/plantillas"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Plantillas
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Editar plantilla
      </h1>
      <p className="text-xs text-fg-muted mb-7">
        Usada {template.times_used}{" "}
        {template.times_used === 1 ? "vez" : "veces"}
      </p>
      <TemplateForm initial={template} />
    </div>
  );
}
