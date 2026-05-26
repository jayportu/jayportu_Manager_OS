import { ComingSoon } from "@/components/coming-soon";

export default function BookerCalendarPage() {
  return (
    <ComingSoon
      title="Calendario"
      description="Vas a ver acá todos los eventos que tienes contratados con cada DJ: fechas confirmadas, depósitos, contratos firmados y recordatorios."
      eta="Bloques D + E"
      bullets={[
        "Vista mensual con cada gig contratado",
        "Estado del pago (seña, saldo, pagado)",
        "Acceso al contrato firmado de cada evento",
        "Recordatorios automáticos 48h antes del show",
      ]}
      ctaLabel="Ir a mis requests"
      ctaHref="/booker/requests"
    />
  );
}
