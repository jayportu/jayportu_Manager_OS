import { Mail, Archive, Trash2, RotateCcw, Paperclip } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import { getInbox, getInboundEmail } from "@/lib/queries/inbox";
import { relativeTime, dateTime } from "@/lib/format";
import { AutoRefresh } from "../email-campaigns/auto-refresh";
import { archiveEmail, deleteEmail, restoreEmail } from "./actions";
import { ReplyForm } from "./reply-form";
import { Compose } from "./compose";
import { MarkRead } from "./mark-read";

export const dynamic = "force-dynamic";

const FOLDERS = [
  { key: "inbox", label: "Recibidos" },
  { key: "sent", label: "Enviados" },
  { key: "archived", label: "Archivados" },
  { key: "trash", label: "Papelera" },
];

export default async function CorreoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; folder?: string }>;
}) {
  await assertAdmin();
  const sp = await searchParams;
  const folder = ["inbox", "sent", "archived", "trash"].includes(sp.folder ?? "")
    ? (sp.folder as string)
    : "inbox";
  const isSent = folder === "sent";
  const isTrash = folder === "trash";
  const canReply = folder === "inbox" || folder === "archived";
  const list = await getInbox(folder);
  const selected = sp.id ? await getInboundEmail(sp.id) : null;

  // Marcar como leído: lo dispara <MarkRead/> en el cliente (fuera del render).
  const needsMarkRead = !!selected && !selected.read_at;

  const hasText = !!selected?.text_body && selected.text_body.trim().length > 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <AutoRefresh seconds={30} />

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-accent" /> Correo
        </h1>
        <span className="font-mono text-xs text-fg-muted">hola@dropgigs.com</span>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] rounded-full px-3 py-1"
          style={{ color: "#1e7a45", background: "#e8f5ee", border: "1px solid #bfe3cf" }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#1e9e5a" }} /> En vivo
        </span>
        <div className="ml-auto">
          <Compose />
        </div>
      </div>

      {/* Carpetas */}
      <div className="flex gap-2 mb-4">
        {FOLDERS.map((f) => (
          <a
            key={f.key}
            href={`/admin/correo?folder=${f.key}`}
            className={`font-mono text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 rounded-md border ${
              f.key === folder ? "border-ink bg-orange/10" : "border-border text-fg-muted"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-4">
        {/* Lista */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          {list.length === 0 ? (
            <p className="text-sm text-fg-muted p-5">Sin correos en esta carpeta.</p>
          ) : (
            list.map((m) => (
              <a
                key={m.id}
                href={`/admin/correo?folder=${folder}&id=${m.id}`}
                className={`block px-4 py-3 border-b border-border/60 ${
                  selected?.id === m.id ? "bg-orange/5 border-l-[3px] border-l-orange" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {!m.read_at && (
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#FF5C00" }} />
                  )}
                  <span className={`text-sm truncate ${!m.read_at ? "font-bold" : ""}`}>
                    {isSent ? `Para: ${m.to_email}` : m.from_name || m.from_email}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-fg-muted shrink-0">
                    {relativeTime(m.received_at)}
                  </span>
                </div>
                <div className="text-[13px] mt-0.5 truncate">{m.subject || "(sin asunto)"}</div>
                <div className="text-xs text-fg-muted truncate">{m.snippet}</div>
              </a>
            ))
          )}
        </div>

        {/* Lectura */}
        <div className="border border-border rounded-lg bg-card min-h-[400px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center p-10">
              <p className="text-sm text-fg-muted">Elige un correo para leerlo y responder.</p>
            </div>
          ) : (
            <div className="p-5">
              {needsMarkRead && <MarkRead id={selected.id} />}
              <div className="flex items-start gap-3 pb-4 border-b border-border">
                <div>
                  <div className="text-lg font-bold">{selected.subject || "(sin asunto)"}</div>
                  {isSent ? (
                    <div className="text-sm text-fg-muted mt-1">
                      Para:{" "}
                      <span className="font-semibold text-ink">{selected.to_email}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-fg-muted mt-1">
                      <span className="font-semibold text-ink">
                        {selected.from_name || selected.from_email}
                      </span>{" "}
                      &lt;{selected.from_email}&gt;
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-fg-muted mt-0.5">
                    {isSent ? "enviado" : `para ${selected.to_email}`} ·{" "}
                    {dateTime(selected.received_at)}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {!isTrash && !isSent && (
                    <form action={archiveEmail.bind(null, selected.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-2 hover:border-ink"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archivar
                      </button>
                    </form>
                  )}
                  {isTrash ? (
                    <form action={restoreEmail.bind(null, selected.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-2 hover:border-ink"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    </form>
                  ) : (
                    <form action={deleteEmail.bind(null, selected.id)}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-2 hover:border-ink"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Cuerpo */}
              <div className="py-4">
                {hasText ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {selected.text_body}
                  </pre>
                ) : selected.html_body ? (
                  <iframe
                    sandbox=""
                    srcDoc={selected.html_body}
                    title="cuerpo del correo"
                    className="w-full bg-white rounded"
                    style={{ height: 420, border: "1px solid #E5E1D8" }}
                  />
                ) : (
                  <p className="text-sm text-fg-muted">(Sin contenido)</p>
                )}
              </div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div className="py-3 border-t border-border/60 flex flex-wrap gap-2">
                  {selected.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={`/api/correo/attachment/${selected.resend_id}/${a.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-2 hover:border-ink"
                    >
                      <Paperclip className="w-3.5 h-3.5" /> {a.filename}
                    </a>
                  ))}
                </div>
              )}

              {/* Responder (solo correos recibidos) */}
              {canReply && (
                <ReplyForm
                  id={selected.id}
                  to={selected.from_email}
                  subject={selected.subject ?? ""}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
