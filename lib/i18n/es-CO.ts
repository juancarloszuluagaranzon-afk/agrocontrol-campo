/**
 * Textos centralizados — español (Colombia).
 *
 * Punto único de strings de la UI (§15 del documento maestro). Mantener todas
 * las cadenas visibles aquí facilita una futura i18n y la auditoría de copy.
 */
export const t = {
  app: {
    nombre: "Rio Map",
    descripcion: "Mapa de campo — Riopaila Agrícola",
  },
  planta: {
    elegir: "Elige tu planta",
    ayuda: "Verás solo el mapa de esta empresa. Podrás cambiarla luego.",
    cambiar: "Cambiar planta",
    cambiarA: (nombre: string) => `Ver ${nombre}`,
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
  brujula: {
    calibrar: "Calibra la brújula: mueve el teléfono en forma de 8.",
  },
  gps: {
    afinando: "Afinando ubicación…",
  },
} as const;

export type Textos = typeof t;
