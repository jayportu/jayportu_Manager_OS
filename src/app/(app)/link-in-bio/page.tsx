import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { seedFromProfileIfEmpty, listMyLinks } from "@/lib/queries/link-in-bio";
import { LinkEditor } from "./link-editor";
import { ExternalLink } from "lucide-react";
import { SectionHero } from "@/components/hos";

/**
 * Fase 4 — Editor de Link-in-bio. Reemplaza el placeholder ComingSoon.
 * Auto-seedea desde las redes de Perfil la primera vez; el DJ edita orden,
 * activo/oculto y agrega links propios. La página pública vive en /l/{slug}.
 */
export const dynamic = "force-dynamic";

export default async function LinkInBioPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  await seedFromProfileIfEmpty();
  const links = await listMyLinks();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
  const publicUrl = `${baseUrl}/l/${profile.public_slug}`;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <SectionHero
        kicker="Perfil · Link-in-bio"
        title="Link-in-bio"
        sub="Tu página pública para la bio de Instagram. Se armó sola desde tu perfil — reordénala (↑↓), prende/apaga y agrega los links que quieras."
      />

      <div className="mb-6">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] tracking-wide text-[rgb(var(--drop-orange))] hover:underline"
        >
          {publicUrl} <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <LinkEditor initialLinks={links} />
    </div>
  );
}
