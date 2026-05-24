import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Megaphone,
  Search,
  Calendar,
  Image as ImageIcon,
  Mail,
  Sparkles,
  Settings,
  ArrowRight,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Megaphone,
    label: "Campañas",
    desc: "Push organizado a grupos de contactos",
    href: "/campanas",
  },
  {
    icon: Search,
    label: "Descubrir",
    desc: "Encontrar venues y oportunidades por ciudad",
    href: "/descubrir",
  },
  {
    icon: Calendar,
    label: "Calendario",
    desc: "Gigs sincronizados con Google Calendar",
    href: "/calendario",
  },
  {
    icon: ImageIcon,
    label: "Press kit",
    desc: "Tu página pública con bio, música y bookings",
    href: "/press-kit",
  },
  {
    icon: Mail,
    label: "Gmail",
    desc: "Hilos de booking asociados al CRM",
    href: "/gmail",
  },
  {
    icon: Sparkles,
    label: "IA · Strategy",
    desc: "Asistente IA local + ChatGPT manual",
    href: "/ia",
  },
  {
    icon: Settings,
    label: "Configuración",
    desc: "Perfil, redes, integraciones, notificaciones",
    href: "/configuracion",
  },
];

export default function MasPage() {
  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto md:hidden">
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight">Más secciones</h1>
        <p className="text-sm text-fg-muted mt-1">
          El resto de la app. En desktop estas opciones están en el sidebar
          izquierdo.
        </p>
      </div>

      <div className="space-y-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href}>
              <Card className="p-4 hover:border-accent/30 transition-colors group flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold group-hover:text-accent transition-colors">
                    {s.label}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5 leading-snug">
                    {s.desc}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-fg-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
