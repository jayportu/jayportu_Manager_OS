import { getMyProfile } from "@/lib/queries/dj-profile";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileForm } from "./profile-form";

export default async function PerfilPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Perfil
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Tu identidad como DJ. Esta info alimenta tu press kit público, el
          dashboard y las plantillas.{" "}
          {profile.public_slug && (
            <Link
              href={`/p/${profile.public_slug}`}
              target="_blank"
              className="text-accent underline underline-offset-2"
            >
              Ver mi press kit →
            </Link>
          )}
        </p>
      </div>

      <ProfileForm initialProfile={profile} />
    </div>
  );
}
