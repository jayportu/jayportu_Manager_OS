"use client";

/**
 * Boundary de error a nivel raíz. Reporta a Sentry (no-op si está dormido) y
 * muestra una pantalla simple en vez de un crash en blanco. Solo se activa
 * ante un error que rompe el layout raíz (raro).
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4EFE7",
          color: "#0A0A0A",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div
            style={{
              fontFamily: "Impact, system-ui, sans-serif",
              fontSize: 48,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            UPS<span style={{ color: "#FF5C00" }}>.</span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.5, margin: "16px 0 24px" }}>
            Algo se rompió de nuestro lado. Ya quedamos avisados. Prueba de
            nuevo en un momento.
          </p>
          <button
            onClick={() => reset()}
            style={{
              border: "2px solid #0A0A0A",
              background: "#FF5C00",
              color: "#0A0A0A",
              padding: "10px 20px",
              fontFamily: "Consolas,'Courier New',monospace",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
