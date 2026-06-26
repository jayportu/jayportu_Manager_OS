import type { Metadata } from "next";
import { Anton, Inter, Space_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SiteTracker } from "@/components/site-tracker";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

// Satoshi (Fontshare, licencia gratuita con uso comercial) — tipografía del
// logo/wordmark DROP. Autohospedada (woff2) para performance y cero FOUC.
// Solo el peso Black (900); los titulares/KPIs siguen en Anton.
const satoshi = localFont({
  src: "../fonts/Satoshi-Black.woff2",
  variable: "--font-satoshi",
  weight: "900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DROP. — The DJ OS",
  description:
    "DROP. Manager OS para DJs: CRM, press kit público, growth tracking, calendario y plantillas. El sistema operativo del DJ.",
  // metadataBase: necesario para que las URLs de OG/twitter resuelvan a
  // absolutas (Instagram/WhatsApp las exigen así). Default OG para todo el sitio.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com"
  ),
  openGraph: {
    title: "DROP. — The DJ OS",
    description:
      "El sistema operativo para DJs independientes. CRM, press kit, bookings, calendario. Bookers: directorio de DJs en LATAM.",
    type: "website",
    siteName: "DROP.",
    images: [
      { url: "/og.png", width: 1200, height: 630, alt: "DROP. — The DJ OS" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DROP. — The DJ OS",
    description: "El sistema operativo para DJs independientes.",
    images: ["/og.png"],
  },
  manifest: "/manifest.json",
  applicationName: "DROP",
  appleWebApp: {
    capable: true,
    title: "DROP",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${anton.variable} ${inter.variable} ${spaceMono.variable} ${satoshi.variable} font-sans bg-bg text-fg antialiased min-h-screen`}
      >
        {/* Flag de preview del tema dark (rebrand, Fase 1): se activa con la
            cookie `drop-theme=dark`. Sin cookie → light (lo que ven los usuarios).
            Script inline para evitar FOUC y no forzar render dinámico. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(/(?:^|;\\s*)drop-theme=dark/.test(document.cookie))document.documentElement.setAttribute('data-theme','dark')}catch(e){}",
          }}
        />
        {children}
        {/* Vercel Web Analytics — tráfico anónimo (visitas, páginas, referrers).
            No-op hasta habilitar Web Analytics en el dashboard de Vercel. */}
        <Analytics />
        {/* Beacon propio → site_events → panel /admin/trafico (registrado vs anónimo). */}
        <SiteTracker />
      </body>
    </html>
  );
}
