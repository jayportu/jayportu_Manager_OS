import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad · DROP.",
  description:
    "Política de privacidad de DROP. — qué datos guardamos, para qué los usamos y cómo los proteges.",
};

const LAST_UPDATED = "1 de junio de 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="bg-ink text-cream border-b-2 border-orange py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-block"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "32px",
              lineHeight: 0.9,
            }}
          >
            DROP<span className="text-orange">.</span>
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
          — Política de privacidad
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
          Privacidad<span className="text-orange">.</span>
        </h1>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
          Última actualización: {LAST_UPDATED}
        </p>

        <Section title="Quiénes somos">
          <p>
            DROP. es un sistema operativo para DJs independientes operado por
            Jaime Portugueis desde Santiago, Chile. Esta política describe qué
            datos personales recolectamos, para qué los usamos y cómo los
            protegemos.
          </p>
          <p>
            Para cualquier consulta sobre privacidad escribinos a{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-ink underline hover:text-orange transition-colors"
            >
              hola@dropgigs.com
            </a>
            .
          </p>
        </Section>

        <Section title="Qué datos guardamos">
          <p>
            <strong>Datos de cuenta:</strong> tu email (para login y
            comunicaciones), nombre artístico, ciudad, géneros, redes sociales
            que decidiste cargar. Estos datos los entras vos voluntariamente en
            tu perfil.
          </p>
          <p>
            <strong>Datos de tu actividad en la app:</strong> contactos que
            cargas en tu CRM, eventos del calendario, tracklists, métricas de
            crecimiento, notas privadas. Todo esto vive en tu cuenta y solo lo
            ves vos (más detalle abajo en &ldquo;Cómo protegemos tus datos&rdquo;).
          </p>
          <p>
            <strong>Datos públicos en tu press kit:</strong> si activas tu
            perfil público en <code className="font-mono text-[13px]">/p/tu-slug</code>, la
            información que marques como visible (bio, géneros, ciudad, foto,
            redes) queda disponible públicamente vía URL. Los bookers pueden
            verla sin necesidad de tener cuenta.
          </p>
          <p>
            <strong>Datos técnicos:</strong> guardamos eventos de uso (qué
            páginas visitas, qué acciones haces) para entender qué funcionalidad
            sirve y dónde mejorar. No vendemos estos datos a terceros y no
            usamos cookies de tracking de terceros.
          </p>
          <p>
            <strong>Integración con Google (Gmail / Calendar):</strong> si
            conectas tu Google, guardamos un token OAuth para acceder a los
            scopes que autorizaste. Los emails y eventos que sincronizamos viven
            en tu cuenta de DROP. Podes desconectar Google en cualquier momento
            desde Configuración.
          </p>
        </Section>

        <Section title="Para qué los usamos">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Hacer funcionar la app (mostrarte tu CRM, calendario, press kit,
              etc.).
            </li>
            <li>
              Mandarte emails transaccionales (invites, recordatorios de beta,
              notificaciones de DJs que sigues si activaste avisos,
              confirmaciones de pago).
            </li>
            <li>
              Mejorar el producto basándonos en métricas agregadas de uso (sin
              identificarte personalmente en reportes internos).
            </li>
            <li>
              Cumplir obligaciones legales y de facturación cuando aplique.
            </li>
          </ul>
          <p>
            <strong>No</strong> vendemos tus datos a terceros.{" "}
            <strong>No</strong> usamos tu información para entrenar modelos
            externos. <strong>No</strong> compartimos tu CRM con otros DJs.
          </p>
        </Section>

        <Section title="Cómo protegemos tus datos">
          <p>
            Toda la transmisión va por HTTPS forzado. Los datos están en
            Supabase (Postgres + Storage) con <em>Row Level Security</em>{" "}
            activado en todas las tablas: a nivel base de datos, solo tu sesión
            puede leer tus filas. Las queries que cruzan datos
            (directorio público de DJs, analytics agregadas) van por funciones
            server-side controladas que filtran lo que sale.
          </p>
          <p>
            Los tokens OAuth de Google y las API keys de pago se almacenan
            cifrados en variables de entorno del servidor, nunca en el cliente.
            El bucket de screenshots de bug reports es privado y solo accesible
            por URLs firmadas con expiración de 1 hora.
          </p>
          <p>
            Para el correo, autenticamos cada envío con SPF + DKIM + DMARC
            (política <code className="font-mono text-[13px]">quarantine</code>),
            así nadie puede mandar emails haciéndose pasar por dropgigs.com.
          </p>
        </Section>

        <Section title="Tus derechos">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Acceso:</strong> podés ver todos tus datos en la app. Si
              querés un export estructurado, pedinos vía email.
            </li>
            <li>
              <strong>Rectificación:</strong> editás cualquier campo de tu
              perfil en <code className="font-mono text-[13px]">/perfil</code> y{" "}
              <code className="font-mono text-[13px]">/configuracion</code>.
            </li>
            <li>
              <strong>Borrado:</strong> podes pedir borrar tu cuenta entera
              escribinos a{" "}
              <a
                href="mailto:hola@dropgigs.com"
                className="text-ink underline hover:text-orange transition-colors"
              >
                hola@dropgigs.com
              </a>{" "}
              y procesamos el borrado en máximo 7 días hábiles.
            </li>
            <li>
              <strong>Oposición a comunicaciones:</strong> en cualquier email
              tenés un link de unsubscribe que te saca de futuras
              comunicaciones automáticas.
            </li>
          </ul>
        </Section>

        <Section title="Conservación">
          <p>
            Mantenemos tus datos mientras tu cuenta esté activa. Si pedis el
            borrado, eliminamos tu perfil + datos asociados de la DB de producción.
            Backups automáticos de Supabase pueden retener copias hasta 30 días por
            recuperación de desastre, después se purgan.
          </p>
        </Section>

        <Section title="Servicios de terceros que usamos">
          <p>
            Para que la app funcione usamos los siguientes proveedores. Cada uno
            tiene su propia política de privacidad — al usar DROP. también
            aceptas las de ellos:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Supabase</strong> — autenticación + base de datos +
              storage.
            </li>
            <li>
              <strong>Vercel</strong> — hosting de la web.
            </li>
            <li>
              <strong>Cloudflare</strong> — DNS + email routing + protección DDoS.
            </li>
            <li>
              <strong>Resend</strong> — envío de emails transaccionales.
            </li>
            <li>
              <strong>Google</strong> — autenticación opcional (OAuth) + acceso a
              Gmail y Calendar si los conectas.
            </li>
            <li>
              <strong>MercadoPago</strong> — procesamiento de pagos de la
              suscripción (cuando esté activa).
            </li>
          </ul>
        </Section>

        <Section title="Cambios en esta política">
          <p>
            Si actualizamos esta política, vamos a notificarte vía email y a
            cambiar la fecha de &ldquo;última actualización&rdquo; arriba. Si los cambios
            afectan derechos importantes, vas a tener que aceptar de nuevo antes
            de seguir usando la app.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t-2 border-ink">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
            ¿Tenes dudas?{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-orange hover:underline"
            >
              hola@dropgigs.com
            </a>
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            Ver también:{" "}
            <Link href="/terms" className="text-ink hover:text-orange transition-colors underline">
              Términos de servicio
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
