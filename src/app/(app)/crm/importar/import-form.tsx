"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlassPanel, Alert, Badge, TableShell, Th, Td, FIELD } from "@/components/hos";
import { parseCSV } from "@/lib/csv";
import {
  CONTACT_TYPES,
  CONTACT_STATUS,
  MAIN_CHANNELS,
  type ContactInsert,
  type ContactType,
  type ContactStatus,
  type MainChannel,
} from "@/types/database";
import { importContactsAction } from "../actions";

type Row = ContactInsert & { _ok: boolean; _error?: string; _warn?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(s: string): string {
  return s.trim();
}

export function ImportForm() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Row[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handlePreview() {
    setMessage(null);
    if (!csv.trim()) {
      setMessage("Pega un CSV primero.");
      return;
    }
    try {
      const rows = parseCSV(csv);
      if (rows.length < 2) {
        setMessage("El CSV necesita al menos 1 header + 1 fila de datos.");
        return;
      }
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const nameIdx = header.indexOf("name");
      // ¿El CSV trae columna score? Si no, dejamos que el server auto-scoree.
      const hasScoreCol = header.indexOf("score") !== -1;
      if (nameIdx === -1) {
        setMessage(
          'Falta la columna obligatoria "name" en el header.'
        );
        return;
      }

      const data: Row[] = rows.slice(1).map((cols) => {
        const get = (key: string) => {
          const idx = header.indexOf(key);
          if (idx === -1) return "";
          return normalize(cols[idx] || "");
        };
        const rawType = get("type").toLowerCase();
        const type = (CONTACT_TYPES as readonly string[]).includes(rawType)
          ? (rawType as ContactType)
          : ("otro" as ContactType);

        const rawStatus = get("status").toLowerCase();
        const status = (CONTACT_STATUS as readonly string[]).includes(rawStatus)
          ? (rawStatus as ContactStatus)
          : ("nuevo" as ContactStatus);

        const rawChannel = get("main_channel").toLowerCase();
        const main_channel = (MAIN_CHANNELS as readonly string[]).includes(rawChannel)
          ? (rawChannel as MainChannel)
          : ("whatsapp" as MainChannel);

        // Score: solo lo respetamos si el CSV trajo la columna y un número
        // válido; si no, queda undefined → el server auto-scorea.
        let scoreVal: number | undefined = undefined;
        if (hasScoreCol) {
          const n = parseInt(get("score"), 10);
          if (!isNaN(n)) scoreVal = Math.min(100, Math.max(0, n));
        }

        // Validación: email/whatsapp inválidos se OMITEN (campo vacío) en vez de
        // guardar basura; el contacto igual entra. Se avisa en el preview.
        const warns: string[] = [];
        const emailRaw = get("email");
        const emailOk = !emailRaw || EMAIL_RE.test(emailRaw);
        if (!emailOk) warns.push("email inválido → omitido");
        const whatsappRaw = get("whatsapp");
        const whatsappDigits = whatsappRaw.replace(/[^\d]/g, "");
        const whatsappOk = !whatsappRaw || whatsappDigits.length >= 8;
        if (!whatsappOk) warns.push("whatsapp inválido → omitido");

        const name = get("name");
        const ok = name.length > 0;

        return {
          name,
          type,
          city: get("city") || "Santiago",
          country: get("country") || "Chile",
          instagram: get("instagram"),
          whatsapp: whatsappOk ? whatsappRaw : "",
          email: emailOk ? emailRaw : "",
          website: get("website"),
          contact_person: get("contact_person"),
          contact_role: get("contact_role"),
          music_style: get("music_style"),
          main_channel,
          status,
          ...(scoreVal !== undefined ? { score: scoreVal } : {}),
          notes: get("notes"),
          source: "csv_import",
          _ok: ok,
          _error: ok ? undefined : "Sin nombre",
          _warn: warns.length ? warns.join(" · ") : undefined,
        };
      });

      setPreview(data);
      const okCount = data.filter((d) => d._ok).length;
      setMessage(
        `${data.length} filas leídas, ${okCount} válidas. Revisa el preview abajo.`
      );
    } catch (e) {
      setMessage(`Error parseando CSV: ${e instanceof Error ? e.message : "?"}`);
    }
  }

  function handleImport() {
    if (!preview) return;
    const valid = preview.filter((r) => r._ok);
    if (valid.length === 0) {
      setMessage("No hay filas válidas para importar.");
      return;
    }
    // Strip campos de UI antes de enviar
    const rows: ContactInsert[] = valid.map((row) => {
      const { _ok, _error, _warn, ...rest } = row;
      void _ok;
      void _error;
      void _warn;
      return rest;
    });

    startTransition(async () => {
      const result = await importContactsAction(rows);
      if (result.ok) {
        const { inserted, skipped } = result.data;
        setMessage(
          `✓ ${inserted} contactos importados${
            skipped ? ` · ${skipped} omitidos (ya existían)` : ""
          }.`
        );
        setPreview(null);
        setCsv("");
        router.push("/crm");
      } else {
        setMessage(`Error: ${result.error}`);
      }
    });
  }

  const messageTone = message?.startsWith("✓")
    ? "success"
    : message?.startsWith("Error")
      ? "danger"
      : "info";

  return (
    <GlassPanel>
      <div className="space-y-4">
        <div>
          <label htmlFor="csv-input" className="text-sm font-medium mb-2 block">
            Pega tu CSV acá
          </label>
          <Textarea
            id="csv-input"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={10}
            placeholder="name,type,city,...
Club La Feria,club,Santiago,..."
            className={FIELD}
          />
        </div>

        {message && <Alert tone={messageTone}>{message}</Alert>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="clay" onClick={handlePreview}>
            Validar
          </Button>
          {preview && (
            <Button
              type="button"
              variant="clayPrimary"
              onClick={handleImport}
              disabled={isPending || preview.filter((r) => r._ok).length === 0}
            >
              {isPending
                ? "Importando…"
                : `Importar ${preview.filter((r) => r._ok).length} contactos`}
            </Button>
          )}
        </div>

        {preview && (
          <TableShell bare>
            <thead>
              <tr>
                <Th>Nombre</Th>
                <Th>Tipo</Th>
                <Th>Ciudad</Th>
                <Th>Estado</Th>
                <Th>Score</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 50).map((r, i) => (
                <tr key={i}>
                  <Td>{r.name || <span className="text-danger">—</span>}</Td>
                  <Td className="text-white/50">{r.type}</Td>
                  <Td className="text-white/50">{r.city || "—"}</Td>
                  <Td className="text-white/50">{r.status}</Td>
                  <Td className="text-white/50">
                    {typeof r.score === "number" ? r.score : "auto"}
                  </Td>
                  <Td>
                    {!r._ok ? (
                      <Badge tone="down">{r._error}</Badge>
                    ) : r._warn ? (
                      <span title={r._warn}>
                        <Badge tone="warn">
                          <AlertTriangle className="w-3 h-3" /> OK
                        </Badge>
                      </span>
                    ) : (
                      <Badge tone="up">
                        <Check className="w-3 h-3" /> OK
                      </Badge>
                    )}
                  </Td>
                </tr>
              ))}
              {preview.length > 50 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-white/[0.06] px-3 py-2 text-center text-xs text-white/40"
                  >
                    ... y {preview.length - 50} más
                  </td>
                </tr>
              )}
            </tbody>
          </TableShell>
        )}
      </div>
    </GlassPanel>
  );
}
