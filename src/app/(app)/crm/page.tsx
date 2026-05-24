import { listContacts } from "@/lib/queries/contacts";
import {
  CONTACT_TYPES,
  CONTACT_STATUS,
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
  type ContactStatus,
  type ContactType,
} from "@/types/database";
import { SelectNative } from "@/components/ui/select-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Upload, Users } from "lucide-react";
import { relativeTime, initials, scoreColor } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    type?: ContactType;
    status?: ContactStatus;
    score?: string;
  }>;
}

export default async function CrmPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const contacts = await listContacts({
    search: sp.q,
    type: sp.type,
    status: sp.status,
    minScore: sp.score ? parseInt(sp.score, 10) : undefined,
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">CRM</h1>
          <p className="text-sm text-fg-muted mt-1">
            {contacts.length} {contacts.length === 1 ? "contacto" : "contactos"}
            {sp.q || sp.type || sp.status || sp.score ? " (filtrado)" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/crm/importar">
              <Upload className="w-4 h-4" />
              Importar CSV
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/crm/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo contacto
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-5">
        <form className="grid grid-cols-1 md:grid-cols-5 gap-3" action="/crm">
          <Input
            type="search"
            name="q"
            placeholder="Buscar nombre, ciudad, contacto…"
            defaultValue={sp.q || ""}
            className="md:col-span-2"
          />
          <SelectNative name="type" defaultValue={sp.type || ""}>
            <option value="">Tipo: todos</option>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONTACT_TYPE_LABELS[t]}
              </option>
            ))}
          </SelectNative>
          <SelectNative name="status" defaultValue={sp.status || ""}>
            <option value="">Estado: todos</option>
            {CONTACT_STATUS.map((s) => (
              <option key={s} value={s}>
                {CONTACT_STATUS_LABELS[s]}
              </option>
            ))}
          </SelectNative>
          <SelectNative name="score" defaultValue={sp.score || ""}>
            <option value="">Score: todos</option>
            <option value="80">80+ Alta prioridad</option>
            <option value="60">60+ Buena oportunidad</option>
            <option value="40">40+ Tibia</option>
          </SelectNative>
          <div className="md:col-span-5 flex gap-2 justify-end">
            <Button type="submit" variant="outline" size="sm">
              Aplicar filtros
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/crm">Limpiar</Link>
            </Button>
          </div>
        </form>
      </Card>

      {/* Lista */}
      {contacts.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold text-base mb-1">Sin contactos aún</h3>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
            Empieza creando tu primer contacto manualmente o importando un CSV
            de tu agenda existente.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/crm/importar">
                <Upload className="w-4 h-4" />
                Importar CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/crm/nuevo">
                <Plus className="w-4 h-4" />
                Nuevo contacto
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-fg-muted">
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Ciudad</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Estado</th>
                  <th className="text-left px-4 py-3 font-semibold">Score</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Último contacto</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const sc = scoreColor(c.score);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-bg-subtle transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/crm/${c.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <div className="w-9 h-9 rounded-full bg-ink text-cream border-2 border-ink flex items-center justify-center text-xs font-bold shrink-0">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-fg group-hover:text-accent transition-colors truncate">
                              {c.name}
                            </div>
                            <div className="text-xs text-fg-muted truncate md:hidden">
                              {CONTACT_TYPE_LABELS[c.type]} · {c.city || "—"}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-fg-muted hidden md:table-cell">
                        {CONTACT_TYPE_LABELS[c.type]}
                      </td>
                      <td className="px-4 py-3 text-fg-muted hidden lg:table-cell">
                        {c.city || "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-1 border-2 border-ink bg-cream text-ink">
                          {CONTACT_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block min-w-[40px] text-center font-mono text-[11px] font-bold px-2 py-1 ${sc.bg} ${sc.text}`}
                        >
                          {c.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-muted text-xs hidden lg:table-cell">
                        {relativeTime(c.last_contact_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
