"use client";

/**
 * Sprint S19 — Form de checkout MP.
 *
 * Carga el SDK Web de MercadoPago (https://sdk.mercadopago.com/js/v2),
 * lo inicializa con NEXT_PUBLIC_MP_PUBLIC_KEY, recoge datos de tarjeta
 * y genera un card_token client-side (los datos viajan directo a MP,
 * no pasan por nuestros servers).
 *
 * Al obtener el token, lo manda a subscribeAction que crea la
 * preapproval. Si MP rechaza recurrencia → modal de fallback que
 * sugiere otra tarjeta o modo manual (TODO en F4).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeAction } from "./actions";
import { Loader2 } from "lucide-react";

interface Props {
  userEmail: string;
}

type Status =
  | "idle"
  | "tokenizing"
  | "subscribing"
  | "success"
  | "error"
  | "needs_manual";

export function CheckoutForm({ userEmail }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Form fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [docNumber, setDocNumber] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "tokenizing" || status === "subscribing") return;

    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (!publicKey) {
      setErrorMsg("Configuración MP incompleta (falta public key).");
      setStatus("error");
      return;
    }

    setErrorMsg(null);
    setStatus("tokenizing");

    // 1. Generar card_token con MP REST API directo (sin SDK).
    //    Los datos van cliente → MP API → token, sin pasar por nuestro
    //    server. Compliance PCI SAQ-A-EP (merchant ve pero no almacena).
    let tokenId: string;
    try {
      const yearFull =
        expYear.length === 2 ? `20${expYear}` : expYear;
      const tokenResp = await fetch(
        `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_number: cardNumber.replace(/\s+/g, ""),
            cardholder: {
              name: cardholderName,
              identification: {
                type: "RUT",
                number: docNumber.replace(/[^0-9kK]/g, ""),
              },
            },
            expiration_month: parseInt(expMonth, 10),
            expiration_year: parseInt(yearFull, 10),
            security_code: securityCode,
          }),
        }
      );
      const tokenData = (await tokenResp.json()) as {
        id?: string;
        message?: string;
        cause?: Array<{ code?: string; description?: string }>;
      };
      if (!tokenResp.ok || !tokenData.id) {
        const reason =
          tokenData.cause?.[0]?.description ||
          tokenData.message ||
          `No se pudo procesar la tarjeta (HTTP ${tokenResp.status}).`;
        setErrorMsg(reason);
        setStatus("error");
        return;
      }
      tokenId = tokenData.id;
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error de red");
      setStatus("error");
      return;
    }

    // 2. Llamar server action que crea la preapproval
    setStatus("subscribing");
    startTransition(async () => {
      const res = await subscribeAction({ cardTokenId: tokenId });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/configuracion/suscripcion"), 600);
        router.refresh();
      } else if (res.needsManualMode) {
        setStatus("needs_manual");
        setErrorMsg(res.error);
      } else {
        setStatus("error");
        setErrorMsg(res.error);
      }
    });
  }

  const busy = status === "tokenizing" || status === "subscribing";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="bg-white border-2 border-ink p-5 space-y-3"
      >
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-1">
          — DATOS DE TARJETA
        </div>

        <input
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="Número de tarjeta"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          required
          maxLength={23}
          disabled={busy}
          className="w-full h-11 px-3 border-2 border-ink bg-cream font-mono text-[12px] focus:outline-none focus:border-orange"
        />

        <input
          type="text"
          autoComplete="cc-name"
          placeholder="Nombre como aparece en la tarjeta"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          required
          disabled={busy}
          className="w-full h-11 px-3 border-2 border-ink bg-cream font-mono text-[12px] focus:outline-none focus:border-orange"
        />

        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM"
            value={expMonth}
            onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, ""))}
            required
            maxLength={2}
            disabled={busy}
            className="w-full h-11 px-3 border-2 border-ink bg-cream font-mono text-[12px] text-center focus:outline-none focus:border-orange"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="AA"
            value={expYear}
            onChange={(e) => setExpYear(e.target.value.replace(/\D/g, ""))}
            required
            maxLength={4}
            disabled={busy}
            className="w-full h-11 px-3 border-2 border-ink bg-cream font-mono text-[12px] text-center focus:outline-none focus:border-orange"
          />
          <input
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="CVV"
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ""))}
            required
            maxLength={4}
            disabled={busy}
            className="w-full h-11 px-3 border-2 border-ink bg-cream font-mono text-[12px] text-center focus:outline-none focus:border-orange"
          />
        </div>

        <input
          type="text"
          placeholder="RUT (sin puntos, con guión)"
          value={docNumber}
          onChange={(e) => setDocNumber(e.target.value)}
          required
          maxLength={12}
          disabled={busy}
          className="w-full h-11 px-3 border-2 border-ink bg-cream font-mono text-[12px] focus:outline-none focus:border-orange"
        />

        <p className="text-[11px] text-fg-muted">
          🔒 Los datos viajan cifrados directo a MercadoPago. DROP no los guarda.
        </p>

        {errorMsg && (
          <div
            className={`border-2 p-3 text-sm ${
              status === "needs_manual"
                ? "border-warning bg-warning/10 text-fg"
                : "border-danger bg-danger/10 text-danger"
            }`}
          >
            {status === "needs_manual" ? (
              <>
                <strong>Tu tarjeta no permite cobros recurrentes.</strong>
                <br />
                Prueba con otra tarjeta o escríbeme a hola@dropgigs.com para
                activar el modo manual mes-a-mes.
              </>
            ) : (
              errorMsg
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 inline-flex items-center justify-center gap-2 bg-ink text-orange border-2 border-ink hover:bg-orange hover:text-ink disabled:opacity-50 disabled:hover:bg-ink disabled:hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {status === "tokenizing" && "Procesando tarjeta…"}
          {status === "subscribing" && "Activando suscripción…"}
          {status === "success" && "¡Listo! Redirigiendo…"}
          {(status === "idle" || status === "error" || status === "needs_manual") &&
            "Confirmar pago · $10.000 CLP →"}
        </button>

        <p className="text-[10px] text-fg-subtle text-center font-mono uppercase tracking-wider">
          Suscriptor: {userEmail}
        </p>
      </form>
    </>
  );
}
