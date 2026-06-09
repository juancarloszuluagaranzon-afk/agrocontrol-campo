import { z } from "zod";

/**
 * Información agronómica por suerte tomada del maestro de Riopaila (§5).
 * Indexada por `sec_ste`. Todos los campos pueden faltar (datos parciales).
 */
export const suerteMaestroSchema = z.object({
  variedad: z.string().nullable(),
  numero_corte: z.number().nullable(),
  uso: z.string().nullable(),
  fecha_siembra: z.string().nullable(),
  fecha_ultimo_corte: z.string().nullable(),
  fecha_proximo_corte: z.string().nullable(),
  edad_csv: z.number().nullable(),
  zona: z.number().nullable(),
  zona_agroecologica: z.string().nullable(),
  area_neta_ha: z.number().nullable(),
  tch_ppto: z.number().nullable(),
  toneladas_ppto: z.number().nullable(),
  toneladas_estimadas: z.number().nullable(),
  responsable_zona: z.string().nullable(),
  tecnico: z.string().nullable(),
  empresa: z.string().nullable(),
});
export type SuerteMaestro = z.infer<typeof suerteMaestroSchema>;

/** Mapa `sec_ste` → datos del maestro. */
export const maestroSchema = z.record(z.string(), suerteMaestroSchema);
export type Maestro = z.infer<typeof maestroSchema>;

/** Días promedio por mes: 365,25/12 (igual que el cálculo del maestro). */
const DIAS_MES = 365.25 / 12;

function parseISO(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * Edad de la suerte en meses, **calculada en vivo**, replicando el maestro:
 * - variedad RENOVACIÓN ⇒ 0.
 * - referencia = la fecha **más reciente** entre siembra y último corte (el
 *   último corte solo si es posterior a la siembra; en caña planta usa siembra).
 * - meses = |hoy − referencia| / (365,25/12). Si no hay referencia ⇒ 0.
 */
export function edadSuerteMeses(
  info: Pick<
    SuerteMaestro,
    "variedad" | "fecha_siembra" | "fecha_ultimo_corte"
  >,
  hoy: Date = new Date(),
): number {
  const v = (info.variedad ?? "").toUpperCase();
  if (v === "RENOVACION" || v === "RENOVACIÓN") return 0;
  const siembra = parseISO(info.fecha_siembra);
  const corte = parseISO(info.fecha_ultimo_corte);
  let ref = siembra;
  if (corte && siembra && corte > siembra) ref = corte;
  if (!ref) return 0;
  const dias = Math.abs(hoy.getTime() - ref.getTime()) / 86_400_000;
  return Math.round((dias / DIAS_MES) * 10) / 10;
}
