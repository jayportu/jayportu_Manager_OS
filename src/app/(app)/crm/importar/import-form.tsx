"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

type Row = ContactInsert & { _ok: boolean; _error?: string };

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

        const scoreStr = get("score");
        const score = scoreStr ? parseInt(scoreStr, 10) : 50;
        const safeScore = isNaN(score) ? 50 : Math.min(100, Math.max(0, score));

        const name = get("name");
        const ok = name.length > 0;

        return {
          name,
          type,
          city: get("city") || "Santiago",
          country: get("country") || "Chile",
          instagram: get("instagram"),
          whatsapp: get("whatsapp"),
          email: get("email"),
          website: get("website"),
          contact_person: get("contact_person"),
          contact_role: get("contact_role"),
          music_style: get("music_style"),
          main_channel,
          status,
          score: safeScore,
          notes: get("notes"),
          source: "csv_import",
          _ok: ok,
          _error: ok ? undefined : "Sin nombre",
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
    // Strip _ok and _error before sending
    const rows: ContactInsert[] = valid.map((row) => {
      const { _ok, _error, ...rest } = row;
      void _ok;
      void _error;
      return rest;
    });

    startTransition(async () => {
      const result = await importContactsAction(rows);
      if (result.ok) {
        setMessage(`✓ ${result.data.inserted} contactos importados.`);
        setPreview(null);
        setCsv("");
        router.push("/crm");
      } else {
        setMessage(`Error: ${result.error}`);
      }
    });
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Pega tu CSV acá
        </label>
        <Textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          placeholder="name,type,city,...
Club La Feria,club,Santiago,..."
          className="font-mono text-xs"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-fg-muted">{message}</div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={handlePreview}>
            Validar
          </Button>
          {preview && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={isPending || preview.filter((r) => r._ok).length === 0}
            >
              {isPending
                ? "Importando…"
                : `Importar ${preview.filter((r) => r._ok).length} contactos`}
            </Button>
          )}
        </div>
      </div>

      {preview && (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-bg-subtle">
              <tr className="text-fg-muted uppercase tracking-wider">
                <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                <th className="text-left px-3 py-2 font-semibold">Tipo</th>
                <th className="text-left px-3 py-2 font-semibold">Ciudad</th>
                <th className="text-left px-3 py-2 font-semibold">Estado</th>
                <th className="text-left px-3 py-2 font-semibold">Score</th>
                <th className="text-left px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 50).map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-border"
                >
                  <td className="px-3 py-2">{r.name || <span className="text-danger">—</span>}</td>
                  <td className="px-3 py-2 text-fg-muted">{r.type}</td>
                  <td className="px-3 py-2 text-fg-muted">{r.city || "—"}</td>
                  <td className="px-3 py-2 text-fg-muted">{r.status}</td>
                  <td className="px-3 py-2 text-fg-muted">{r.score}</td>
                  <td className="px-3 py-2">
                    {r._ok ? (
                      <span className="text-success">OK</span>
                    ) : (
                      <span className="text-danger">{r._error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 50 && (
            <div className="text-xs text-fg-muted text-center py-2">
              ... y {preview.length - 50} más
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
