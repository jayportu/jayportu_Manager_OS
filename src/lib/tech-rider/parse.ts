/**
 * Parser de tech rider en texto libre → items estructurados.
 *
 * El DJ edita su rider como texto libre (un equipo por línea) en
 * /configuracion — formato estándar que prefiere escribir. Este parser
 * convierte ese texto en `TechRiderItem[]` para alimentar el StagePlot
 * (diagrama de cabina) y las tarjetas visuales de gear en el press kit,
 * sin pedirle al DJ ningún formulario estructurado.
 *
 * Es best-effort: clasifica por palabras clave y extrae cantidad. Lo que no
 * reconoce cae en "otros" y se sigue mostrando como ítem.
 */
import type { TechRiderItem, RiderCategory } from "@/types/database";

interface CategoryRule {
  cat: RiderCategory;
  keywords: string[];
}

// El orden importa: la primera regla cuyo keyword aparezca en la línea gana.
// Mixer va antes que reproducción para que "DJM"/"RMX" no caigan en repro.
const RULES: CategoryRule[] = [
  {
    cat: "mixer",
    keywords: [
      "djm", "mixer", "mezclador", "xone", "rmx", "v10", "a9", "model 1",
      "model1", "rotary", "isolator", "playdifferently", "mixars",
      "rane seventy", "rane mp", "e1", "efx",
    ],
  },
  {
    cat: "reproduccion",
    keywords: [
      "cdj", "xdj", "opus", "turntable", "tornamesa", "technics", "sl-1200",
      "sl1200", "sl 1200", "plx", "vinilo", "vinyl", "plato", "reproductor",
      "dvs", "rekordbox", "serato", "controlador", "ddj", "deck", "phase",
    ],
  },
  {
    cat: "monitores",
    keywords: [
      "monitor", "booth", "side-fill", "sidefill", "side fill", "cuña",
      "cuna", "wedge", "in-ear", "in ear", "iem", "parlante", "altavoz",
      "sub", "subwoofer", "l-acoustics", "d&b", "funktion", "void", "pa ",
    ],
  },
  {
    cat: "power_cables",
    keywords: [
      "power", "energia", "energía", "corriente", "cable", "regleta",
      "enchufe", "toma", "220", "rca", "adaptador", "extension", "extensión",
      "ups", "alargador",
    ],
  },
  {
    cat: "hospitality",
    keywords: [
      "agua", "toalla", "cerveza", "trago", "vodka", "whisky", "bebida",
      "comida", "catering", "snack", "fruta", "pase", "invitado", "guest",
      "camarin", "camarín", "hotel", "alojamiento", "transporte", "traslado",
      "uber", "estaciona", "hospitality",
    ],
  },
];

// "2x ", "2 x", "2× ", "x2 ", "(2)" al inicio de la línea.
const LEADING_QTY = /^\s*(?:(\d{1,2})\s*[x×]\s*|x\s*(\d{1,2})\s*|\((\d{1,2})\)\s*)/i;
// Nota entre paréntesis al final: "... (linked)".
const TRAILING_NOTE = /\s*\(([^)]*)\)\s*$/;

function classify(name: string): RiderCategory {
  const lower = ` ${name.toLowerCase()} `;
  for (const rule of RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.cat;
  }
  return "otros";
}

/**
 * Convierte texto libre (un equipo por línea) en items estructurados.
 * @param text  ej: "2x CDJ-3000 (linked)\n1x DJM-900NXS\nMonitor booth"
 */
export function parseRiderText(
  text: string | null | undefined,
  opts: { isAlternative?: boolean } = {}
): TechRiderItem[] {
  if (!text) return [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: TechRiderItem[] = [];
  lines.forEach((rawLine, idx) => {
    let line = rawLine;

    // Cantidad
    let quantity = 1;
    const qtyMatch = line.match(LEADING_QTY);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1] || qtyMatch[2] || qtyMatch[3] || "1", 10);
      line = line.slice(qtyMatch[0].length).trim();
    }

    // Nota entre paréntesis al final
    let note = "";
    const noteMatch = line.match(TRAILING_NOTE);
    if (noteMatch) {
      note = noteMatch[1].trim();
      line = line.replace(TRAILING_NOTE, "").trim();
    }

    if (!line) return; // línea quedó vacía tras limpiar

    const now = "1970-01-01T00:00:00Z";
    items.push({
      id: `parsed-${idx}`,
      user_id: "",
      category: classify(line),
      name: line,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      alt_text: "",
      note,
      sort_order: idx,
      is_alternative: opts.isAlternative ?? false,
      created_at: now,
      updated_at: now,
    });
  });

  return items;
}

/** True si los items alcanzan para dibujar una cabina (repro/mixer/monitor). */
export function hasCabinItems(items: TechRiderItem[]): boolean {
  return items.some(
    (i) =>
      i.category === "reproduccion" ||
      i.category === "mixer" ||
      i.category === "monitores"
  );
}
