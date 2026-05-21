import type { Config } from "tailwindcss";

/**
 * JAY Manager OS — Studio Dark theme
 * Paleta basada en el press kit oficial de JAY PORTU
 * Acento amarillo #E8B923 solo en CTAs, badges, números clave
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
        // Studio Dark paleta
        bg: {
          DEFAULT: "#0F0F11",
          panel: "#18181B",
          subtle: "#0A0A0C",
        },
        border: {
          DEFAULT: "#27272A",
          strong: "#3F3F46",
        },
        fg: {
          DEFAULT: "#FAFAFA",
          muted: "#A1A1AA",
          subtle: "#71717A",
        },
        accent: {
          DEFAULT: "#E8B923",
          soft: "rgba(232, 185, 35, 0.15)",
          ring: "rgba(232, 185, 35, 0.3)",
        },
        // Estados semánticos
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
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
        // Iceland para display (logo + headings grandes)
        display: ["var(--font-iceland)", "system-ui", "sans-serif"],
        // Inter para body
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
