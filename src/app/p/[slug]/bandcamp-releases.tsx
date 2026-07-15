/**
 * Releases de Bandcamp auto-importados (Capa 2 · #3). Grid de carátulas que
 * enlazan al release en Bandcamp. Carátulas hotlinkeadas desde la CDN de
 * Bandcamp (f4.bcbits.com) → sin egress ni next.config. Server component.
 */
import type { BandcampRelease } from "@/lib/integrations/bandcamp";

export function BandcampReleases({ releases }: { releases: BandcampRelease[] }) {
  if (releases.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2">
        Releases en Bandcamp
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {releases.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl overflow-hidden hos-glass hover:shadow-[4px_4px_0_rgb(var(--drop-orange))] transition-all"
            title={r.title}
          >
            <div className="aspect-square bg-ink overflow-hidden">
              {r.artUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.artUrl}
                  alt={r.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 font-mono text-[9px]">
                  ♪
                </div>
              )}
            </div>
            <div className="px-1.5 py-1 text-[10px] font-medium leading-tight line-clamp-2 group-hover:text-orange">
              {r.title}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
