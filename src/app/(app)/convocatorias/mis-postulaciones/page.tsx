import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listMyApplications } from "@/lib/queries/convocatorias";
import { MyApplications } from "./my-applications";
import { Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MisPostulacionesPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const applications = await listMyApplications();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Ticket className="w-6 h-6 text-accent" />
          Mis postulaciones
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          Revisa el estado de tus postulaciones a convocatorias. Cuando un
          organizador te acepte, puedes agregarlo a tu CRM en un clic.
        </p>
      </div>
      <MyApplications initialApplications={applications} />
    </div>
  );
}
