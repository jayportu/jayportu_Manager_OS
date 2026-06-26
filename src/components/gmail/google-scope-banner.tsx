import { getMyGmailConnection } from "@/lib/queries/gmail";
import {
  getMissingScopes,
  describeMissingScopes,
} from "@/lib/gmail/oauth";
import { AlertTriangle } from "lucide-react";

/**
 * Banner proactivo de reconexión. Se muestra cuando el usuario tiene
 * una conexión Google activa pero le faltan scopes que la versión
 * actual de la app necesita (ej: agregamos Drive/Contacts/etc en un
 * deploy futuro). Sin esto, el user solo se entera del problema
 * cuando intenta usar la feature y la API tira 403.
 *
 * Si no hay conexión → no se muestra (el flow de conectar por primera
 * vez ya pedirá todos los scopes actuales).
 * Si todos los scopes están → no se muestra.
 */
export async function GoogleScopeBanner() {
  const conn = await getMyGmailConnection();
  if (!conn) return null;

  const missing = getMissingScopes(conn.scope);
  if (missing.length === 0) return null;

  const labels = describeMissingScopes(missing);
  const labelsText =
    labels.length === 1
      ? labels[0]
      : labels.slice(0, -1).join(", ") + " y " + labels[labels.length - 1];

  return (
    <div className="bg-warning text-fg border-b-2 border-border px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider">
            Tu conexión de Google está desactualizada
          </p>
          <p className="text-xs mt-0.5">
            Faltan permisos para: <span className="font-semibold">{labelsText}</span>.
            Reconecta para activar todas las funciones.
          </p>
        </div>
        <a
          href="/api/gmail/auth"
          className="inline-flex items-center justify-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 border-border bg-ink text-warning hover:bg-orange hover:text-ink hover:border-border transition-colors shrink-0"
        >
          Reconectar Google
        </a>
      </div>
    </div>
  );
}
