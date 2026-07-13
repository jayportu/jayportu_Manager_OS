"use client";

/**
 * Hybrid OS — Página de kit / referencia viva (`/ui-experiments/hos-kit`).
 *
 * Renderiza cada primitiva de `src/components/hos/` (Tasks 2–3) + las
 * variantes clay de `Button` (Task 4). Sirve de:
 *   1. Guía de migración para quien porte una pantalla al kit canónico.
 *   2. Referencia de regresión visual (QA a 1280 / 768 / 375, lado a lado
 *      con el mockup `_kit` en `/ui-experiments/app-redesign`).
 *
 * Localhost-only: el gate ya lo resuelve `src/lib/supabase/middleware.ts`
 * (host-based, ver comentario ahí) — esta página no necesita lógica extra.
 * Datos ficticios en todo el archivo.
 */

import { useState } from "react";
import {
  Rocket,
  Users,
  CalendarDays,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  GlassPanel,
  MonoLabel,
  KpiTile,
  Badge,
  SectionHero,
  ClayChip,
  Alert,
  EmptyState,
  Toggle,
  TableShell,
  Th,
  Td,
  MobileRecordCard,
  RecordRow,
  ClayChipButton,
  FIELD,
  SELECT,
} from "@/components/hos";
import { Button } from "@/components/ui/button";

