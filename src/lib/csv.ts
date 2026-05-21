/**
 * Parser CSV simple (sin librería externa).
 * Soporta: comillas dobles, comas dentro de comillas, líneas con \n o \r\n.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        // Escaped quote ""
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (c === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }

    if (c === "\r") {
      i++;
      continue;
    }

    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }

    cell += c;
    i++;
  }

  // Last cell / row
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Filter empty trailing rows
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
