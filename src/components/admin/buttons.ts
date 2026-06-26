/**
 * Escala de botones del admin — coherente, color = tipo de acción.
 * Usar con: className={adminBtn("danger")}.
 */
const BASE =
  "inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANTS = {
  /** Acción principal / positiva (aprobar, verificar, reactivar). */
  primary: "bg-orange text-ink border-border hover:bg-ink hover:text-orange",
  /** Acción secundaria fuerte (invitar, enviar). */
  ink: "bg-ink text-white border-border hover:bg-orange hover:text-ink",
  /** Precaución, reversible (suspender). */
  warn: "text-warning border-warning bg-warning/5 hover:bg-warning hover:text-fg",
  /** Destructivo reversible (banear, rechazar, revocar). */
  danger: "text-danger border-danger bg-danger/5 hover:bg-danger hover:text-white dark:hover:text-ink",
  /** Destructivo irreversible (eliminar). */
  dangerSolid: "bg-danger text-white dark:text-ink border-danger hover:opacity-90",
  /** Neutral (refrescar, filtrar, copiar). */
  neutral: "text-fg border-border bg-white hover:bg-cream",
} as const;

export type AdminBtnVariant = keyof typeof VARIANTS;

export function adminBtn(variant: AdminBtnVariant = "neutral"): string {
  return `${BASE} ${VARIANTS[variant]}`;
}
