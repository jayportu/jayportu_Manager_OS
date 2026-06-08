import fs from "fs";
const F = process.argv[2];
const obj = JSON.parse(fs.readFileSync(F, "utf8"));
const f = (obj.result && obj.result.findings) || obj.findings;
const R1 = ["Conteo de follow-ups topado", "Buscar con coma", "Barra de tokens queda desactualizada", "Agendar CRASHEA", "Backfill por email no matchea", "claimBookingsByEmail no matchea"];
const R2 = ["setPromotedContactId ignora errores", "El cron horario pisa la clasificaci", "Paywall sin salida si MP", "capados a 200 auth users", "cuenta FILAS, no usuarios"];
const R3 = ["addFollowUp no muestra error", "fallan en silencio", "Promote pierde el tel", "no lo son", "no aplica ningun .order", "del inbox llevan al directorio", "del directorio apuntan a drop.dj", "hardcodeado para cualquier pais", "Booking form se puede enviar sin email", "se pinta verde"];
const R4 = ["sub-cuenta sobre 500", "la lista muestra campa", "el delta es vs el snapshot anterior", "descarta snapshots con followers", "muestra el sync de Google Calendar", "dentro de la card descarta", "puede lanzar y crashear", "available_note nunca se muestra", "no manda el email de invitaci"];
const R5 = ["no refleja las URLs normalizadas", "se agenda desde la fecha vieja", "no suman en ning", "invisible en mobile"];
const R6 = ["no valida beta expirada", "Eventos all-day se muestran un d", "se ancla a hora UTC", "no llama a ning", "Conteos por usuario truncados"];
const R7 = ["cambian status SIN crear"];
const R8 = ["consume el token del DJ aunque"];
const R9 = ["firma con marca incorrecta", "Texto de marca obsoleto", "valida email solo por", "Color del player de SoundCloud"];
const R10 = ["nunca desaparece", "no se ve deshabilitado", "No existe error.tsx", "availability_updated puede renderizar", "El copy promete", "Si el email falla"];
const R11 = ["no revalidan /crm", "Sin feedback de carga al promover", "no filtra por user_id", "parece una acci"];
const R12 = ["no validan beta activa", "posición de cursor obsoleta", "trata CUALQUIER error"];
const R13 = ["Inputs controlados sin fallback", "filtro de tags se pierde", "no recalcula 'faltan datos'", "es dead-feature", "calculando…' permanente", "es fire-and-forget", "dos syncs concurrentes", "cuenta todos los procesados", "reset mensual de tokens de pitch se calcula en UTC", "no muestran si el aviso por email", "Deteccion de 'email ya registrado'", "ignora el ?next=", "escribe en DB durante el render"];
const R14 = ["writes/queries admin (service_role) en CADA navegacion"];
const R15 = ["N+1 a Gmail API"];
const prOf = (x) => R1.some((k) => x.title.includes(k)) ? "#17" : R2.some((k) => x.title.includes(k)) ? "#18" : R3.some((k) => x.title.includes(k)) ? "#19" : R4.some((k) => x.title.includes(k)) ? "#20" : R5.some((k) => x.title.includes(k)) ? "#21" : R6.some((k) => x.title.includes(k)) ? "#22" : R7.some((k) => x.title.includes(k)) ? "#23" : R8.some((k) => x.title.includes(k)) ? "#24" : R9.some((k) => x.title.includes(k)) ? "#25" : R10.some((k) => x.title.includes(k)) ? "#26" : R11.some((k) => x.title.includes(k)) ? "#27" : R12.some((k) => x.title.includes(k)) ? "#28" : R13.some((k) => x.title.includes(k)) ? "#29" : R14.some((k) => x.title.includes(k)) ? "#30" : R15.some((k) => x.title.includes(k)) ? "#31" : null;
const order = { high: 0, medium: 1, low: 2 };
f.sort((a, b) => order[a.severity] - order[b.severity]);
const sevLabel = { high: "\u{1F534} ALTO", medium: "\u{1F7E1} MEDIO", low: "⚪ BAJO" };
const done = f.filter(prOf).length;
let out = "# QA · hallazgos tab por tab (workflow 2026-06-07)\n\n";
out += `Total: ${f.length}. Arreglados: ${done}/77 — 11 ALTOS + 30 medios + ${done - 41} bajos (PR #17-#29). Checkbox = arreglado.\n\n`;
for (const sev of ["high", "medium", "low"]) {
  const items = f.filter((x) => x.severity === sev);
  const fixed = items.filter(prOf).length;
  out += `\n## ${sevLabel[sev]} (${items.length}${fixed ? ` · ${fixed} ✅` : ""})\n\n`;
  for (const x of items) {
    const pr = prOf(x);
    out += `- [${pr ? "x" : " "}] **${x.tab} · ${x.title}** _(${x.kind})_${pr ? " ✅ PR " + pr : ""}\n  - \u{1F4CD} \`${x.location}\`\n`;
    if (x.suggested_fix) out += `  - \u{1F527} ${x.suggested_fix}\n`;
  }
}
fs.writeFileSync("QA_FINDINGS.md", out);
console.log("QA_FINDINGS.md ·", done, "arreglados de 77");
