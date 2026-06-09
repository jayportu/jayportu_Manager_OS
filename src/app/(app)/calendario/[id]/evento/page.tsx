import { getMyEvent, listEventRsvps } from "@/lib/queries/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventoManager } from "./evento-manager";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventoManagerPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getMyEvent(id);
  if (!event) notFound();
  const rsvps = await listEventRsvps(id);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/calendario"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al calendario
      </Link>
      <EventoManager event={event} rsvps={rsvps} siteUrl={siteUrl} />
    </div>
  );
}
