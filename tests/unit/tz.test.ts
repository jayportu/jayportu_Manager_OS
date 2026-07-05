/**
 * Unit tests de src/lib/tz.ts — conversiones Santiago↔UTC (CLT/CLST).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  santiagoToUtcISO,
  santiagoToday,
  santiagoDay,
  santiagoMonthStartUtcISO,
  santiagoNextMonthStartUtcISO,
} from "../../src/lib/tz.ts";

test("santiagoToUtcISO: invierno (CLT, UTC-4)", () => {
  assert.equal(santiagoToUtcISO("2026-06-10", "22:00:00"), "2026-06-11T02:00:00.000Z");
});

test("santiagoToUtcISO: verano (CLST, UTC-3)", () => {
  assert.equal(santiagoToUtcISO("2026-01-10", "22:00:00"), "2026-01-11T01:00:00.000Z");
});

test("santiagoToday: cerca de medianoche de Chile no adelanta el día (caso QA-0611)", () => {
  // 2026-06-11T02:30Z = 2026-06-10 22:30 en Santiago (invierno)
  assert.equal(santiagoToday(new Date("2026-06-11T02:30:00Z")), "2026-06-10");
});

test("santiagoDay: día calendario de un instante ISO", () => {
  assert.equal(santiagoDay("2026-06-11T02:30:00Z"), "2026-06-10");
  assert.equal(santiagoDay("2026-06-11T12:00:00Z"), "2026-06-11");
});

test("santiagoMonthStartUtcISO: primer día del mes según Santiago", () => {
  // 1° de junio 2026 00:00 Santiago (UTC-4) = 04:00Z
  assert.equal(
    santiagoMonthStartUtcISO(new Date("2026-06-15T12:00:00Z")),
    "2026-06-01T04:00:00.000Z"
  );
});

test("santiagoNextMonthStartUtcISO: cruza año correctamente", () => {
  const iso = santiagoNextMonthStartUtcISO(new Date("2026-12-15T12:00:00Z"));
  assert.ok(iso.startsWith("2027-01-01T"));
});
