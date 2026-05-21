import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Bell, Star, ArrowRight } from "lucide-react";
import { getMyProfile } from "@/lib/queries/dj-profile";
import Link from "next/link";

const KPIS = [
  {
    label: "Próximas fechas",
    value: "3",
    delta: "+1 esta semana",
    deltaUp: true,
    highlight: true,
  },
  {
    label: "Seguimientos hoy",
    value: "7",
    delta: "2 atrasados",
    deltaUp: false,
  },
  {
    label: "Pipeline activo",
    value: "19",
    delta: "+4 vs semana pasada",
    deltaUp: true,
  },
  {
    label: "Vistas press kit · 7d",
    value: "142",
    delta: "+38% vs anterior",
    deltaUp: true,
  },
];

const SHOWS = [
  {
    day: "22",
    month: "May",
    venue: "Sky Beats · Sky Costanera",
    meta: "23:00 · Tech House · Confirmado con Camila P.",
    status: "Confirmado",
    confirmed: true,
  },
  {
    day: "05",
    month: "Jun",
    venue: "Club Room · Bellavista",
    meta: "00:30 · Progressive · Falta confirmar rider",
    status: "Confirmado",
    confirmed: true,
  },
  {
    day: "19",
    month: "Jun",
    venue: "Piknic Electronik · Parque O'Higgins",
    meta: "19:00 · Melodic Techno · Esperando propuesta",
    status: "Tentativo",
    confirmed: false,
  },
];

const FOLLOWUPS = [
  {
    initials: "LF",
    name: "Club La Feria",
    reason: "Press kit enviado hace 3 días · sin respuesta",
    score: 92,
  },
  {
    initials: "MR",
    name: "Mauricio Reyes · DJ",
    reason: "Propuesta de B2B Tech House · esperando fecha",
    score: 81,
  },
  {
    initials: "CC",
    name: "Cumbres Sky · Rooftop",
    reason: "Atrasado 2 días · primer contacto",
    score: 76,
  },
  {
    initials: "SC",
    name: "SonarChile · Productora",
    reason: "Conversación pendiente · pidió set demo",
    score: 68,
  },
];

const ALERTS = [
  {
    icon: Bell,
    text: "Club Amanda pidió tu rider técnico hace 4 días y aún no respondes.",
    action: "Generar respuesta →",
  },
  {
    icon: Star,
    text: "Cumbres Sky tiene fecha abierta el 12 de junio · alto match con tu estilo (Score 87).",
    action: "Crear contacto →",
  },
  {
    icon: TrendingUp,
    text: 'Tu reel "Cabina La Feria" tuvo +180% engagement. Replica el formato esta semana.',
    action: "Ver ideas →",
  },
];

export default async function DashboardPage() {
  const profile = await getMyProfile();

  // Saludo según hora local
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  // Nombre a mostrar: artist_name si existe, sino caemos a "Jay"
  const displayName =
    profile?.artist_name && profile.artist_name.trim().length > 0
      ? profile.artist_name.trim()
      : "Jay";

  // Si no completó su perfil, mostrar CTA
  const profileIncomplete =
    !profile?.artist_name || profile.artist_name.trim().length === 0;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greeting}, {displayName}
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          Tienes 7 seguimientos pendientes y 1 propuesta esperando respuesta.
        </p>
      </div>

      {/* CTA si el perfil está incompleto */}
      {profileIncomplete && (
        <Link
          href="/configuracion"
          className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-accent-soft border border-accent/30 hover:border-accent transition-colors group"
        >
          <div className="w-8 h-8 rounded-md bg-accent text-bg flex items-center justify-center font-bold text-sm shrink-0">
            !
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-fg">
              Completa tu perfil de DJ
            </div>
            <div className="text-xs text-fg-muted mt-0.5">
              Define tu nombre artístico, bio, estilos y canales públicos para
              que el dashboard y press kit muestren tu identidad real.
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-accent group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="text-[11px] uppercase tracking-wider text-fg-muted font-semibold mb-2">
              {kpi.label}
            </div>
            <div
              className={`font-display text-4xl leading-none tracking-wider ${
                kpi.highlight ? "text-accent" : "text-fg"
              }`}
            >
              {kpi.value}
            </div>
            <div
              className={`text-xs mt-2 flex items-center gap-1 ${
                kpi.deltaUp ? "text-success" : "text-danger"
              }`}
            >
              {kpi.deltaUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {kpi.delta}
            </div>
          </Card>
        ))}
      </div>

      {/* Two columns: Shows + Followups */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-5 mb-5">
        <Card className="lg:col-span-4 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Próximas fechas
            </h2>
            <button className="text-xs text-accent hover:underline">
              Ver todas →
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {SHOWS.map((show) => (
              <div
                key={show.venue}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-bg border border-border"
              >
                <div className="flex flex-col items-center min-w-[48px]">
                  <div className="font-display text-2xl leading-none text-accent">
                    {show.day}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-fg-muted mt-0.5">
                    {show.month}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {show.venue}
                  </div>
                  <div className="text-xs text-fg-muted truncate mt-0.5">
                    {show.meta}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap ${
                    show.confirmed
                      ? "bg-accent-soft text-accent border border-accent/30"
                      : "bg-secondary text-fg-muted border border-border"
                  }`}
                >
                  {show.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Seguimientos hoy
            </h2>
            <button className="text-xs text-accent hover:underline">
              7 pendientes →
            </button>
          </div>
          <div className="flex flex-col gap-2.5">
            {FOLLOWUPS.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-bg border border-border"
              >
                <div className="w-9 h-9 rounded-full bg-secondary border border-border-strong flex items-center justify-center text-xs font-bold shrink-0">
                  {f.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{f.name}</div>
                  <div className="text-[11px] text-fg-muted truncate mt-0.5">
                    {f.reason}
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded bg-accent-soft text-accent shrink-0">
                  {f.score}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* IA Alerts */}
      <Card className="p-6 mb-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            IA · Recomendaciones
          </h2>
          <button className="text-xs text-accent hover:underline">
            Modo estrategia →
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {ALERTS.map((alert, i) => {
            const Icon = alert.icon;
            return (
              <div
                key={i}
                className="flex gap-3 p-3.5 rounded-lg bg-bg border border-border"
              >
                <div className="w-7 h-7 rounded-md bg-accent-soft border border-accent/30 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-fg leading-relaxed">
                    {alert.text}
                  </div>
                  <button className="text-[11px] font-semibold text-accent mt-1.5 hover:underline inline-flex items-center gap-1">
                    {alert.action}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="text-center text-[10px] uppercase tracking-widest text-fg-subtle py-6">
        {profile?.city || "Santiago"} · {profile?.country || "Chile"}
      </div>
    </div>
  );
}
