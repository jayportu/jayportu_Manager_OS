"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Mail, ChevronDown, X } from "lucide-react";
import { BookingForm } from "./booking-form";

interface Props {
  pdfUrl: string;
  pdfFilename: string;
  artistName: string;
  userId: string;
  publicEmail: string;
  whatsapp: string;
}

/**
 * Render full-screen del PDF subido por el DJ.
 * Sin headers/footers de marca para que el PDF se vea tal cual lo diseñó.
 * Botones flotantes mínimos: descargar y abrir form de booking.
 */
export function PdfPressKit({
  pdfUrl,
  pdfFilename,
  artistName,
  userId,
  publicEmail,
  whatsapp,
}: Props) {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col">
      {/* PDF a pantalla completa */}
      <iframe
        src={pdfUrl}
        title={`Press kit ${artistName}`}
        className="flex-1 w-full border-0"
        style={{ minHeight: "100vh" }}
      />

      {/* Botones flotantes */}
      <div
        className="fixed flex flex-col gap-2 z-50"
        style={{
          bottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          right: "1.5rem",
        }}
      >
        <button
          onClick={() => setBookingOpen(true)}
          className="bg-accent text-bg font-semibold px-5 py-3 rounded-full shadow-2xl hover:bg-accent/90 transition-colors inline-flex items-center gap-2 text-sm"
        >
          <Mail className="w-4 h-4" />
          Contactarme
        </button>
        <a
          href={pdfUrl}
          download={pdfFilename || "press-kit.pdf"}
          className="bg-bg-panel border border-border text-fg font-medium px-4 py-2.5 rounded-full shadow-xl hover:border-accent transition-colors inline-flex items-center gap-2 text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar PDF
        </a>
      </div>

      {/* Fallback link si el browser no embed el PDF (mobile Safari a veces) */}
      <noscript>
        <div className="fixed top-4 left-4 right-4 p-3 rounded-lg bg-bg-panel border border-border text-sm z-40">
          Tu navegador no muestra el PDF embebido.{" "}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline"
          >
            Abrir PDF en pestaña nueva
          </a>
          .
        </div>
      </noscript>

      {/* Hint para mobile que no soporta iframe PDF */}
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="md:hidden fixed top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-bg-panel border border-border text-[11px] text-fg-muted inline-flex items-center gap-1 shadow-xl z-40 hover:text-accent transition-colors"
      >
        ¿No se ve el PDF? Abrir en pestaña
        <ChevronDown className="w-3 h-3" />
      </a>

      {/* Modal de booking */}
      {bookingOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setBookingOpen(false)}
        >
          <div
            className="bg-bg border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-bg z-10">
              <h2 className="text-lg font-semibold">
                Contactar a {artistName}
              </h2>
              <button
                onClick={() => setBookingOpen(false)}
                className="p-1 hover:text-accent transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <BookingForm userId={userId} artistName={artistName} />
              <BookingFallbackLinks
                publicEmail={publicEmail}
                whatsapp={whatsapp}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingFallbackLinks({
  publicEmail,
  whatsapp,
}: {
  publicEmail: string;
  whatsapp: string;
}) {
  const ig = "";
  if (!publicEmail && !whatsapp && !ig) return null;
  return (
    <div className="mt-4 pt-4 border-t border-border text-xs text-fg-muted">
      <p className="mb-2">
        O contactá directo por:
      </p>
      <div className="flex flex-wrap gap-2">
        {publicEmail && (
          <Link
            href={`mailto:${publicEmail}`}
            className="text-accent hover:underline"
          >
            {publicEmail}
          </Link>
        )}
        {whatsapp && (
          <Link
            href={`https://wa.me/${whatsapp.replace(/[^0-9+]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            WhatsApp
          </Link>
        )}
      </div>
    </div>
  );
}
