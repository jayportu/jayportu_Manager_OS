import type { Metadata } from "next";
import { Iceland, Inter } from "next/font/google";
import "./globals.css";

const iceland = Iceland({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-iceland",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JAY Manager OS",
  description: "Manager OS para DJs: CRM, press kit público, growth tracking, calendario y plantillas. Costo $0.",
  manifest: "/manifest.json",
  applicationName: "Manager OS",
  appleWebApp: {
    capable: true,
    title: "Manager OS",
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
  themeColor: "#0F0F11",
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
    <html lang="es" className="dark">
      <body
        className={`${iceland.variable} ${inter.variable} font-sans bg-bg text-fg antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
