import { ComingSoon } from "@/components/coming-soon";

/**
 * /convocatorias — placeholder de beta cerrada. La feature aún no existe;
 * se muestra en el menú (badge "PRÓXIMAMENTE") con esta pantalla informativa.
 * No muestra convocatorias reales ni consume APIs.
 */
export default function ConvocatoriasPage() {
  return (
    <ComingSoon
      title="Convocatorias"
      description="Postula a fechas abiertas que publican venues y productoras — sin salir a buscar contactos uno por uno."
      bullets={[
        "Oportunidades de gigs abiertas, filtradas por tu ciudad",
        "Postulas con tu press kit en un clic",
        "El match cae directo al CRM de ambas partes",
      ]}
    />
  );
}
