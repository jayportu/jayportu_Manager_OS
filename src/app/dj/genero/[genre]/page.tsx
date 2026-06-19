/**
 * SEO #4 — DJs por género (página indexable de long-tail).
 * Ruta finita (un slug por género existente). Dinámica con revalidate 1h.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPublicDjs, listPublicGenres } from "@/lib/queries/directory";
import { slugify, titleCase } from "@/lib/slug";
import { FacetDirectory } from "@/components/public/facet-directory";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ genre: string }>;
}

async function resolveGenre(slug: string) {
  const genres = await listPublicGenres();
  return genres.find((g) => slugify(g.genre) === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { genre } = await params;
  const g = await resolveGenre(genre);
  if (!g) return { title: "Género no encontrado", robots: { index: false } };
  const name = titleCase(g.genre);
  const title = `DJs de ${name} en Chile | DROP.`;
  const description = `Descubre y contrata ${g.count} DJ${
    g.count === 1 ? "" : "s"
  } de ${name} en Chile. Press kit, música, tech rider y disponibilidad en un solo lugar.`;
  return { title, description, alternates: { canonical: `/dj/genero/${genre}` } };
}

export default async function GeneroPage({ params }: PageProps) {
  const { genre } = await params;
  const g = await resolveGenre(genre);
  if (!g) notFound();

  const [djs, allGenres] = await Promise.all([
    listPublicDjs({ genres: [g.genre] }),
    listPublicGenres(),
  ]);
  const name = titleCase(g.genre);
  const related = allGenres
    .filter((x) => x.genre !== g.genre)
    .slice(0, 16)
    .map((x) => ({
      href: `/dj/genero/${slugify(x.genre)}`,
      label: `${titleCase(x.genre)} (${x.count})`,
    }));

  return (
    <FacetDirectory
      kicker="— DJS POR GÉNERO"
      heading={`DJs de ${name}`}
      intro={`${djs.length} DJ${
        djs.length === 1 ? "" : "s"
      } de ${name} en Chile. Revisa su press kit, escucha su música y contrata directo, sin intermediarios.`}
      djs={djs}
      related={related}
      relatedLabel="Otros géneros"
      itemListName={`DJs de ${name} en Chile`}
    />
  );
}
