import { getMyGmailConnection } from "@/lib/queries/gmail";
import { listContacts } from "@/lib/queries/contacts";
import { listTemplates } from "@/lib/queries/templates";
import { listSentEmails } from "@/lib/queries/interactions";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  Badge,
  Alert,
  EmptyState,
} from "@/components/hos";
import { Mail, Send } from "lucide-react";
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
        <SectionHero
          kicker="Negocio · Correo"
          title="Correo"
          sub="Conecta tu cuenta de Google para enviar correos a tus contactos del CRM y sincronizar tu calendario. DROP. nunca lee tu bandeja: solo envía."
        />

        {sp.error && (
          <div className="mb-5">
            <Alert tone="danger" title="Error al conectar">
              {sp.error}
            </Alert>
          </div>
        )}

        <EmptyState
          icon={Mail}
          title="Correo no conectado"
          sub="Conecta la cuenta de Google que uses para booking y escribe tus correos sin salir de DROP."
          action={<ConnectGmailButton />}
        />

        <div className="mt-4">
          <Alert tone="info">
            <p className="font-semibold text-white">
              Si Google muestra un aviso de “app no verificada”
            </p>
            <p className="mt-1">
              Es normal mientras completamos la verificación. Para continuar:
            </p>
            <ol className="list-decimal pl-4 space-y-1 mt-1.5">
              <li>
                Haz clic en{" "}
                <span className="font-semibold text-white">
                  “Configuración avanzada”
                </span>
              </li>
              <li>
                Luego en{" "}
                <span className="font-semibold text-white">
                  “Ir a dropgigs.com (no seguro)”
                </span>
              </li>
              <li>Acepta los permisos y listo.</li>
            </ol>
          </Alert>
        </div>
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
      <SectionHero
        kicker="Negocio · Correo"
        title="Correo"
        sub="Escribe y envía correos a tus contactos del CRM sin salir de DROP. Nunca leemos tu bandeja: solo enviamos."
      />

      {/* Banner cuenta conectada */}
      <GlassPanel className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-[rgb(var(--drop-orange))]"
            style={{ background: "rgba(255,255,255,.03)" }}
          >
            <Mail width={16} height={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MonoLabel>Cuenta conectada</MonoLabel>
              <Badge tone="up">Conectado</Badge>
            </div>
            <div className="mt-0.5 truncate text-sm text-white/80">
              Conectado como{" "}
              <span className="font-semibold text-white">
                {connection.google_email}
              </span>
            </div>
          </div>
          <DisconnectForm />
        </div>
      </GlassPanel>

      {sp.connected === "1" && (
        <div className="mb-4">
          <Alert tone="success">Google conectado exitosamente.</Alert>
        </div>
      )}

      <ComposeForm
        contacts={contacts}
        templates={templates}
        googleEmail={connection.google_email}
      />

      <div className="mt-6">
        <GlassPanel>
          <MonoLabel className="mb-3 block">Correos enviados</MonoLabel>
          {sent.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Aún no envías correos"
              sub="Los correos que envíes desde DROP aparecerán aquí."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {sent.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-white/8 px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,.03)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">
                        {s.note || "(sin asunto)"}
                      </div>
                      {s.contact_name && (
                        <div className="truncate text-xs text-white/50">
                          Para {s.contact_name}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[11px] text-white/40">
                      {new Date(s.happened_at).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
