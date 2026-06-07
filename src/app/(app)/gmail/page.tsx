import { getMyGmailConnection } from "@/lib/queries/gmail";
import {
  listThreads,
  getThread,
  extractMessageMeta,
} from "@/lib/gmail/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ThreadList } from "./thread-list";
import { ConnectGmailButton } from "./connect-button";
import { DisconnectForm } from "./disconnect-form";

interface PageProps {
  searchParams: Promise<{
    error?: string;
    connected?: string;
    q?: string;
  }>;
}

export default async function GmailPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const connection = await getMyGmailConnection();

  // No conectado
  if (!connection) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Gmail
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Conecta tu cuenta de Gmail para leer hilos, asociarlos a contactos
            del CRM y crear borradores con IA.
          </p>
        </div>

        {sp.error && (
          <Card className="p-4 mb-5 bg-danger/10 border-danger/30">
            <div className="flex gap-2 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Error al conectar</div>
                <div className="text-xs mt-1 opacity-80">{sp.error}</div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-8 text-center">
          <Mail className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
          <h3 className="font-semibold text-lg mb-1">Gmail no conectado</h3>
          <p className="text-sm text-fg-muted mb-6 max-w-md mx-auto">
            Conecta tu cuenta hola@dropgigs.com (o la que uses para booking)
            para integrar Gmail en tu CRM.
          </p>
          <ConnectGmailButton />
          <div className="text-[11px] text-fg-subtle mt-6 max-w-md mx-auto">
            Necesitas haber configurado el OAuth en Google Cloud Console (ver
            instrucciones en{" "}
            <Link
              href="/configuracion"
              className="text-accent hover:underline"
            >
              configuración
            </Link>
            ).
          </div>
        </Card>
      </div>
    );
  }

  // Conectado: cargar hilos
  let threads: Array<{
    id: string;
    snippet: string;
    subject: string;
    from: string;
    date: string;
  }> = [];
  let loadError: string | null = null;

  try {
    const summaries = await listThreads({
      q: sp.q,
      maxResults: 30,
    });
    // Para cada thread, traer metadata del primer mensaje
    threads = await Promise.all(
      summaries.map(async (t) => {
        try {
          const full = await getThread(t.id);
          const lastMsg = full.messages?.[full.messages.length - 1];
          const meta = lastMsg
            ? extractMessageMeta(lastMsg)
            : { subject: "", from: "", to: "", date: "" };
          return {
            id: t.id,
            snippet: t.snippet,
            subject: meta.subject,
            from: meta.from,
            date: meta.date,
          };
        } catch {
          return {
            id: t.id,
            snippet: t.snippet,
            subject: "",
            from: "",
            date: "",
          };
        }
      })
    );
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error desconocido";
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Gmail
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Conectado a{" "}
            <span className="text-fg">{connection.google_email}</span>
          </p>
        </div>
        <DisconnectForm />
      </div>

      {sp.connected === "1" && (
        <Card className="p-3 mb-4 bg-success/10 border-success/30">
          <div className="text-sm text-success">
            ✓ Gmail conectado exitosamente.
          </div>
        </Card>
      )}

      {/* Buscador */}
      <Card className="p-4 mb-5">
        <form action="/gmail" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={sp.q || ""}
            placeholder='Buscar (ej: "from:booking@club.com" o "press kit")'
            className="flex-1 h-10 px-3 rounded-md bg-bg-panel border border-border text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <Button type="submit" variant="outline" size="sm">
            Buscar
          </Button>
        </form>
        <p className="text-[10px] text-fg-subtle mt-2">
          Los hilos se leen en vivo desde Gmail al abrir.
        </p>
      </Card>

      {loadError && (
        <Card className="p-4 mb-5 bg-danger/10 border-danger/30">
          <div className="flex gap-2 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">No se pudieron cargar hilos</div>
              <div className="text-xs mt-1 opacity-80">{loadError}</div>
            </div>
          </div>
        </Card>
      )}

      {!loadError && threads.length === 0 && (
        <Card className="p-10 text-center">
          <Mail className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <p className="text-sm text-fg-muted">
            No se encontraron hilos
            {sp.q ? ` para "${sp.q}"` : "."}
          </p>
        </Card>
      )}

      {threads.length > 0 && <ThreadList threads={threads} />}
    </div>
  );
}
