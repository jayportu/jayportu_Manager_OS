"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Mail, ExternalLink } from "lucide-react";

interface Props {
  serverConfigured: boolean;
  connectedEmail: string | null;
}

export function GmailSetup({ serverConfigured, connectedEmail }: Props) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCmd(text);
      setTimeout(() => setCopiedCmd(null), 1500);
    } catch {
      /* ignore */
    }
  }

  const redirectUri =
    (typeof window !== "undefined"
      ? window.location.origin
      : "https://dropgigs.com") + "/api/gmail/callback";

  return (
    <Card className="p-6 space-y-4">
      {/* Estado en vivo */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              connectedEmail
                ? "bg-success"
                : serverConfigured
                ? "bg-warning"
                : "bg-fg-subtle"
            }`}
          />
          <div>
            <div className="text-sm font-semibold">
              {connectedEmail
                ? `Conectado a ${connectedEmail}`
                : serverConfigured
                ? "Server configurado · falta conectar Google"
                : "Server no configurado"}
            </div>
            <div className="text-xs text-fg-muted mt-0.5">
              {connectedEmail
                ? "Gmail + Calendar disponibles. Si Calendar da error, reconecta con el botón de abajo."
                : serverConfigured
                ? "Ve a /gmail y haz click en 'Conectar Gmail' para autorizar."
                : "Falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor."}
            </div>
          </div>
        </div>
        {connectedEmail ? (
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/gmail/auth">
                <Mail className="w-4 h-4" />
                Reconectar
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/gmail">Ir a Gmail</Link>
            </Button>
          </div>
        ) : serverConfigured ? (
          <Button asChild size="sm">
            <a href="/api/gmail/auth">
              <Mail className="w-4 h-4" />
              Conectar Google
            </a>
          </Button>
        ) : null}
      </div>

      {/* Aviso de reconexión necesaria para Calendar */}
      {connectedEmail && (
        <div className="text-xs bg-accent-soft border border-accent/30 rounded p-3">
          <strong className="text-accent">💡 Calendar habilitado:</strong> Si
          conectaste Gmail antes del Sprint 7, necesitas hacer click en{" "}
          <strong>Reconectar</strong> arriba para autorizar también
          Google Calendar (te va a pedir el nuevo permiso de calendario).
        </div>
      )}

      {/* Instrucciones */}
      {!connectedEmail && (
        <details open={!serverConfigured}>
          <summary className="cursor-pointer text-sm font-semibold flex items-center justify-between list-none py-2">
            <span>Setup Google Cloud Console</span>
            <span className="text-fg-muted group-open:rotate-180 transition-transform">
              ▾
            </span>
          </summary>
          <div className="space-y-5 mt-3 pt-3 border-t border-border">
            <Step n={1} title="Crear proyecto Google Cloud">
              <p className="text-sm text-fg-muted mb-2">
                Entra a Google Cloud Console y crea un proyecto nuevo:
              </p>
              <a
                href="https://console.cloud.google.com/projectcreate"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline inline-flex items-center gap-1"
              >
                console.cloud.google.com/projectcreate <ExternalLink className="w-3 h-3" />
              </a>
              <ul className="text-xs text-fg-muted mt-2 list-disc pl-5 space-y-1">
                <li>Project name: <code className="text-fg">jay-manager-os</code></li>
                <li>Location: déjalo como sugiere (sin organización)</li>
                <li>Click <strong>Create</strong></li>
              </ul>
            </Step>

            <Step n={2} title="Habilitar Gmail API">
              <p className="text-sm text-fg-muted mb-2">
                Una vez creado el proyecto, ve al API library:
              </p>
              <a
                href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline inline-flex items-center gap-1"
              >
                Gmail API → Enable <ExternalLink className="w-3 h-3" />
              </a>
              <p className="text-xs text-fg-muted mt-2">
                Click el botón azul <strong>&quot;Enable&quot;</strong>. No
                pide tarjeta.
              </p>
            </Step>

            <Step n={3} title="Configurar OAuth Consent Screen">
              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline inline-flex items-center gap-1 mb-2"
              >
                OAuth Consent Screen <ExternalLink className="w-3 h-3" />
              </a>
              <ul className="text-xs text-fg-muted list-disc pl-5 space-y-1">
                <li>User Type: <strong>External</strong> → Create</li>
                <li>App name: <code className="text-fg">JAY Manager OS</code></li>
                <li>User support email: tu email</li>
                <li>Developer contact: tu email</li>
                <li>Click <strong>Save and Continue</strong></li>
                <li>Scopes: déjalo vacío → <strong>Save</strong></li>
                <li>Test users: agrega tu email <code className="text-fg">hola@dropgigs.com</code></li>
                <li><strong>NO publiques</strong> la app. Modo &quot;Testing&quot; permite hasta 100 usuarios y no requiere verificación.</li>
              </ul>
            </Step>

            <Step n={4} title="Crear OAuth Client ID">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline inline-flex items-center gap-1 mb-2"
              >
                Credentials → + Create credentials → OAuth client ID <ExternalLink className="w-3 h-3" />
              </a>
              <ul className="text-xs text-fg-muted list-disc pl-5 space-y-1">
                <li>Application type: <strong>Web application</strong></li>
                <li>Name: <code className="text-fg">JAY Manager OS Web</code></li>
                <li>
                  <strong>Authorized redirect URIs</strong>: agrega ambas:
                </li>
              </ul>
              <div className="space-y-2 mt-2">
                <CommandLine
                  cmd={redirectUri}
                  copied={copiedCmd === redirectUri}
                  onCopy={() => copy(redirectUri)}
                />
                <CommandLine
                  cmd="http://localhost:3010/api/gmail/callback"
                  copied={copiedCmd === "http://localhost:3010/api/gmail/callback"}
                  onCopy={() => copy("http://localhost:3010/api/gmail/callback")}
                />
              </div>
              <p className="text-xs text-fg-muted mt-2">
                Click <strong>Create</strong>. Te muestra un popup con
                <strong> Client ID</strong> y <strong>Client Secret</strong>.
                Cópialos y guárdalos en tu nota encriptada.
              </p>
            </Step>

            <Step n={5} title="Configurar en Vercel + .env.local">
              <p className="text-sm text-fg-muted mb-2">
                Necesitas agregar 2 environment variables:
              </p>
              <ul className="text-xs text-fg-muted list-disc pl-5 space-y-1">
                <li>
                  <code className="text-fg">GOOGLE_CLIENT_ID</code> = el client ID
                </li>
                <li>
                  <code className="text-fg">GOOGLE_CLIENT_SECRET</code> = el client secret
                </li>
              </ul>
              <p className="text-xs text-fg-muted mt-3">
                Cuando los tengas, pásamelas por el chat de Claude y yo las
                configuro en .env.local + Vercel. O configúralas tú directo
                en{" "}
                <a
                  href="https://vercel.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Vercel Dashboard
                </a>{" "}
                → tu proyecto → Settings → Environment Variables.
              </p>
            </Step>

            <Step n={6} title="Conectar Gmail">
              <p className="text-sm text-fg-muted">
                Después de configurar las env vars (y redeploy en Vercel), vuelve
                acá y arriba va a aparecer el botón &quot;Conectar Gmail&quot;.
                Click ahí → te lleva a Google → autorizas → vuelves a la app
                conectado.
              </p>
            </Step>
          </div>
        </details>
      )}
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
