import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateForm } from "../template-form";

export default function NuevaPlantillaPage() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/plantillas"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Plantillas
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-7">
        Nueva plantilla
      </h1>
      <TemplateForm />
    </div>
  );
}
