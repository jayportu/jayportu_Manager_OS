import { getTemplate } from "@/lib/queries/templates";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionHero } from "@/components/hos";
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
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Plantillas
      </Link>
      <SectionHero
        kicker="Negocio · Plantillas"
        title="Editar plantilla"
        sub={`Usada ${template.times_used} ${
          template.times_used === 1 ? "vez" : "veces"
        }`}
      />
      <TemplateForm initial={template} />
    </div>
  );
}
