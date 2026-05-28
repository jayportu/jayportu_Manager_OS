import type { Config } from "tailwindcss";

/**
 * DROP — Type Beat theme (brutalist poster)
 * Paleta: CREAM (#F4EFE7) + INK (#0A0A0A) + ORANGE (#FF5C00).
 * Sin gradientes, sin tonos intermedios. Bordes 2px, sin border-radius
 * por defecto (border-radius global se desactiva via --radius: 0;
 * el `rounded-full` sigue funcionando para avatares).
 *
 * NOTA: los nombres de los tokens (bg, fg, accent...) se mantienen
 * idénticos a la versión Studio Dark anterior para preservar TODAS las
 * clases existentes en la app — solo cambian los valores que apuntan.
 */
const config: Config = {
  darkMode: ["class"],
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
        // DROP paleta — tokens preservan nomenclatura anterior
        bg: {
          DEFAULT: "#F4EFE7",   // CREAM — fondo principal de la app
          panel: "#FFFFFF",      // paneles / cards sobre el cream
          subtle: "#E8E1D3",     // cream más oscuro — hover de tablas, fondos secundarios
          dark: "#0A0A0A",       // INK — sidebar / barras oscuras (usa bg-bg-dark si necesitas oscuro)
        },
        border: {
          DEFAULT: "#0A0A0A",    // INK — bordes 2px estilo Type Beat
          strong: "#0A0A0A",
        },
        fg: {
          DEFAULT: "#0A0A0A",    // INK — texto principal
          muted: "#3A3A3A",      // texto secundario (más oscuro para contraste sobre cream)
          subtle: "#6B6B6B",     // texto terciario
        },
        accent: {
          DEFAULT: "#FF5C00",    // ORANGE — acento único
          soft: "rgba(255, 92, 0, 0.12)",
          ring: "rgba(255, 92, 0, 0.35)",
        },
        // Cream + ink + orange expuestos directamente
        cream: "#F4EFE7",
        ink: "#0A0A0A",
        orange: "#FF5C00",
        // Estados semánticos (paleta DROP)
        success: "#1F8A5C",
        warning: "#C77A00",
        danger: "#C53030",
        info: "#2B5BA8",
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
            textShadow: "2px 0 #FF5C00, -2px 0 #00E0FF",
          },
          "89%": {
            transform: "translate(2px, -1px)",
            textShadow: "-2px 0 #FF5C00, 2px 0 #00E0FF",
          },
          "91%": {
            transform: "translate(-1px, 0)",
            textShadow: "2px 0 #FF5C00, -2px 0 #00E0FF",
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
