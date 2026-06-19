/**
 * SEO #4 — DJs por ciudad (página indexable de long-tail).
 * Ruta finita (un slug por ciudad con DJs). Dinámica con revalidate 1h.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublicDjs, listPublicCities } from "@/lib/queries/directory";
import { slugify } from "@/lib/slug";
import { FacetDirectory } from "@/components/public/facet-directory";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ city: string }>;
}

async function resolveCity(slug: string) {
  const cities = await listPublicCities();
  return cities.find((c) => slugify(c.city) === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const c = await resolveCity(city);
  if (!c) return { title: "Ciudad no encontrada", robots: { index: false } };
  const title = `DJs en ${c.city} | DROP.`;
  const description = `Descubre y contrata ${c.count} DJ${
    c.count === 1 ? "" : "s"
  } en ${c.city}. Press kit, música, tech rider y disponibilidad en un solo lugar.`;
  return { title, description, alternates: { canonical: `/dj/ciudad/${city}` } };
}

export default async function CiudadPage({ params }: PageProps) {
  const { city } = await params;
  const c = await resolveCity(city);
  if (!c) notFound();

  const [djs, allCities] = await Promise.all([
    listPublicDjs({ city: c.city }),
    listPublicCities(),
  ]);
  const related = allCities
    .filter((x) => x.city !== c.city)
    .slice(0, 16)
    .map((x) => ({
      href: `/dj/ciudad/${slugify(x.city)}`,
      label: `${x.city} (${x.count})`,
    }));

  return (
    <FacetDirectory
      kicker="— DJS POR CIUDAD"
      heading={`DJs en ${c.city}`}
      intro={`${djs.length} DJ${
        djs.length === 1 ? "" : "s"
      } en ${c.city}. Revisa su press kit, escucha su música y contrata directo, sin intermediarios.`}
      djs={djs}
      related={related}
      relatedLabel="Otras ciudades"
      itemListName={`DJs en ${c.city}`}
    />
  );
}
