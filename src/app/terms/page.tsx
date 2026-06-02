import Link from "next/link";
import type { Metadata } from "next";
import { TOS_VERSION_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Términos · DROP.",
  description:
    "Términos de servicio de DROP. — condiciones de uso de la plataforma.",
};

const LAST_UPDATED = TOS_VERSION_LABEL;

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
            app aceptas estos términos. Si no estás de acuerdo, no puedes usar
            el servicio.
          </p>
        </Section>

        <Section title="Datos del proveedor">
          <p>
            DROP. es operado actualmente por{" "}
            <strong>Jaime Andrés Portugueis Portugueis</strong>, RUT
            15.314.349-8, persona natural, con domicilio en Ricardo Lyon 1717,
            depto 902, Providencia, Santiago, Chile. Cuando se constituya{" "}
            <strong>DROP SpA</strong>, este bloque será reemplazado y los
            usuarios serán notificados por email.
          </p>
          <p>
            Contacto:{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-ink underline hover:text-orange transition-colors"
            >
              hola@dropgigs.com
            </a>
          </p>
        </Section>

        <Section title="Tu cuenta">
          <p>
            Para usar DROP. tienes que crear una cuenta con tu email real. Eres
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

        <Section title="Lo que puedes hacer">
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
              métricas) si decides autorizarlas.
            </li>
            <li>
              Pedirnos ayuda técnica o feedback. Tu input define qué
              construimos.
            </li>
          </ul>
        </Section>

        <Section title="Lo que NO puedes hacer">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Usar la app para actividades ilegales o que violen derechos de
              terceros.
            </li>
            <li>
              Subir contenido (foto, bio, tracklist, etc.) que no te pertenece
              o sobre el que no tienes derechos.
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
            Tú eres dueño del contenido que subes a DROP.: tu bio, tu foto, tu
            música, tus tracklists, tus contactos. No reclamamos ningún derecho
            de propiedad.
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
            quitar features. Si los cambios son materiales (ej. eliminamos algo
            que estabas usando), te avisamos con al menos 30 días de
            anticipación por email.
          </p>
        </Section>

        <Section title="Pagos y suscripciones">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-2">
            Precio
          </h3>
          <p>
            El precio de la suscripción DROP. Pro es de{" "}
            <strong>$9.990 CLP mensuales, IVA incluido</strong>. Mientras
            estemos en beta cerrada el servicio es gratuito.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Trial gratuito
          </h3>
          <p>
            Cuando lancemos la versión pública, los usuarios nuevos arrancan
            con un <strong>trial gratuito de 15 días</strong>. Al final del
            trial, si no cancelas, se activa automáticamente la suscripción
            mensual.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Método de pago
          </h3>
          <p>
            Los pagos se procesan vía <strong>MercadoPago Chile</strong>. Al
            suscribirte autorizas a MercadoPago a guardar tu medio de pago
            para los cobros recurrentes. DROP. nunca almacena directamente tu
            información de tarjeta.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Renovación automática
          </h3>
          <p>
            La suscripción <strong>se renueva automáticamente cada mes</strong>{" "}
            hasta que decidas cancelar. Te enviamos email de confirmación de
            cada cobro con la boleta o factura electrónica correspondiente.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Boleta o factura electrónica
          </h3>
          <p>
            Por cada cobro emitimos <strong>boleta electrónica</strong> (si
            eres persona natural sin giro) o <strong>factura electrónica</strong>{" "}
            (si tienes RUT empresa). El documento se envía al email registrado
            y queda disponible para descarga en tu cuenta.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Derecho a retracto
          </h3>
          <p>
            Tienes <strong>derecho a retracto</strong> dentro de los{" "}
            <strong>10 días posteriores al primer cobro</strong>, según el
            Art. 3 bis de la Ley 19.496. Para ejercerlo, escríbenos a{" "}
            <a
              href="mailto:hola@dropgigs.com"
              className="text-ink underline hover:text-orange transition-colors"
            >
              hola@dropgigs.com
            </a>{" "}
            — te devolvemos el monto completo del primer cobro y cerramos tu
            suscripción.
          </p>
          <p>
            Pasados esos 10 días, <strong>no se reembolsan meses ya cobrados</strong>,
            pero puedes cancelar en cualquier momento desde{" "}
            <code className="font-mono text-[13px]">/configuracion/suscripcion</code>{" "}
            y mantener acceso hasta el fin del período pagado.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Cambios de precio
          </h3>
          <p>
            Si en el futuro modificamos el precio, te avisamos con{" "}
            <strong>al menos 30 días de anticipación</strong> por email. Si
            no estás de acuerdo con el nuevo precio, puedes cancelar antes de
            la próxima renovación sin penalidad.
          </p>

          <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted mt-4">
            Fallo de cobro
          </h3>
          <p>
            Si un cobro mensual falla (tarjeta vencida, sin fondos, etc.), te
            avisamos por email y mantenemos tu acceso por un{" "}
            <strong>período de gracia de 7 días</strong> para que actualices
            tu medio de pago. Pasado ese plazo sin regularizar, la cuenta pasa
            a &ldquo;vencida&rdquo; y se bloquea el acceso hasta que reactives.
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
            Puedes terminar tu uso de DROP. en cualquier momento borrando tu
            cuenta (pídenos a{" "}
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
            términos, usas la app de manera abusiva, o por requerimiento legal.
            En ese caso intentamos darte aviso previo cuando sea razonable.
          </p>
        </Section>

        <Section title="Ley aplicable">
          <p>
            Estos términos se rigen por las <strong>leyes de Chile</strong>.
            Cualquier disputa se resolverá en los{" "}
            <strong>tribunales ordinarios de Santiago, Chile</strong>.
          </p>
        </Section>

        <Section title="Cambios a estos términos">
          <p>
            Si actualizamos los términos vas a recibir un email + el aviso de
            la nueva fecha &ldquo;última actualización&rdquo; arriba. Si los cambios son
            materiales, te pedimos aceptar la nueva versión antes de seguir
            usando la app. Si no aceptas, puedes cerrar tu cuenta sin
            penalidad.
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
