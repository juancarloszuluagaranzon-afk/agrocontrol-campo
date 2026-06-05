/**
 * Textos centralizados — español (Colombia).
 *
 * Punto único de strings de la UI (§15 del documento maestro). Mantener todas
 * las cadenas visibles aquí facilita una futura i18n y la auditoría de copy.
 */
export const t = {
  app: {
    nombre: "AgroControl Campo",
    descripcion: "Centro de Operaciones — Riopaila Agrícola",
  },
  sync: {
    enLinea: "En línea",
    sinConexion: "Sin conexión",
    sincronizando: "Sincronizando…",
    sincronizado: "Sincronizado",
    pendientes: (n: number) => `${n} pendiente${n === 1 ? "" : "s"} por enviar`,
  },
  mapa: {
    titulo: "Mapa / Campo",
    placeholder: "El mapa de suertes se construye en la Fase 1.",
  },
} as const;

export type Textos = typeof t;
