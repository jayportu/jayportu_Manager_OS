import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { WelcomeWizard } from "./welcome-wizard";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.onboarding_completed_at) redirect("/dashboard");

  return (
    <WelcomeWizard
      initialIdentity={{
        artist_name: profile.artist_name || "",
        city: profile.city || "Santiago",
        genres: profile.genres || [],
      }}
      initialSocials={{
        instagram_url: profile.instagram_url || "",
        spotify_url: profile.spotify_url || "",
        youtube_url: profile.youtube_url || "",
        soundcloud_username: extractSoundcloudUsername(profile.soundcloud_url),
      }}
      tosAlreadyAccepted={!!profile.tos_accepted_at}
    />
  );
}

function extractSoundcloudUsername(url: string): string {
  if (!url) return "";
  const match = url.match(/soundcloud\.com\/([^/?#]+)/i);
  return match ? match[1] : "";
}
