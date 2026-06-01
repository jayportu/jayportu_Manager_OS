import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos · DROP.",
  description:
    "Términos de servicio de DROP. — condiciones de uso de la plataforma.",
};

const LAST_UPDATED = "1 de junio de 2026";

export default function TermsPage() {
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
          — Términos de servicio
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
          Términos<span className="text-orange">.</span>
        </h1>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted">
          Última actualización: {LAST_UPDATED}
        </p>

        <Section title="Qué es DROP.">
          <p>
            DROP. es una plataforma SaaS pensada para DJs independientes en
            Latinoamérica. Te damos herramientas para gestionar tu carrera: CRM
            de contactos, calendario de gigs, press kit público, métricas de
            crecimiento, integraciones con Gmail y otros servicios.
          </p>
          <p>
            La operamos desde Santiago, Chile. Al crear una cuenta y usar la
            app aceptas estos términos. Si no estás de acuerdo, no podés usar
            el servicio.
          </p>
        </Section>

        <Section title="Tu cuenta">
          <p>
            Para usar DROP. tenés que crear una cuenta con tu email real. Sos
            responsable de mantener segura tu contraseña y de toda la actividad
            que ocurra desde tu cuenta. Si detectas un acceso sospechoso
            avísanos a{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-ink underline hover:text-orange transition-colors"
            >
              hola@dropgigs.com
            </a>{" "}
            inmediatamente.
          </p>
          <p>
            Mientras estemos en beta cerrada, el acceso es por invitación. Una
            vez en producción abierta, los DJs pueden registrarse libremente
            con un período de trial gratuito y luego suscripción mensual.
          </p>
        </Section>

        <Section title="Lo que podes hacer">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Usar la app para gestionar tu carrera como DJ: tu información,
              tus contactos, tu agenda, tu press kit público.
            </li>
            <li>
              Compartir el link de tu press kit (
              <code className="font-mono text-[13px]">dropgigs.com/p/tu-slug</code>
              ) con bookers, prensa, fans.
            </li>
            <li>
              Conectar integraciones (Gmail, Calendar, redes sociales para
              métricas) si decidís autorizarlas.
            </li>
            <li>
              Pedirnos ayuda técnica o feedback. Tu input define qué
              construimos.
            </li>
          </ul>
        </Section>

        <Section title="Lo que NO podes hacer">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Usar la app para actividades ilegales o que violen derechos de
              terceros.
            </li>
            <li>
              Subir contenido (foto, bio, tracklist, etc.) que no te pertenece
              o sobre el que no tenés derechos.
            </li>
            <li>
              Hacer scraping masivo del directorio público, bypassear rate
              limits, o intentar comprometer la seguridad de la plataforma.
            </li>
            <li>
              Suplantar a otro DJ o crear cuentas falsas.
            </li>
            <li>
              Vender, transferir o compartir tu cuenta con terceros sin nuestro
              consentimiento explícito.
            </li>
          </ul>
          <p>
            Si detectamos uso abusivo podemos suspender o terminar tu cuenta sin
            previo aviso.
          </p>
        </Section>

        <Section title="Contenido tuyo">
          <p>
            Vos sos dueño del contenido que subís a DROP.: tu bio, tu foto, tu
            música, tus tracklists, tus contactos. Nosotros no reclamamos
            ningún derecho de propiedad.
          </p>
          <p>
            Lo único que pedimos es una licencia limitada para mostrar tu
            contenido público (perfil, press kit) a través de la plataforma —
            esto incluye que aparezcas en el directorio{" "}
            <code className="font-mono text-[13px]">/dj</code> y que tu press
            kit sea accesible vía URL si lo activaste.
          </p>
        </Section>

        <Section title="Disponibilidad y cambios al servicio">
          <p>
            Hacemos lo posible para que la app funcione 24/7, pero no garantizamos
            uptime al 100%. Pueden haber interrupciones por mantenimiento,
            problemas técnicos o causas de fuerza mayor.
          </p>
          <p>
            Nos reservamos el derecho de modificar funcionalidades, agregar o
            quitar features, y cambiar planes de precios. Si los cambios son
            materiales (ej. eliminamos algo que estabas usando), te avisamos con
            al menos 30 días de anticipación.
          </p>
        </Section>

        <Section title="Pagos y suscripciones">
          <p>
            Durante la beta cerrada el servicio es gratuito. Cuando lancemos la
            versión pública, el modelo es: trial gratuito de 7 días, luego
            suscripción mensual procesada por MercadoPago. El precio actual y
            las condiciones específicas se muestran al momento de suscribirse.
          </p>
          <p>
            Podes cancelar tu suscripción en cualquier momento desde{" "}
            <code className="font-mono text-[13px]">/configuracion/suscripcion</code>.
            La cancelación toma efecto al final del período pagado — no
            reembolsamos meses ya cobrados, pero seguís teniendo acceso hasta el
            fin del ciclo.
          </p>
        </Section>

        <Section title="Limitación de responsabilidad">
          <p>
            DROP. se ofrece &ldquo;tal cual&rdquo;. En la máxima medida permitida por la ley:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              No somos responsables por pérdida de datos por fallas técnicas
              fuera de nuestro control (cortes de servicios de terceros,
              eventos naturales, etc.).
            </li>
            <li>
              No somos parte de los acuerdos comerciales entre DJs y bookers
              que se generen a partir de nuestra plataforma. Si un booker
              cancela un gig o no paga, eso es tu relación con ellos — nosotros
              solo facilitamos el contacto.
            </li>
            <li>
              Nuestra responsabilidad máxima ante cualquier reclamo se limita
              al monto que hayas pagado por el servicio en los últimos 12
              meses (o cero si estás en beta gratuita).
            </li>
          </ul>
        </Section>

        <Section title="Terminación">
          <p>
            Podes terminar tu uso de DROP. en cualquier momento borrando tu
            cuenta (pedinos a{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-ink underline hover:text-orange transition-colors"
            >
              hola@dropgigs.com
            </a>
            ).
          </p>
          <p>
            Nosotros podemos suspender o terminar tu cuenta si violas estos
            términos, usás la app de manera abusiva, o por requerimiento legal.
            En ese caso intentamos darte aviso previo cuando sea razonable.
          </p>
        </Section>

        <Section title="Ley aplicable">
          <p>
            Estos términos se rigen por las leyes de Chile. Cualquier disputa se
            resolverá en los tribunales de Santiago, Chile.
          </p>
        </Section>

        <Section title="Cambios a estos términos">
          <p>
            Si actualizamos los términos vas a recibir un email + el aviso de
            la nueva fecha &ldquo;última actualización&rdquo; arriba. Si los cambios son
            materiales, te pedimos aceptar la nueva versión antes de seguir
            usando la app. Si no aceptás, podés cerrar tu cuenta sin
            penalidad.
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
            <Link href="/privacy" className="text-ink hover:text-orange transition-colors underline">
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
