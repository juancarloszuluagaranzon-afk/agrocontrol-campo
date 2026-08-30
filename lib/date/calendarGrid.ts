/** Una celda de día del calendario. */
export interface CalCell {
  day: number;
  iso: string; // YYYY-MM-DD
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Matriz de semanas (lunes-primero) de un mes; `null` en las celdas de relleno.
 * Usa `Date.UTC` para que la aritmética sea determinista e independiente de la
 * zona horaria (ADR-0025).
 */
export function monthMatrix(year: number, month: number): (CalCell | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // getUTCDay: 0=Dom..6=Sáb → lunes-primero: (d+6)%7
  const lead = (first.getUTCDay() + 6) % 7;

  const cells: (CalCell | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, iso: `${year}-${pad(month + 1)}-${pad(d)}` });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (CalCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