/* ── Envoltorio de sección: encabezado consistente para cada primitiva ── */
function Kit({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16">
      <MonoLabel>{title}</MonoLabel>
      {note && <p className="mt-1 max-w-2xl text-[13px] leading-snug text-white/50">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const BADGE_TONES = ["up", "warn", "down", "info", "neutral"] as const;

export default function HosKitPage() {
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);
  const [chipView, setChipView] = useState<"lista" | "calendario">("lista");

  return (
    <div data-theme="dark" className="min-h-screen bg-[#0B0B0B] text-[#F7F7F7]">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <SectionHero
          kicker="Hybrid OS · Kit canónico"
          title="hos-kit"
          sub="Referencia viva de cada primitiva en src/components/hos/. No es una pantalla productiva: es la guía de migración y el test visual de regresión. Datos ficticios."
        />

        {/* — Navegación rápida — */}
        <nav className="mb-10 flex flex-wrap gap-1.5">
          {[
            ["glass-panel", "GlassPanel"],
            ["kpi-tile", "KpiTile"],
            ["badge", "Badge"],
            ["button", "Button"],
            ["toggle", "Toggle"],
            ["alert", "Alert"],
            ["empty-state", "EmptyState"],
            ["table", "Table"],
            ["chip", "ClayChip"],
            ["fields", "Campos"],
            ["blur-budget", "Blur budget"],
            ["mapping", "Mapa viejo→hos"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white/55 hover:border-white/25 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="space-y-14">
          {/* ───────────────────── GlassPanel ───────────────────── */}
          <Kit
            id="glass-panel"
            title="GlassPanel"
            note="Ventana de contenido (Glass). Blur SOLO aquí y en el shell — nunca por fila de tabla/lista. `sweep` añade el brillo diagonal en hover (se apaga con prefers-reduced-motion)."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <GlassPanel>
                <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">sweep=false</div>
                <p className="mt-2 text-sm text-white/70">
                  Panel base. Úsalo para reemplazar cualquier <code className="text-white/50">Card</code> con
                  <code className="text-white/50"> rounded-*</code> de contenido.
                </p>
              </GlassPanel>
              <GlassPanel sweep>
                <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">sweep=true</div>
                <p className="mt-2 text-sm text-white/70">
                  Mismo panel con el brillo de hover activado. Pasa el mouse por encima para verlo cruzar.
                </p>
              </GlassPanel>
            </div>
          </Kit>

          {/* ───────────────────── KpiTile ───────────────────── */}
          <Kit
            id="kpi-tile"
            title="KpiTile"
            note='Clay. Reemplaza las 7 implementaciones ad-hoc (Dashboard, CRM, Calendario, Campañas, Growth, Press-kit, Admin). Props: label, value, sub?, delta?, tone?, accent?, href?.'
          >
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <KpiTile label="Fechas activas" value={18} sub="este mes" />
              <KpiTile label="Ingresos" value="$4.2M" delta="+12% vs. mes anterior" tone="up" />
              <KpiTile label="Cancelaciones" value={3} delta="-2 vs. mes anterior" tone="down" />
              <KpiTile label="Reproducciones" value="182K" sub="IG + TikTok" accent />
            </div>
          </Kit>

          {/* ───────────────────── Badge ───────────────────── */}
          <Kit
            id="badge"
            title="Badge"
            note='Reemplaza los STATUS_BADGE/STATUS_STYLES locales (Campañas, solicitudes, calendario, admin). Tonos: up, warn, down, info, neutral × soft (default) / solid.'
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>Tono</Th>
                    <Th>Soft (default)</Th>
                    <Th>Solid</Th>
                  </tr>
                </thead>
                <tbody>
                  {BADGE_TONES.map((tone) => (
                    <tr key={tone}>
                      <Td className="font-mono text-[10px] uppercase tracking-wider text-white/45">{tone}</Td>
                      <Td>
                        <Badge tone={tone}>{tone}</Badge>
                      </Td>
                      <Td>
                        <Badge tone={tone} solid>
                          {tone}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-white/40">
              QA: verificar AA en los 5 tonos, soft y solid, sobre el fondo `#0B0B0B` y sobre `hos-glass`.
            </p>
          </Kit>

          {/* ───────────────────── Button ───────────────────── */}
          <Kit
            id="button"
            title="Button — variantes clay"
            note='Task 4: `variant="clay"` (secundario, superficie clay) y `variant="clayPrimary"` (primario, orange raised) coexisten con las variantes existentes (`default`, `outline`, etc.) mientras dura la migración.'
          >
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="clay">Clay</Button>
              <Button variant="clayPrimary">Clay primary</Button>
            </div>
            <p className="mt-3 text-[12px] text-white/40">
              Las cuatro variantes son intercambiables en el mismo árbol — no hay conflicto de clases ni de foco
              (todas comparten `focus-visible:ring` naranja).
            </p>
          </Kit>

          {/* ───────────────────── Toggle ───────────────────── */}
          <Kit
            id="toggle"
            title="Toggle"
            note="Switch clay controlado, role=switch, target ≥44px, foco naranja. Extraído de configuración. Interactivo: haz clic para alternar."
          >
            <GlassPanel className="max-w-md">
              <div className="divide-y divide-white/[0.06]">
                <div className="pb-3">
                  <Toggle
                    checked={toggleA}
                    onChange={setToggleA}
                    label="Notificaciones por correo"
                    sub="Resumen semanal de reservas y mensajes"
                  />
                </div>
                <div className="pt-3">
                  <Toggle
                    checked={toggleB}
                    onChange={setToggleB}
                    label="Modo founding cohort"
                    sub="Visible solo para cuentas beta"
                    disabled
                  />
                </div>
              </div>
            </GlassPanel>
          </Kit>

          {/* ───────────────────── Alert ───────────────────── */}
          <Kit
            id="alert"
            title="Alert"
            note='Unifica los 2 estilos ad-hoc (border-2 de Calendario vs. bg-danger/10 de Correo) en 4 tonos semánticos: info, success, warn, danger.'
          >
            <div className="grid gap-3 md:grid-cols-2">
              <Alert tone="info" title="Info">
                La sincronización con Google Calendar corre cada 15 minutos.
              </Alert>
              <Alert tone="success" title="Listo">
                El press-kit de NOVA RÍOS se publicó correctamente.
              </Alert>
              <Alert tone="warn" title="Atención">
                2 fechas de julio aún no tienen contrato firmado.
              </Alert>
              <Alert tone="danger" title="Error">
                No se pudo cobrar la suscripción — actualiza el método de pago.
              </Alert>
            </div>
          </Kit>

          {/* ───────────────────── EmptyState ───────────────────── */}
          <Kit
            id="empty-state"
            title="EmptyState"
            note="Unifica ~10 vacíos ad-hoc (dashed border suelto) en un solo patrón: icono clay + título + sub + acción opcional."
          >
            <EmptyState
              icon={Rocket}
              title="Sin convocatorias activas"
              sub="Cuando publiques una convocatoria de fecha, aparecerá aquí con sus postulaciones."
              action={<Button variant="clayPrimary">Crear convocatoria</Button>}
            />
          </Kit>

          {/* ───────────────────── Table ───────────────────── */}
          <Kit
            id="table"
            title="TableShell / Th / Td / MobileRecordCard / RecordRow"
            note="Superficie SÓLIDA — sin blur por fila (regla de rendimiento no negociable). Desktop: <table>. Mobile: MobileRecordCard + RecordRow por registro."
          >
            <div className="space-y-4">
              <div>
                <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-white/35">
                  Vista desktop
                </div>
                <TableShell>
                  <thead>
                    <tr>
                      <Th>Artista</Th>
                      <Th>Fecha</Th>
                      <Th align="right">Cachet</Th>
                      <Th align="center">Estado</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>NOVA RÍOS</Td>
                      <Td>18 jul 2026</Td>
                      <Td align="right">$850.000</Td>
                      <Td align="center">
                        <Badge tone="up">confirmado</Badge>
                      </Td>
                    </tr>
                    <tr>
                      <Td>Bruma</Td>
                      <Td>22 jul 2026</Td>
                      <Td align="right">$620.000</Td>
                      <Td align="center">
                        <Badge tone="warn">pendiente</Badge>
                      </Td>
                    </tr>
                    <tr>
                      <Td>Selk&apos;nam</Td>
                      <Td>2 ago 2026</Td>
                      <Td align="right">$410.000</Td>
                      <Td align="center">
                        <Badge tone="down">cancelado</Badge>
                      </Td>
                    </tr>
                  </tbody>
                </TableShell>
              </div>

              <div>
                <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-white/35">
                  Vista mobile (colapso de la primera fila)
                </div>
                <MobileRecordCard title="NOVA RÍOS" meta={<Badge tone="up">confirmado</Badge>}>
                  <RecordRow k="Fecha">18 jul 2026</RecordRow>
                  <RecordRow k="Cachet">$850.000</RecordRow>
                </MobileRecordCard>
              </div>
            </div>
          </Kit>

          {/* ───────────────────── ClayChip / ClayChipButton ───────────────────── */}
          <Kit
            id="chip"
            title="ClayChip / ClayChipButton"
            note="ClayChip: pill de estado (presentacional). ClayChipButton: la misma superficie clay pero interactiva (filtros, toggles de vista) — usa onClick + aria-pressed."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <ClayChip active>Activo</ClayChip>
                <ClayChip>Inactivo</ClayChip>
              </div>
              <div className="flex flex-wrap gap-2">
                <ClayChipButton icon={CalendarDays} active={chipView === "lista"} onClick={() => setChipView("lista")}>
                  Lista
                </ClayChipButton>
                <ClayChipButton
                  icon={Users}
                  active={chipView === "calendario"}
                  onClick={() => setChipView("calendario")}
                >
                  Calendario
                </ClayChipButton>
              </div>
              <p className="text-[12px] text-white/40">
                Vista seleccionada: <span className="text-white/70">{chipView}</span>
              </p>
            </div>
          </Kit>

          {/* ───────────────────── Campos (FIELD/SELECT) ───────────────────── */}
          <Kit
            id="fields"
            title="FIELD / SELECT"
            note="Clases utilitarias para inputs glass-inset con foco naranja. No son componentes — se aplican vía className a <input>/<select> nativos."
          >
            <div className="grid max-w-md gap-3">
              <input className={FIELD} placeholder="Nombre del contacto" />
              <select className={SELECT} defaultValue="dj">
                <option value="dj">DJ</option>
                <option value="productora">Productora</option>
                <option value="venue">Venue</option>
              </select>
            </div>
          </Kit>

          {/* ───────────────────── Blur budget ───────────────────── */}
          <Kit id="blur-budget" title="Presupuesto de blur (regla de rendimiento)">
            <Alert tone="warn" title="No negociable">
              <code className="text-white/70">backdrop-filter</code> (glass) SOLO en el shell (sidebar/topbar) y en
              paneles top-level (<code className="text-white/70">GlassPanel</code>). Nunca por fila de tabla o
              ítem de lista — por eso <code className="text-white/70">TableShell</code>/<code className="text-white/70">MobileRecordCard</code>{" "}
              son superficies sólidas (<code className="text-white/70">rgba(255,255,255,.02–.03)</code>, sin blur).
              En listas largas, un blur por fila multiplica el costo de compositing y cae notoriamente en equipos
              mid-range. Auditar con DevTools (Rendering → Paint flashing / Layers) antes de mergear una pantalla
              con listas densas.
            </Alert>
          </Kit>

          {/* ───────────────────── Mapa viejo → hos ───────────────────── */}
          <Kit id="mapping" title="Mapa: componente local viejo → primitiva hos">
            <TableShell>
              <thead>
                <tr>
                  <Th>Componente local (antes)</Th>
                  <Th>Primitiva hos (después)</Th>
                  <Th>Dónde vivía</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>7× KPI-tile ad-hoc</Td>
                  <Td>
                    <code className="text-white/70">KpiTile</code>
                  </Td>
                  <Td>Dashboard, CRM, Calendario, Campañas, Growth, Press-kit, Admin</Td>
                </tr>
                <tr>
                  <Td>STATUS_BADGE / STATUS_STYLES</Td>
                  <Td>
                    <code className="text-white/70">Badge</code>
                  </Td>
                  <Td>Campañas, solicitudes, calendario, admin</Td>
                </tr>
                <tr>
                  <Td>Pills de filtro ad-hoc</Td>
                  <Td>
                    <code className="text-white/70">ClayChip</code> / <code className="text-white/70">ClayChipButton</code>
                  </Td>
                  <Td>Filtros de listas y tablas</Td>
                </tr>
                <tr>
                  <Td>
                    <code className="text-white/70">Card</code> con <code className="text-white/70">rounded-*</code>
                  </Td>
                  <Td>
                    <code className="text-white/70">GlassPanel</code>
                  </Td>
                  <Td>Contenedores de contenido en pantallas &quot;soft&quot;</Td>
                </tr>
                <tr>
                  <Td>DataTable genérico / markup de tabla ad-hoc</Td>
                  <Td>
                    <code className="text-white/70">TableShell</code> / <code className="text-white/70">Th</code> /{" "}
                    <code className="text-white/70">Td</code> / <code className="text-white/70">MobileRecordCard</code>
                  </Td>
                  <Td>CRM (extraído de crm/page.tsx)</Td>
                </tr>
                <tr>
                  <Td>~10 vacíos dashed ad-hoc</Td>
                  <Td>
                    <code className="text-white/70">EmptyState</code>
                  </Td>
                  <Td>CRM, Campañas, Calendario, etc.</Td>
                </tr>
                <tr>
                  <Td>2 estilos de alerta (border-2 vs. bg-danger/10)</Td>
                  <Td>
                    <code className="text-white/70">Alert</code>
                  </Td>
                  <Td>Calendario (danger) vs. Correo (bg-danger/10)</Td>
                </tr>
                <tr>
                  <Td>Switch ad-hoc</Td>
                  <Td>
                    <code className="text-white/70">Toggle</code>
                  </Td>
                  <Td>Configuración</Td>
                </tr>
                <tr>
                  <Td>Botones ad-hoc &quot;clay&quot; inline</Td>
                  <Td>
                    <code className="text-white/70">Button variant=&quot;clay&quot; / &quot;clayPrimary&quot;</code>
                  </Td>
                  <Td>Coexiste con <code className="text-white/70">default</code>/<code className="text-white/70">outline</code> durante la migración</Td>
                </tr>
                <tr>
                  <Td>Hero inconsistente (mitad de pantallas sin encabezado)</Td>
                  <Td>
                    <code className="text-white/70">SectionHero</code>
                  </Td>
                  <Td>Todas las pantallas top-level</Td>
                </tr>
              </tbody>
            </TableShell>
          </Kit>
        </div>

        {/* footer decorativo — demuestra MonoLabel suelto */}
        <footer className="mt-14 flex items-center gap-2 border-t border-white/10 pt-5">
          <Sparkles width={13} height={13} className="text-white/30" aria-hidden />
          <MonoLabel className="text-white/30">Fin Fase 0 · Kit — hos-kit</MonoLabel>
          <ShieldCheck width={13} height={13} className="ml-auto text-white/20" aria-hidden />
          <Mail width={13} height={13} className="text-white/20" aria-hidden />
        </footer>
      </div>
    </div>
  );
}
