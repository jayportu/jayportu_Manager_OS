import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listMyApplications } from "@/lib/queries/convocatorias";
import { MyApplications } from "./my-applications";
import { SectionHero } from "@/components/hos";

export const dynamic = "force-dynamic";

export default async function MisPostulacionesPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const applications = await listMyApplications();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <SectionHero
        kicker="Negocio · Convocatorias"
        title="Mis postulaciones"
        sub="Revisa el estado de tus postulaciones a convocatorias. Cuando un organizador te acepte, puedes agregarlo a tu CRM en un clic."
      />
      <MyApplications initialApplications={applications} />
    </div>
  );
}
