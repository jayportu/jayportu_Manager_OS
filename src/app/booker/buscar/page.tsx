import { ComingSoon } from "@/components/coming-soon";

export default function BookerSearchPage() {
  return (
    <ComingSoon
      title="Buscar DJs"
      description="Buscador avanzado con filtros guardados: tus géneros favoritos, ciudad por defecto, rango de presupuesto, disponibilidad para tu próximo evento."
      eta="Sprint post-MVP"
      bullets={[
        "Filtros guardados con tus preferencias",
        "Match por género + ciudad + disponibilidad",
        "Recomendaciones basadas en tus favoritos",
        "Alertas cuando un DJ que te interesa libere fecha",
      ]}
      ctaLabel="Ir al directorio público"
      ctaHref="/dj"
    />
  );
}
