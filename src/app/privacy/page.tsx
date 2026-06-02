import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad · DROP.",
  description:
    "Política de privacidad de DROP. — qué datos guardamos, para qué los usamos y cómo los proteges.",
};

const LAST_UPDATED = "2 de junio de 2026";

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
            DROP. es un sistema operativo para DJs independientes operado
            actualmente por <strong>Jaime Andrés Portugueis Portugueis</strong>{" "}
            (RUT 15.314.349-8) desde Santiago, Chile. Cuando se constituya{" "}
            <strong>DROP SpA</strong>, esta política será actualizada.
          </p>
          <p>
            Esta política describe qué datos personales recolectamos, para qué
            los usamos, en qué base legal nos apoyamos y cómo los proteges.
          </p>
          <p>
            Para cualquier consulta sobre privacidad o ejercer tus derechos:{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-ink underline hover:text-orange transition-colors"
            >
              hola@dropgigs.com
            </a>
            .
          </p>
        </Section>

        <Section title="Base legal del tratamiento">
          <p>
            Tratamos tus datos personales con las siguientes bases legales,
            según la finalidad (anticipando la{" "}
            <strong>Ley 21.719 de Protección de Datos Personales</strong>,
            vigente desde el 1 de diciembre de 2026):
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Ejecución de contrato:</strong> los datos necesarios para
              que la app funcione (email, perfil, contactos, calendario,
              integraciones).
            </li>
            <li>
              <strong>Consentimiento:</strong> datos opcionales que decides
              compartir (perfil público en <code className="font-mono text-[13px]">/dj</code>,
              notificaciones de DJs que sigues, integraciones con Google).
            </li>
            <li>
              <strong>Interés legítimo:</strong> métricas agregadas de uso
              para mejorar el producto, prevención de fraude y abuso.
            </li>
            <li>
              <strong>Obligación legal:</strong> facturación electrónica,
              registros tributarios, respuesta a requerimientos de autoridades.
            </li>
          </ul>
        </Section>

        <Section title="Qué datos guardamos">
          <p>
            <strong>Datos de cuenta:</strong> tu email (para login y
            comunicaciones), nombre artístico, ciudad, géneros, redes sociales
            que decidiste cargar. Estos datos los ingresas tú voluntariamente en
            tu perfil.
          </p>
          <p>
            <strong>Datos de tu actividad en la app:</strong> contactos que
            cargas en tu CRM, eventos del calendario, tracklists, métricas de
            crecimiento, notas privadas. Todo esto vive en tu cuenta y solo lo
            ves tú (más detalle abajo en &ldquo;Cómo protegemos tus datos&rdquo;).
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
            <strong>Datos de pago:</strong> cuando te suscribas, MercadoPago
            procesa el cobro y nos comunica el resultado (exitoso/fallido/
            reembolso) más un ID de transacción.{" "}
            <strong>No almacenamos directamente tu número de tarjeta</strong> —
            eso vive en MercadoPago bajo estándares PCI-DSS.
          </p>
          <p>
            <strong>Integración con Google (Gmail / Calendar):</strong> si
            conectas tu Google, guardamos un token OAuth para acceder a los
            scopes que autorizaste. Los emails y eventos que sincronizamos viven
            en tu cuenta de DROP. Puedes desconectar Google en cualquier momento
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
              Mandarte emails transaccionales (invites, recordatorios,
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

        <Section title="Encargados de tratamiento">
          <p>
            Para que la app funcione contratamos a los siguientes proveedores
            como <strong>encargados de tratamiento de datos</strong>. Cada uno
            tiene su política propia y firmamos los DPAs (Data Processing
            Agreements) correspondientes para asegurar que cumplan estándares
            equivalentes a los nuestros:
          </p>
          <div className="overflow-x-auto -mx-2 my-3">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="text-left py-2 px-2 font-bold">Proveedor</th>
                  <th className="text-left py-2 px-2 font-bold">Para qué</th>
                  <th className="text-left py-2 px-2 font-bold">Región</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                <tr>
                  <td className="py-2 px-2"><strong>Supabase</strong></td>
                  <td className="py-2 px-2">Autenticación + base de datos + storage</td>
                  <td className="py-2 px-2">Estados Unidos</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>Vercel</strong></td>
                  <td className="py-2 px-2">Hosting de la web</td>
                  <td className="py-2 px-2">Global (CDN)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>Cloudflare</strong></td>
                  <td className="py-2 px-2">DNS + email routing + protección DDoS</td>
                  <td className="py-2 px-2">Global (CDN)</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>Resend</strong></td>
                  <td className="py-2 px-2">Envío de emails transaccionales</td>
                  <td className="py-2 px-2">Estados Unidos</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>Google</strong></td>
                  <td className="py-2 px-2">Auth opcional (OAuth) + Gmail / Calendar si los conectas</td>
                  <td className="py-2 px-2">Global</td>
                </tr>
                <tr>
                  <td className="py-2 px-2"><strong>MercadoPago</strong></td>
                  <td className="py-2 px-2">Procesamiento de pagos de la suscripción</td>
                  <td className="py-2 px-2">Argentina / Chile</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Al usar DROP. también aceptas las políticas de privacidad de estos
            proveedores.
          </p>
        </Section>

        <Section title="Transferencias internacionales">
          <p>
            Algunos de nuestros encargados (Supabase, Vercel, Resend, Google)
            tienen servidores <strong>fuera de Chile</strong>. Tomamos las
            medidas técnicas y contractuales razonables (DPAs, cifrado en
            tránsito y reposo, controles de acceso) para asegurar que tus
            datos viajen y se almacenen con el mismo nivel de protección que
            aplicamos localmente.
          </p>
        </Section>

        <Section title="Cómo protegemos tus datos">
          <p>
            Toda la transmisión va por <strong>HTTPS forzado</strong>. Los
            datos están en Supabase (Postgres + Storage) con{" "}
            <em>Row Level Security</em> activado en todas las tablas: a nivel
            base de datos, solo tu sesión puede leer tus filas. Las queries
            que cruzan datos (directorio público de DJs, analytics agregadas)
            van por funciones server-side controladas que filtran lo que sale.
          </p>
          <p>
            Los tokens OAuth de Google y las API keys de pago se almacenan{" "}
            <strong>cifrados en variables de entorno del servidor</strong>,
            nunca en el cliente. El bucket de screenshots de bug reports es
            privado y solo accesible por URLs firmadas con expiración de 1
            hora.
          </p>
          <p>
            Para el correo, autenticamos cada envío con{" "}
            <strong>SPF + DKIM + DMARC</strong> (política{" "}
            <code className="font-mono text-[13px]">quarantine</code>), así
            nadie puede mandar emails haciéndose pasar por dropgigs.com.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Tienes los siguientes derechos sobre tus datos personales (derechos{" "}
            <strong>ARCO</strong> + portabilidad, anticipando la Ley 21.719):
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Acceso:</strong> puedes ver todos tus datos en la app. Si
              quieres un export estructurado (JSON), pídenos vía email.
            </li>
            <li>
              <strong>Rectificación:</strong> editas cualquier campo de tu
              perfil en <code className="font-mono text-[13px]">/perfil</code> y{" "}
              <code className="font-mono text-[13px]">/configuracion</code>.
            </li>
            <li>
              <strong>Cancelación (borrado):</strong> puedes pedir borrar tu
              cuenta entera escribiéndonos a{" "}
              <a
                href="mailto:hola@dropgigs.com"
                className="text-ink underline hover:text-orange transition-colors"
              >
                hola@dropgigs.com
              </a>{" "}
              y procesamos el borrado en máximo 7 días hábiles.
            </li>
            <li>
              <strong>Oposición:</strong> puedes oponerte al tratamiento de tus
              datos para finalidades específicas. En cada email tienes un link
              de unsubscribe que te saca de futuras comunicaciones automáticas.
            </li>
            <li>
              <strong>Portabilidad:</strong> puedes pedir tus datos en un
              formato estructurado y legible para llevarlos a otra plataforma.
            </li>
          </ul>
        </Section>

        <Section title="Notificación de brechas">
          <p>
            En caso de detectar una violación de seguridad que afecte tus datos
            personales, te notificaremos por email{" "}
            <strong>en el plazo más breve posible</strong> (en cualquier caso
            dentro de las 72 horas desde la detección, alineado con estándares
            internacionales y la futura Ley 21.719) con: qué pasó, qué datos
            pueden estar afectados, qué medidas estamos tomando, y qué te
            recomendamos hacer.
          </p>
        </Section>

        <Section title="Conservación">
          <p>
            Mantenemos tus datos mientras tu cuenta esté activa. Si pides el
            borrado, eliminamos tu perfil + datos asociados de la DB de
            producción en un máximo de 7 días hábiles. Los backups automáticos
            de Supabase pueden retener copias hasta 30 días por recuperación de
            desastre, después se purgan automáticamente.
          </p>
          <p>
            Los registros de facturación (boletas/facturas electrónicas) se
            conservan por el plazo legal exigido por el SII (6 años) incluso si
            cierras tu cuenta.
          </p>
        </Section>

        <Section title="Cambios en esta política">
          <p>
            Si actualizamos esta política, te notificamos vía email y cambiamos
            la fecha de &ldquo;última actualización&rdquo; arriba. Si los
            cambios afectan derechos importantes, vas a tener que aceptar de
            nuevo antes de seguir usando la app.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t-2 border-ink">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
            ¿Tienes dudas?{" "}
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
