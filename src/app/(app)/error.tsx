"use client";

/**
 * Error boundary temporal para diagnosticar /growth y /dashboard.
 * Muestra mensaje + digest + stack para identificar la causa del crash.
 * Se revertirá tras el fix.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-danger mb-3">
        Error (debug)
      </h1>
      <div className="space-y-3 text-xs">
        {error.digest && (
          <div className="text-fg-muted">
            digest: <code>{error.digest}</code>
          </div>
        )}
        <pre className="bg-bg-subtle border border-border rounded p-3 overflow-auto whitespace-pre-wrap break-words">
          {error.name}: {error.message}
        </pre>
        {error.stack && (
          <pre className="bg-bg-subtle border border-border rounded p-3 overflow-auto whitespace-pre-wrap break-words text-fg-muted">
            {error.stack}
          </pre>
        )}
      </div>
      <button
        onClick={reset}
        className="mt-4 px-3 py-1.5 text-sm rounded border border-border hover:bg-bg-subtle"
      >
        Reintentar
      </button>
    </div>
  );
}
