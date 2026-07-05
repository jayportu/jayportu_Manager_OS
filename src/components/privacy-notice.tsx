import Link from "next/link";

/**
 * BL-06 · Aviso breve de privacidad para el punto de recolección (Ley 21.719,
 * deber de información). Se muestra al pie de los formularios que recolectan
 * datos personales (beta, booking, signup booker, RSVP).
 *
 * `purpose`: finalidad concreta del tratamiento en ese formulario.
 * `extra`: línea adicional opcional (p. ej. captura de IP en /beta).
 *
 * NOTA: el texto debe ser validado por el abogado antes del 1-dic-2026.
 */
export function PrivacyNotice({
  purpose,
  extra,
}: {
  purpose: string;
  extra?: string;
}) {
  return (
    <p className="text-[11px] leading-relaxed text-fg-subtle">
      Al enviar, tratamos tus datos para {purpose}. Revisa nuestra{" "}
      <Link href="/privacy" className="underline hover:text-orange">
        Política de Privacidad
      </Link>{" "}
      y los{" "}
      <Link href="/terms" className="underline hover:text-orange">
        Términos
      </Link>
      .{extra ? ` ${extra}` : ""} Puedes ejercer tus derechos (acceso,
      rectificación, supresión, oposición) escribiendo a{" "}
      <a
        href="mailto:hola@dropgigs.com"
        className="underline hover:text-orange"
      >
        hola@dropgigs.com
      </a>
      .
    </p>
  );
}
