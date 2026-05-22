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
