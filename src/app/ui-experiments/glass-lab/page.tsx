/**
 * Glass Lab — comparación aislada de intensidades del efecto glass (Hybrid OS).
 * Localhost-only (dev). NO es parte de la app; sirve para que el owner elija la
 * intensidad antes de aplicar el refuerzo global a globals.css + (app)/layout.tsx.
 * Cada variante replica el recipe real: base #0B0B0B + campo ambiente detrás +
 * paneles con backdrop-filter: blur (que refractan el ambiente).
 */

import { CalendarDays, Users, Wallet, TrendingUp } from "lucide-react";

type Variant = {
  key: string;
  label: string;
  desc: string;
  ambient: string;
  panelBg: string;
  panelBorder: string;
  blur: string;
  topEdge: string; // inset highlight opacity
  shadow: string;
};

const VARIANTS: Variant[] = [
  {
    key: "A",
    label: "A · Actual (sutil)",
    desc: "Ambiente solo en esquinas · panel blanco 9%→3.5% · blur 20 · borde 16%",
    ambient:
      "radial-gradient(75% 55% at 88% -8%, rgba(232,90,12,0.17), transparent 60%)," +
      "radial-gradient(60% 55% at -8% 6%, rgba(232,90,12,0.13), transparent 55%)," +
      "radial-gradient(55% 60% at 55% 118%, rgba(110,168,254,0.05), transparent 60%)",
    panelBg: "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))",
    panelBorder: "rgba(255,255,255,0.16)",
    blur: "20px",
    topEdge: "0.20",
    shadow: "0 12px 44px rgba(0,0,0,.38)",
  },
  {
    key: "B",
    label: "B · Medio",
    desc: "Ambiente + glow central · panel blanco 14%→5.5% · blur 24 · borde 22%",
    ambient:
      "radial-gradient(70% 50% at 85% -5%, rgba(232,90,12,0.22), transparent 60%)," +
      "radial-gradient(60% 55% at -8% 8%, rgba(232,90,12,0.16), transparent 55%)," +
      "radial-gradient(95% 75% at 50% 28%, rgba(232,90,12,0.07), transparent 72%)," +
      "radial-gradient(55% 60% at 55% 118%, rgba(110,168,254,0.08), transparent 60%)",
    panelBg: "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.055))",
    panelBorder: "rgba(255,255,255,0.22)",
    blur: "24px",
    topEdge: "0.28",
    shadow: "0 14px 48px rgba(0,0,0,.42)",
  },
  {
    key: "C",
    label: "C · Fuerte",
    desc: "Ambiente amplio y brillante · panel blanco 20%→8% · blur 30 · borde 30%",
    ambient:
      "radial-gradient(78% 55% at 85% -5%, rgba(232,90,12,0.30), transparent 60%)," +
      "radial-gradient(66% 55% at -8% 10%, rgba(232,90,12,0.22), transparent 58%)," +
      "radial-gradient(105% 82% at 50% 24%, rgba(232,90,12,0.11), transparent 74%)," +
      "radial-gradient(60% 62% at 55% 120%, rgba(110,168,254,0.11), transparent 62%)",
    panelBg: "linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.08))",
    panelBorder: "rgba(255,255,255,0.30)",
    blur: "30px",
    topEdge: "0.38",
    shadow: "0 16px 52px rgba(0,0,0,.46)",
  },
];

const KPIS = [
  { label: "Contactos", value: "312", sub: "+18 este mes", icon: Users, accent: false },
  { label: "Gigs · mes", value: "7", sub: "2 sin confirmar", icon: CalendarDays, accent: false },
  { label: "Ingresos", value: "$4.2M", sub: "+12%", icon: Wallet, accent: false },
  { label: "Seguidores", value: "24.8K", sub: "+1.4K (30d)", icon: TrendingUp, accent: true },
];

const ROWS = [
  { t: "Club La Feria", s: "Confirmar fecha 26 jul", tag: "HOY" },
  { t: "Bresh BA", s: "Enviar rider + fee", tag: "MAÑANA" },
  { t: "Sunsetkidd", s: "Follow-up post-evento", tag: "EN 2 DÍAS" },
];

