import type { Config } from "tailwindcss";

/**
 * DROP — Type Beat theme (brutalist poster)
 * Paleta: CREAM (#F4EFE7) + INK (#0A0A0A) + ORANGE (#E85A0C, canónico).
 * Sin gradientes, sin tonos intermedios. Bordes 2px, sin border-radius
 * por defecto (border-radius global se desactiva via --radius: 0;
 * el `rounded-full` sigue funcionando para avatares).
 *
 * NOTA: los nombres de los tokens (bg, fg, accent...) se mantienen
 * idénticos a la versión Studio Dark anterior para preservar TODAS las
 * clases existentes en la app — solo cambian los valores que apuntan.
 */
const config: Config = {
  // El tema dark se activa con [data-theme="dark"] en <html> (no por .class).
  // Habilita el variant `dark:` para los pocos casos que necesitan texto
  // distinto por tema (p.ej. fills semánticos: claros en dark → texto oscuro).
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // DROP paleta — ahora vía CSS variables (definidas en globals.css :root).
        // Formato canal "rgb(var / <alpha-value>)" para conservar bg-x/50 etc.
        // Mismos valores que antes; el tema dark sobreescribe las vars.
        bg: {
          DEFAULT: "rgb(var(--drop-bg) / <alpha-value>)",        // CREAM — fondo app
          panel: "rgb(var(--drop-bg-panel) / <alpha-value>)",     // paneles / cards
          subtle: "rgb(var(--drop-bg-subtle) / <alpha-value>)",   // hover tablas / fondos 2º
          dark: "rgb(var(--drop-bg-dark) / <alpha-value>)",       // INK — sidebar / barras
        },
        border: {
          DEFAULT: "rgb(var(--drop-border) / <alpha-value>)",
          strong: "rgb(var(--drop-border-strong) / <alpha-value>)",
        },
        fg: {
          DEFAULT: "rgb(var(--drop-fg) / <alpha-value>)",         // texto principal
          muted: "rgb(var(--drop-fg-muted) / <alpha-value>)",     // texto secundario
          subtle: "rgb(var(--drop-fg-subtle) / <alpha-value>)",   // texto terciario
        },
        accent: {
          DEFAULT: "rgb(var(--drop-accent) / <alpha-value>)",     // ORANGE — acento único
          soft: "var(--drop-accent-soft)",
          ring: "var(--drop-accent-ring)",
        },
        // Cream + ink + orange expuestos directamente
        cream: "rgb(var(--drop-cream) / <alpha-value>)",
        ink: "rgb(var(--drop-ink) / <alpha-value>)",
        orange: "rgb(var(--drop-orange) / <alpha-value>)",
        // Estados semánticos (paleta DROP)
        success: "rgb(var(--drop-success) / <alpha-value>)",
        warning: "rgb(var(--drop-warning) / <alpha-value>)",
        danger: "rgb(var(--drop-danger) / <alpha-value>)",
        info: "rgb(var(--drop-info) / <alpha-value>)",
        // shadcn vars compat (las usamos via CSS vars en globals.css)
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        // Anton para display (wordmark, KPI numbers, headers brutalist)
        display: ["var(--font-anton)", "Impact", "system-ui", "sans-serif"],
        // Inter para body
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // Space Mono para labels, tickers, data
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // Todos los rounded-* derivan de --radius (que es 0 en DROP)
        // EXCEPTO rounded-full (avatares circulares) y rounded-none.
        none: "0",
        sm: "calc(var(--radius) * 0.5)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "calc(var(--radius) * 1.5)",
        xl: "calc(var(--radius) * 2)",
        "2xl": "calc(var(--radius) * 3)",
        "3xl": "calc(var(--radius) * 4)",
        full: "9999px",
      },
      borderWidth: {
        DEFAULT: "1px",
        "2": "2px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ticker-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "logo-strobe": {
          "0%, 86%, 100%": { transform: "translate(0, 0)", textShadow: "none" },
          "87%": {
            transform: "translate(-2px, 1px)",
            textShadow: "2px 0 #E85A0C, -2px 0 #00E0FF",
          },
          "89%": {
            transform: "translate(2px, -1px)",
            textShadow: "-2px 0 #E85A0C, 2px 0 #00E0FF",
          },
          "91%": {
            transform: "translate(-1px, 0)",
            textShadow: "2px 0 #E85A0C, -2px 0 #00E0FF",
          },
          "93%": { transform: "translate(0, 0)", textShadow: "none" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ticker-scroll": "ticker-scroll 28s linear infinite",
        blink: "blink 1.5s ease-in-out infinite",
        "logo-strobe": "logo-strobe 3.5s steps(1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
