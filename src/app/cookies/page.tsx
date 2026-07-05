import Link from "next/link";
import type { Metadata } from "next";
import { TOS_VERSION_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookies · DROP.",
  description:
    "Política de cookies de DROP. — qué cookies y almacenamiento usamos y para qué.",
};

const LAST_UPDATED = TOS_VERSION_LABEL;

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="bg-ink text-white border-b-2 border-orange py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-block"
            style={{
              fontFamily: "var(--font-satoshi), system-ui, sans-serif",
              fontSize: "32px",
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
            }}
          >
            DROP<span className="text-orange" style={{ marginLeft: "-0.06em" }}>.</span>
          </Link>
          <Link
            href="/"
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle hover:text-orange transition-colors"
          >
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orange">
          — Política de cookies
        </div>
        <h1
          className="mt-2"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "clamp(40px, 6vw, 64px)",
            lineHeight: 0.95,
            letterSpacing: "-0.005em",
          }}
        >
          Cookies<span className="text-orange">.</span>
        </h1>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
          Última actualización: {LAST_UPDATED}
        </p>

        <Section title="Qué son">
          <p>
            Las cookies son pequeños archivos que un sitio guarda en tu
            navegador. DROP. también usa <code className="font-mono text-[13px]">localStorage</code>{" "}
            (almacenamiento local) para funciones básicas. Abajo te explicamos
            qué usamos y para qué.
          </p>
        </Section>

        <Section title="Qué usamos">
          <div className="overflow-x-auto -mx-2 my-3">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-2 px-2 font-bold">Nombre / tipo</th>
                  <th className="text-left py-2 px-2 font-bold">Para qué</th>
                  <th className="text-left py-2 px-2 font-bold">Categoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                <tr>
                  <td className="py-2 px-2"><strong>Sesión</strong> (Supabase Auth)</td>
                  <td className="py-2 px-2">Mantener tu sesión iniciada</td>
                  <td className="py-2 px-2">Estrictamente necesaria</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>Token de invitación</strong></td>
                  <td className="py-2 px-2">Recordar tu invitación (beta / founding)</td>
                  <td className="py-2 px-2">Estrictamente necesaria</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>drop-theme</strong></td>
                  <td className="py-2 px-2">Recordar tu preferencia de tema</td>
                  <td className="py-2 px-2">Funcional</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>drop_sid</strong> (localStorage)</td>
                  <td className="py-2 px-2">Identificador pseudónimo para métricas propias</td>
                  <td className="py-2 px-2">Analítica (1ª parte)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>Vercel Analytics</strong></td>
                  <td className="py-2 px-2">Métricas de tráfico agregadas</td>
                  <td className="py-2 px-2">Analítica (sin cookies)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>No</strong> usamos cookies de publicidad de terceros, ni
            píxeles de Meta/Google, ni Google Analytics. Las tipografías se
            sirven desde nuestro propio dominio, así que no compartimos tu IP
            con Google por ese motivo.
          </p>
        </Section>

        <Section title="Cookies de terceros al usar integraciones">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Si inicias sesión con <strong>Google</strong> o conectas Gmail /
              Calendar, Google puede establecer sus propias cookies.
            </li>
            <li>
              Al suscribirte, <strong>MercadoPago</strong> procesa el pago y
              puede establecer cookies en su flujo.
            </li>
            <li>
              El CAPTCHA de <strong>Cloudflare Turnstile</strong> puede usar
              almacenamiento para validar que no eres un bot.
            </li>
          </ul>
        </Section>

        <Section title="Tus opciones">
          <p>
            Las cookies estrictamente necesarias y funcionales permiten que la
            app funcione; sin ellas no podrías iniciar sesión. Para la analítica
            usamos datos agregados/pseudónimos y <strong>no</strong> almacenamos
            tu dirección IP en nuestras tablas de analítica. Puedes bloquear o
            borrar cookies desde la configuración de tu navegador (bloquear las
            necesarias impedirá el inicio de sesión).
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t-2 border-border">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
            ¿Dudas?{" "}
            <a href="mailto:hola@dropgigs.com" className="text-orange hover:underline">
              hola@dropgigs.com
            </a>
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            Ver también:{" "}
            <Link href="/privacy" className="text-fg hover:text-orange transition-colors underline">
              Política de privacidad
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2
        className="mb-4"
        style={{
          fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
          fontSize: "24px",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-fg">
        {children}
      </div>
    </section>
  );
}
