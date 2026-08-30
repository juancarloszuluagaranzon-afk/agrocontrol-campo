import { describe, it, expect } from "vitest";
import { monthMatrix, type CalCell } from "@/lib/date/calendarGrid";

const flat = (weeks: (CalCell | null)[][]) =>
  weeks.flat().filter((c): c is CalCell => c !== null);

describe("monthMatrix", () => {
  it("agosto 2026 tiene 31 días secuenciales, semanas de 7", () => {
    const weeks = monthMatrix(2026, 7); // month 7 = agosto (0-indexed)
    for (const w of weeks) expect(w).toHaveLength(7);
    const cells = flat(weeks);
    expect(cells).toHaveLength(31);
    expect(cells[0]).toEqual({ day: 1, iso: "2026-08-01" });
    expect(cells[30]).toEqual({ day: 31, iso: "2026-08-31" });
  });

  it("febrero 2026 (no bisiesto) tiene 28 días", () => {
    expect(flat(monthMatrix(2026, 1))).toHaveLength(28);
  });

  it("las celdas de relleno inicial son null hasta el primer día", () => {
    const first = monthMatrix(2026, 7)[0] ?? [];
    const idx = first.findIndex((c) => c?.iso === "2026-08-01");
    expect(idx).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < idx; i++) expect(first[i]).toBeNull();
  });
});
