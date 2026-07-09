import { ComingSoon } from "@/components/coming-soon";

/**
 * /link-in-bio — placeholder de beta cerrada. La feature aún no existe;
 * se muestra en el menú (badge "PRÓXIMAMENTE") con esta pantalla informativa.
 */
export default function LinkInBioPage() {
  return (
    <ComingSoon
      title="Link-in-bio"
      description="Tu página pública de enlaces (tipo bio de Instagram), armada automáticamente desde tu perfil y tus redes — un solo link para compartir."
      bullets={[
        "Un link único para poner en tu bio de IG/TikTok",
        "Enlaces a Spotify, SoundCloud, YouTube, Beatport y más",
        "Botón de “contrátame” que cae directo a tu CRM",
      ]}
    />
  );
}
