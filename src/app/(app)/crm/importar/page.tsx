import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImportForm } from "./import-form";
import { Card } from "@/components/ui/card";

export default function ImportarPage() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/crm"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a CRM
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Importar CSV
      </h1>
      <p className="text-sm text-fg-muted mb-7">
        Pega un CSV con tus contactos. La primera fila debe ser el header con
        los nombres de columna.
      </p>

      <Card className="p-6 mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3">
          Formato esperado
        </h2>
        <p className="text-sm text-fg-muted mb-3">
          Columnas reconocidas (todas opcionales menos <code className="text-fg">name</code>):
        </p>
        <code className="block text-xs bg-bg p-3 rounded border border-border overflow-x-auto whitespace-pre">
{`name,type,city,country,instagram,whatsapp,email,website,contact_person,contact_role,music_style,main_channel,status,score,notes
Club La Feria,club,Santiago,Chile,@laferia,56987654321,booking@laferia.cl,laferia.cl,Camila Pérez,Booker,Tech House,whatsapp,contactado,88,
Cumbres Sky,rooftop,Santiago,Chile,@cumbressky,,,cumbressky.cl,,,House,whatsapp,nuevo,76,Rooftop sunset`}
        </code>
        <div className="text-xs text-fg-muted mt-3 space-y-1">
          <p>
            <span className="text-fg">type</span> debe ser uno de: club, bar,
            rooftop, productora, festival, booker, dj, productor_musical, marca,
            cliente_evento_privado, promotor, fan_seguidor, otro
          </p>
          <p>
            <span className="text-fg">status</span> debe ser uno de: nuevo,
            contactado, respondio, interesado, propuesta_enviada, negociando,
            confirmado, realizado, perdido, recontactar_despues, ignorar
          </p>
          <p>
            <span className="text-fg">score</span> (opcional): número entre 0 y
            100. Si omites la columna, DROP lo calcula automáticamente por
            calidad del contacto.
          </p>
          <p>
            Se omiten los contactos que ya tengas (mismo nombre + ciudad, o mismo
            email), y los <span className="text-fg">email</span>/
            <span className="text-fg">whatsapp</span> con formato inválido se
            dejan en blanco.
          </p>
        </div>
      </Card>

      <ImportForm />
    </div>
  );
}
