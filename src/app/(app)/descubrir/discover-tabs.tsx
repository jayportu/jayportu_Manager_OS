"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Label } from "@/components/ui/label";
import {
  Globe2,
  ClipboardPaste,
  FileSpreadsheet,
  Search,
  Loader2,
} from "lucide-react";
import { saveOverpassLeadsAction, importManualTextAction } from "./actions";
import {
  runOverpassQuery,
  findPreset,
  normalizeOverpassElement,
  classifyVenueByName,
} from "@/lib/overpass";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, type ContactType } from "@/types/database";
import Link from "next/link";

interface Preset {
  id: string;
  label: string;
  description: string;
  inferredType: string;
}

interface Props {
  presets: Preset[];
}

type Tab = "osm" | "manual" | "csv";

export function DiscoverTabs({ presets }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("osm");
  const [isPending, startTransition] = useTransition();
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Manual paste
  const [manualText, setManualText] = useState("");
  const [manualType, setManualType] = useState<ContactType>("productora");

  async function handleRunPreset(presetId: string) {
    setResult(null);
    setRunning(presetId);

    try {
      const preset = findPreset(presetId);
      if (!preset) {
        setRunning(null);
        setResult({ type: "err", text: "Preset desconocido" });
        return;
      }

      // 1. Fetch directo a Overpass desde el browser (evita 406 de Vercel)
      const response = await runOverpassQuery(preset.ql);
      const elements = response.elements || [];

      // Normalizar + filtrar por blacklist de nombres
      const allNormalized = elements
        .filter((el) => el.tags && (el.tags["name"] || el.tags["operator"]))
        .map((el) => normalizeOverpassElement(el, preset));

      const filtered: typeof allNormalized = [];
      const blocked: Array<{ name: string; reason: string }> = [];

      for (const n of allNormalized) {
        const classification = classifyVenueByName(n.name);
        if (classification.blacklisted) {
          blocked.push({
            name: n.name,
            reason: classification.blacklistMatch || "blacklist",
          });
          continue;
        }
        filtered.push(n);
      }

      const leads = filtered.map((n) => ({
        name: n.name,
        address: n.address,
        lat: n.lat,
        lng: n.lng,
        instagram: n.instagram,
        website: n.website,
        phone: n.phone,
        email: n.email,
        source_id: n.source_id,
        raw_data: n.raw_data,
      }));

      // 2. Server action solo hace upsert (no llama Overpass)
      startTransition(async () => {
        const r = await saveOverpassLeadsAction({
          presetId,
          inferredType: preset.inferredType as ContactType,
          leads,
        });
        setRunning(null);
        if (r.ok) {
          const blockedSummary =
            blocked.length > 0
              ? ` · ${blocked.length} filtrados por nombre (${blocked
                  .slice(0, 3)
                  .map((b) => b.name)
                  .join(", ")}${blocked.length > 3 ? "…" : ""})`
              : "";
          setResult({
            type: "ok",
            text: `Encontrados ${elements.length} · agregados ${r.data.inserted} (${r.data.skipped} duplicados)${blockedSummary}`,
          });
          router.refresh();
        } else {
          setResult({ type: "err", text: r.error });
        }
      });
    } catch (e) {
      setRunning(null);
      setResult({
        type: "err",
        text: e instanceof Error ? e.message : "Error consultando Overpass",
      });
    }
  }

  function handleImportManual() {
    if (!manualText.trim()) {
      setResult({ type: "err", text: "Pegá algo de texto." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const r = await importManualTextAction(manualText, manualType);
      if (r.ok) {
        setResult({
          type: "ok",
          text: `Parseados ${r.data.parsed} · agregados ${r.data.inserted} leads`,
        });
        setManualText("");
        router.refresh();
      } else {
        setResult({ type: "err", text: r.error });
      }
    });
  }

  return (
    <Card className="p-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        <TabBtn active={tab === "osm"} onClick={() => setTab("osm")}>
          <Globe2 className="w-4 h-4" />
          OpenStreetMap
        </TabBtn>
        <TabBtn active={tab === "manual"} onClick={() => setTab("manual")}>
          <ClipboardPaste className="w-4 h-4" />
          Pegar texto
        </TabBtn>
        <TabBtn active={tab === "csv"} onClick={() => setTab("csv")}>
          <FileSpreadsheet className="w-4 h-4" />
          CSV
        </TabBtn>
      </div>

      {/* OSM tab */}
      {tab === "osm" && (
        <div className="space-y-3">
          <p className="text-xs text-fg-muted">
            Busca venues físicos (clubes, bares, rooftops) usando datos
            abiertos de OpenStreetMap. Gratis, sin tarjeta. Los resultados se
            agregan a la lista de abajo como leads nuevos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleRunPreset(p.id)}
                disabled={isPending}
                className="text-left p-3 rounded-lg border border-border bg-bg hover:border-accent/30 hover:bg-bg-panel transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{p.label}</div>
                  {running === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  ) : (
                    <Search className="w-4 h-4 text-fg-subtle" />
                  )}
                </div>
                <div className="text-xs text-fg-muted mt-1">
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual paste tab */}
      {tab === "manual" && (
        <div className="space-y-3">
          <p className="text-xs text-fg-muted">
            Pegá texto de búsquedas (Google, IG, listados) y la app extrae
            nombre, IG, email y web. Formato esperado: 1 lead por bloque
            separado por línea en blanco.
          </p>
          <div className="bg-bg p-3 rounded text-[11px] font-mono text-fg-muted whitespace-pre">
{`Festival Verde
@festivalverde
contacto@festivalverde.cl
https://festivalverde.cl
Festival electrónico Lo Barnechea

Productora SonarChile
@sonarchile
booking@sonar.cl
+56 9 1234 5678`}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5 md:col-span-1">
              <Label htmlFor="manual-type" className="text-xs">
                Tipo asumido
              </Label>
              <SelectNative
                id="manual-type"
                value={manualType}
                onChange={(e) =>
                  setManualType(e.target.value as ContactType)
                }
              >
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CONTACT_TYPE_LABELS[t]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          <Textarea
            rows={10}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Pegá los leads aquí…"
            className="font-mono text-sm"
          />
          <Button
            onClick={handleImportManual}
            disabled={isPending || !manualText.trim()}
          >
            {isPending ? "Procesando…" : "Importar leads"}
          </Button>
        </div>
      )}

      {/* CSV tab */}
      {tab === "csv" && (
        <div className="text-center py-6 space-y-3">
          <FileSpreadsheet className="w-10 h-10 mx-auto text-fg-subtle" />
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Si tienes una lista en CSV, puedes importarla directo al CRM (no
            pasa por la cola de Descubrir).
          </p>
          <Button asChild variant="outline">
            <Link href="/crm/importar">Ir a Importar CSV</Link>
          </Button>
        </div>
      )}

      {/* Result message */}
      {result && (
        <div
          className={`mt-4 text-sm rounded p-3 border ${
            result.type === "ok"
              ? "text-success bg-success/10 border-success/30"
              : "text-danger bg-danger/10 border-danger/30"
          }`}
        >
          {result.text}
        </div>
      )}
    </Card>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
