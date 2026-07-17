import { Mail, Archive, Trash2, RotateCcw, Paperclip } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import { getInbox, getInboundEmail } from "@/lib/queries/inbox";
import { relativeTime, dateTime } from "@/lib/format";
import { SectionHero, GlassPanel, Badge, ClayChip } from "@/components/hos";
import { Button } from "@/components/ui/button";
import { AutoRefresh } from "../email-campaigns/auto-refresh";
import { archiveEmail, deleteEmail, restoreEmail, markEmailUnread, deleteForever } from "./actions";
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
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <AutoRefresh seconds={30} />

      <SectionHero
        kicker="Admin · Correo"
        title="Correo"
        sub="hola@dropgigs.com"
        actions={
          <>
            <Badge tone="up">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"
              />{" "}
              En vivo
            </Badge>
            <Compose />
          </>
        }
      />

      {/* Carpetas */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FOLDERS.map((f) => (
          <a key={f.key} href={`/admin/correo?folder=${f.key}`}>
            <ClayChip active={f.key === folder}>{f.label}</ClayChip>
          </a>
        ))}
      </div>

      <div className="grid md:grid-cols-[340px_1fr] gap-4">
        {/* Lista */}
        <GlassPanel padded={false}>
          {list.length === 0 ? (
            <p className="text-sm text-white/50 p-5">Sin correos en esta carpeta.</p>
          ) : (
            list.map((m) => (
              <a
                key={m.id}
                href={`/admin/correo?folder=${folder}&id=${m.id}`}
                className={`block px-4 py-3 border-b border-white/[0.06] transition-colors hover:bg-white/[0.03] ${
                  selected?.id === m.id
                    ? "bg-[rgb(var(--drop-orange)/0.1)] border-l-[3px] border-l-[rgb(var(--drop-orange))]"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {!m.read_at && (
                    <span className="w-2 h-2 rounded-full shrink-0 bg-[rgb(var(--drop-orange))]" />
                  )}
                  <span className={`text-sm truncate ${!m.read_at ? "font-bold" : ""}`}>
                    {isSent ? `Para: ${m.to_email}` : m.from_name || m.from_email}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-white/40 shrink-0">
                    {relativeTime(m.received_at)}
                  </span>
                </div>
                <div className="text-[13px] mt-0.5 truncate">{m.subject || "(sin asunto)"}</div>
                <div className="text-xs text-white/50 truncate">{m.snippet}</div>
              </a>
            ))
          )}
        </GlassPanel>

        {/* Lectura */}
        <GlassPanel padded={false}>
          {!selected ? (
            <div className="flex min-h-[400px] items-center justify-center p-10">
              <p className="text-sm text-white/50">Elige un correo para leerlo y responder.</p>
            </div>
          ) : (
            <div className="p-5">
              {needsMarkRead && <MarkRead id={selected.id} />}
              <div className="flex items-start gap-3 pb-4 border-b border-white/10">
                <div>
                  <div className="text-lg font-bold">{selected.subject || "(sin asunto)"}</div>
                  {isSent ? (
                    <div className="text-sm text-white/50 mt-1">
                      Para:{" "}
                      <span className="font-semibold text-white">{selected.to_email}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-white/50 mt-1">
                      <span className="font-semibold text-white">
                        {selected.from_name || selected.from_email}
                      </span>{" "}
                      &lt;{selected.from_email}&gt;
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-white/40 mt-0.5">
                    {isSent ? "enviado" : `para ${selected.to_email}`} ·{" "}
                    {dateTime(selected.received_at)}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {!isTrash && !isSent && (
                    <form action={markEmailUnread.bind(null, selected.id, folder)}>
                      <Button type="submit" variant="clay" size="sm">
                        <Mail className="w-3.5 h-3.5" /> Marcar no leído
                      </Button>
                    </form>
                  )}
                  {!isTrash && !isSent && (
                    <form action={archiveEmail.bind(null, selected.id)}>
                      <Button type="submit" variant="clay" size="sm">
                        <Archive className="w-3.5 h-3.5" /> Archivar
                      </Button>
                    </form>
                  )}
                  {isTrash ? (
                    <>
                      <form action={restoreEmail.bind(null, selected.id)}>
                        <Button type="submit" variant="clay" size="sm">
                          <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                        </Button>
                      </form>
                      <form action={deleteForever.bind(null, selected.id)}>
                        <Button
                          type="submit"
                          variant="clay"
                          size="sm"
                          className="text-[rgb(var(--drop-danger))]"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar definitivamente
                        </Button>
                      </form>
                    </>
                  ) : (
                    <form action={deleteEmail.bind(null, selected.id)}>
                      <Button type="submit" variant="clay" size="sm">
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </Button>
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
                    className="w-full h-[420px] rounded-lg border border-white/10 bg-white/[0.04]"
                  />
                ) : (
                  <p className="text-sm text-white/50">(Sin contenido)</p>
                )}
              </div>

              {selected.attachments && selected.attachments.length > 0 && (
                <div className="py-3 border-t border-white/[0.06] flex flex-wrap gap-2">
                  {selected.attachments.map((a) => (
                    <Button key={a.id} asChild variant="clay" size="sm">
                      <a
                        href={`/api/correo/attachment/${selected.resend_id}/${a.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> {a.filename}
                      </a>
                    </Button>
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
        </GlassPanel>
      </div>
    </div>
  );
}
