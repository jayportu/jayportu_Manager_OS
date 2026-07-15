import { getMyProfile } from "@/lib/queries/dj-profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SectionHero } from "@/components/hos";
import { ProfileForm } from "./profile-form";
import { AvailabilitySection } from "./availability-section";

export default async function PerfilPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <SectionHero
        kicker="Perfil · Identidad"
        title="Tu perfil"
        sub="Tu identidad como DJ. Esta info alimenta tu press kit público, el dashboard y las plantillas."
        actions={
          profile.public_slug ? (
            <Link
              href={`/p/${profile.public_slug}`}
              target="_blank"
              className="text-sm text-orange underline underline-offset-2 hover:no-underline"
            >
              Ver mi press kit →
            </Link>
          ) : undefined
        }
      />

      <ProfileForm initialProfile={profile} />

      <div className="mt-12 pt-8 border-t border-border">
        <AvailabilitySection profile={profile} />
      </div>
    </div>
  );
}
