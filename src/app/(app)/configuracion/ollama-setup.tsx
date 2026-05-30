"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOllamaStatus } from "@/lib/ai/use-ollama";
import {
  DEFAULT_MODEL,
  FALLBACK_MODEL,
} from "@/lib/ai/ollama";
import { Check, Copy, RefreshCw, AlertCircle } from "lucide-react";

export function OllamaSetup() {
  const { status, loading, refresh } = useOllamaStatus(0); // no auto-poll
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  async function copy(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd(null), 1500);
    } catch {
      /* ignore */
    }
  }

  const corsCmd = `launchctl setenv OLLAMA_ORIGINS "https://dropgigs.com,http://localhost:3010"`;
  const restartCmd = `osascript -e 'quit app "Ollama"' && sleep 2 && open -a Ollama`;
  const pullCmd = `ollama pull ${DEFAULT_MODEL}`;
  const pullFallbackCmd = `ollama pull ${FALLBACK_MODEL}`;

  return (
    <Card className="p-6 space-y-4">
      {/* Estado en vivo */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              loading
                ? "bg-fg-subtle animate-pulse"
                : status.available && status.defaultModelInstalled
                ? "bg-success"
                : status.available
                ? "bg-warning"
                : "bg-danger"
            }`}
          />
          <div>
            <div className="text-sm font-semibold">
              {loading
                ? "Chequeando…"
                : status.available && status.defaultModelInstalled
                ? "Ollama conectado · modelo OK"
                : status.available
                ? "Ollama conectado · falta modelo"
                : "Ollama no disponible"}
            </div>
            {status.version && (
              <div className="text-xs text-fg-muted mt-0.5">
                v{status.version}
                {status.models &&
                  status.models.length > 0 &&
                  ` · ${status.models.length} modelos descargados`}
              </div>
            )}
            {status.error && !status.available && (
              <div className="text-xs text-fg-muted mt-0.5">
                {status.error}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          Re-checar
        </Button>
      </div>

      {/* Modelos instalados */}
      {status.available && status.models && status.models.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-fg-muted font-semibold mb-2">
            Modelos descargados
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {status.models.map((m) => (
              <span
                key={m.name}
                className={`text-xs px-2 py-1 rounded border ${
                  m.name === DEFAULT_MODEL || m.name === FALLBACK_MODEL
                    ? "border-accent/30 bg-accent-soft text-accent"
                    : "border-border bg-bg text-fg-muted"
                }`}
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Instrucciones */}
      <details className="group" open={!status.available || !status.defaultModelInstalled}>
        <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between list-none py-2">
          <span>Instrucciones de setup</span>
          <span className="text-fg-muted group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="space-y-4 mt-3 pt-3 border-t border-border">
          <Step n={1} title="Instalar Ollama">
            <p className="text-sm text-fg-muted mb-2">
              Descarga e instala en tu Mac:
            </p>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent hover:underline"
            >
              ollama.com/download →
            </a>
            <p className="text-xs text-fg-subtle mt-2">
              Ollama corre en segundo plano. Al instalarlo se autostartea.
            </p>
          </Step>

          <Step n={2} title="Descargar modelo recomendado">
            <p className="text-sm text-fg-muted mb-2">
              Abre Terminal y corre (~5GB):
            </p>
            <CommandLine
              cmd={pullCmd}
              copied={copiedCmd === pullCmd}
              onCopy={() => copy(pullCmd)}
            />
            <p className="text-xs text-fg-subtle mt-2">
              Si tu Mac tiene 8GB de RAM en vez de 16GB, usa el modelo más
              liviano:
            </p>
            <CommandLine
              cmd={pullFallbackCmd}
              copied={copiedCmd === pullFallbackCmd}
              onCopy={() => copy(pullFallbackCmd)}
            />
          </Step>

          <Step n={3} title="Configurar CORS para que Vercel pueda llamar localhost">
            <p className="text-sm text-fg-muted mb-2">
              Sin este paso, el navegador bloquea las llamadas a Ollama desde
              tu app deployada.
            </p>
            <p className="text-xs text-fg-muted mb-2">
              Paso 3a: corre este comando en Terminal:
            </p>
            <CommandLine
              cmd={corsCmd}
              copied={copiedCmd === corsCmd}
              onCopy={() => copy(corsCmd)}
            />
            <p className="text-xs text-fg-muted mt-3 mb-2">
              Paso 3b: reinicia Ollama para que tome el cambio:
            </p>
            <CommandLine
              cmd={restartCmd}
              copied={copiedCmd === restartCmd}
              onCopy={() => copy(restartCmd)}
            />
          </Step>

          <Step n={4} title="Re-checar arriba">
            <p className="text-sm text-fg-muted">
              Vuelve arriba y click <strong>&quot;Re-checar&quot;</strong>. Si
              todo está bien, verás &quot;Ollama conectado · modelo OK&quot;.
            </p>
          </Step>
        </div>
      </details>

      {/* Tip */}
      <div className="bg-bg p-3 rounded-lg border border-border">
        <div className="flex gap-2 text-xs text-fg-muted">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
          <div>
            Ollama corre <strong>en tu Mac</strong>. Cuando trabajas desde el
            celular, la IA local no estará disponible y la app cambia
            automáticamente a <strong>Modo ChatGPT manual</strong> (genera
            prompts copiables para chatgpt.com).
          </div>
        </div>
      </div>
    </Card>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pl-9 relative">
      <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-accent text-bg flex items-center justify-center text-xs font-bold">
        {n}
      </div>
      <h4 className="font-semibold text-sm mb-1.5">{title}</h4>
      {children}
    </div>
  );
}

function CommandLine({
  cmd,
  copied,
  onCopy,
}: {
  cmd: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs bg-bg border border-border rounded px-3 py-2 font-mono overflow-x-auto whitespace-nowrap">
        {cmd}
      </code>
      <Button onClick={onCopy} variant="outline" size="sm">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
