import { getThreadFull, extractMessageMeta, extractBodyText } from "@/lib/gmail/client";
import { listContacts } from "@/lib/queries/contacts";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { AssociateContactSelect } from "./associate-contact";
import { dateTime } from "@/lib/format";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadDetailPage({ params }: PageProps) {
  const { threadId } = await params;

  let thread;
  let error: string | null = null;
  try {
    thread = await getThreadFull(threadId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  const contacts = await listContacts({ orderBy: "name" });

  if (error) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <Link
          href="/gmail"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Gmail
        </Link>
        <Card className="p-6 bg-danger/10 border-danger/30">
          <div className="flex gap-2 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">No se pudo cargar el hilo</div>
              <div className="text-xs mt-1 opacity-80">{error}</div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!thread || !thread.messages || thread.messages.length === 0) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <Link
          href="/gmail"
          className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
        <Card className="p-6 text-center text-sm text-fg-muted">
          Hilo vacío.
        </Card>
      </div>
    );
  }

  const firstMeta = extractMessageMeta(thread.messages[0]);

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/gmail"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Gmail
      </Link>

      <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
        {firstMeta.subject || "(sin asunto)"}
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        {thread.messages.length} mensaje
        {thread.messages.length === 1 ? "" : "s"}
      </p>

      {/* Asociar a contacto */}
      <Card className="p-4 mb-5">
        <AssociateContactSelect
          threadId={threadId}
          contacts={contacts.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          }))}
          subject={firstMeta.subject}
          snippet={thread.messages[0]?.snippet || ""}
          fromHeader={firstMeta.from}
          toHeader={firstMeta.to}
          messagesCount={thread.messages.length}
          lastMessageAt={
            thread.messages[thread.messages.length - 1]?.internalDate
              ? new Date(
                  parseInt(
                    thread.messages[thread.messages.length - 1]
                      .internalDate as string,
                    10
                  )
                ).toISOString()
              : null
          }
        />
      </Card>

      {/* Mensajes */}
      <div className="space-y-3">
        {thread.messages.map((msg) => {
          const meta = extractMessageMeta(msg);
          const body = extractBodyText(msg);
          return (
            <Card key={msg.id} className="p-5">
              <div className="text-xs text-fg-muted mb-2 space-y-0.5">
                <div>
                  <span className="font-semibold text-fg">De: </span>
                  {meta.from || "(desconocido)"}
                </div>
                <div>
                  <span className="font-semibold text-fg">Para: </span>
                  {meta.to || "(desconocido)"}
                </div>
                <div>
                  <span className="font-semibold text-fg">Fecha: </span>
                  {meta.date
                    ? dateTime(
                        new Date(
                          isNaN(Date.parse(meta.date))
                            ? parseInt(msg.internalDate || "0", 10)
                            : Date.parse(meta.date)
                        ).toISOString()
                      )
                    : "—"}
                </div>
              </div>
              <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans text-fg mt-3 max-h-96 overflow-y-auto">
                {body || msg.snippet}
              </pre>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