function Panel({ v, className, children }: { v: Variant; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        borderRadius: 16,
        border: `1px solid ${v.panelBorder}`,
        background: v.panelBg,
        backdropFilter: `blur(${v.blur})`,
        WebkitBackdropFilter: `blur(${v.blur})`,
        boxShadow: `${v.shadow}, inset 0 1px 0 rgba(255,255,255,${v.topEdge})`,
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,.45)" }}>
      {children}
    </div>
  );
}

function VariantShell({ v }: { v: Variant }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: 22, color: "#fff" }}>{v.label}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontFamily: "var(--font-mono, monospace)" }}>{v.desc}</div>
      </div>

      {/* "Device": base oscura + ambiente detrás + contenido con glass encima */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 24, background: "#0B0B0B", border: "1px solid rgba(255,255,255,.07)" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: v.ambient }} />
        <div style={{ position: "relative", padding: 28 }}>
          <Mono>— Inicio · Hoy</Mono>
          <div style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: 40, lineHeight: 1, color: "#fff", margin: "6px 0 20px" }}>
            Buenas, Sofía<span style={{ color: "#E85A0C" }}>.</span>
          </div>

          {/* KPI tiles (clay) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            {KPIS.map((k) => (
              <div
                key={k.label}
                style={
                  k.accent
                    ? { borderRadius: 16, padding: 16, background: "#E85A0C", color: "#0B0B0B", boxShadow: "6px 6px 15px #060606, -4px -4px 11px #2a2a2a" }
                    : { borderRadius: 16, padding: 16, background: "#1b1b1b", color: "#fff", boxShadow: "7px 7px 16px #070707, -6px -6px 13px #242424" }
                }
              >
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: k.accent ? 0.7 : 0.45 }}>— {k.label}</div>
                <div style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: 30, lineHeight: 1, marginTop: 6 }}>{k.value}</div>
                <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, marginTop: 8, color: k.accent ? "rgba(11,11,11,.7)" : "#70C98B", textTransform: "uppercase", letterSpacing: ".05em" }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Glass panel — el que muestra el efecto */}
          <Panel v={v}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <Mono>Seguimientos pendientes</Mono>
              <Mono>4 hoy/pronto</Mono>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ROWS.map((r) => (
                <div key={r.t} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: "10px 12px" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: "#E85A0C", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{r.t}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)" }}>{r.s}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "#E85A0C", border: "1px solid rgba(232,90,12,.4)", borderRadius: 999, padding: "4px 10px" }}>{r.tag}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Segundo panel glass, más chico, para ver dos capas */}
          <Panel v={v} className="" >
            <Mono>Top contactos</Mono>
            <div style={{ marginTop: 10, display: "flex", gap: 16, flexWrap: "wrap", color: "rgba(255,255,255,.8)", fontSize: 13 }}>
              <span>Matías Rivas · 92</span>
              <span>Cata Fuentes · 88</span>
              <span>Dj Nano · 81</span>
            </div>
          </Panel>
          <div style={{ height: 12 }} />
        </div>
      </div>
    </div>
  );
}

export default async function GlassLabPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const sp = await searchParams;
  const sel = (sp?.v || "A").toUpperCase();
  const v = VARIANTS.find((x) => x.key === sel) ?? VARIANTS[0];
  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0B", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontFamily: "var(--font-display, sans-serif)", fontSize: 28, color: "#fff" }}>Glass Lab</div>
          <div style={{ display: "flex", gap: 8 }}>
            {VARIANTS.map((x) => (
              <a
                key={x.key}
                href={`?v=${x.key}`}
                style={{
                  fontFamily: "var(--font-mono, monospace)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                  padding: "6px 14px", borderRadius: 999, textDecoration: "none",
                  border: x.key === v.key ? "1px solid #E85A0C" : "1px solid rgba(255,255,255,.15)",
                  background: x.key === v.key ? "#E85A0C" : "transparent",
                  color: x.key === v.key ? "#0B0B0B" : "rgba(255,255,255,.7)",
                }}
              >
                {x.key}
              </a>
            ))}
          </div>
        </div>
        <VariantShell v={v} />
      </div>
    </div>
  );
}
