import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionHero } from "@/components/hos";
import { TemplateForm } from "../template-form";

export default function NuevaPlantillaPage() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/plantillas"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Plantillas
      </Link>
      <SectionHero kicker="Negocio · Plantillas" title="Nueva plantilla" />
      <TemplateForm />
    </div>
  );
}
