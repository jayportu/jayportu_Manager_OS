import { getMyGmailConnection } from "@/lib/queries/gmail";
import { listContacts } from "@/lib/queries/contacts";
import { listTemplates } from "@/lib/queries/templates";
import { listSentEmails } from "@/lib/queries/interactions";
import { Card } from "@/components/ui/card";
import { Mail, AlertCircle, Info, Send } from "lucide-react";
import { ConnectGmailButton } from "./connect-button";
import { DisconnectForm } from "./disconnect-form";
import { ComposeForm } from "./compose-form";

interface PageProps {
  searchParams: Promise<{
    error?: string;
    connected?: string;
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
            Correo
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Conecta tu cuenta de Google para enviar correos a tus contactos del
            CRM y sincronizar tu calendario. DROP. nunca lee tu bandeja: solo
            envía.
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
          <h3 className="font-semibold text-lg mb-1">Correo no conectado</h3>
          <p className="text-sm text-fg-muted mb-6 max-w-md mx-auto">
            Conecta la cuenta de Google que uses para booking y escribe tus
            correos sin salir de DROP.
          </p>
          <ConnectGmailButton />
          <div className="mt-6 max-w-md mx-auto text-left bg-bg-panel border border-border rounded-md p-4">
            <div className="flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
              <div className="text-xs text-fg-muted space-y-1.5">
                <p className="font-semibold text-fg">
                  Si Google muestra un aviso de “app no verificada”
                </p>
                <p>
                  Es normal mientras completamos la verificación. Para
                  continuar:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    Haz clic en{" "}
                    <span className="font-semibold text-fg">
                      “Configuración avanzada”
                    </span>
                  </li>
                  <li>
                    Luego en{" "}
                    <span className="font-semibold text-fg">
                      “Ir a dropgigs.com (no seguro)”
                    </span>
                  </li>
                  <li>Acepta los permisos y listo.</li>
                </ol>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Conectado: cargar contactos (con email), plantillas y enviados recientes
  const [contactsRaw, templatesRaw, sent] = await Promise.all([
    listContacts({ orderBy: "name", limit: 500 }),
    listTemplates(),
    listSentEmails(8),
  ]);

  const contacts = contactsRaw
    .filter((c) => c.email && c.email.trim().length > 0)
    .map((c) => ({ id: c.id, name: c.name, email: c.email }));
  const templates = templatesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    body: t.body,
  }));

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Correo
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Enviando como{" "}
            <span className="text-fg">{connection.google_email}</span>
          </p>
        </div>
        <DisconnectForm />
      </div>

      {sp.connected === "1" && (
        <Card className="p-3 mb-4 bg-success/10 border-success/30">
          <div className="text-sm text-success">
            ✓ Google conectado exitosamente.
          </div>
        </Card>
      )}

      <ComposeForm
        contacts={contacts}
        templates={templates}
        googleEmail={connection.google_email}
      />

      <div className="mt-6">
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-fg-muted mb-3">
          Correos enviados
        </h3>
        {sent.length === 0 ? (
          <Card className="p-6 text-center">
            <Send className="w-8 h-8 mx-auto text-fg-subtle mb-2" />
            <p className="text-sm text-fg-muted">
              Aún no envías correos desde DROP.
            </p>
          </Card>
        ) : (
          <Card className="divide-y divide-border p-0 overflow-hidden">
            {sent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-fg truncate">
                    {s.note || "(sin asunto)"}
                  </div>
                  {s.contact_name && (
                    <div className="text-xs text-fg-muted truncate">
                      Para {s.contact_name}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-fg-subtle shrink-0">
                  {new Date(s.happened_at).toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
