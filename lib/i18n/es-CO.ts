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
  foto: {
    titulo: "Foto de campo",
    ayuda: "Toma una foto y queda sellada con la ubicación y la suerte.",
    tomar: "Tomar foto",
    sinGps: "Activa 'Mi ubicación' (◎) para sellar la foto.",
    detectando: "Detectando suerte…",
    suerte: "Suerte",
    hacienda: "Hacienda",
    fueraDeLote: "Fuera de cualquier suerte",
    sellar: "Sellar y compartir",
    otra: "Tomar otra",
    error: "No se pudo procesar la foto. Intenta de nuevo.",
  },
  plano: {
    titulo: "Plano de campo",
    ayuda:
      "Sube el GeoPDF de muestreo (Avenza) y camina a los puntos con el GPS.",
    subir: "Subir GeoPDF",
    reemplazar: "Reemplazar",
    leyendo: "Leyendo plano…",
    quitar: "Quitar plano",
    opacidad: "Opacidad",
    sinGeo: "Este PDF no está georreferenciado.",
    error: "No se pudo leer el plano. Intenta con otro PDF.",
    puntos: (n: number) => `${n} punto${n === 1 ? "" : "s"} de muestreo`,
    muestreados: (h: number, n: number) => `${h}/${n} muestreados`,
    sinPuntos: "No se detectaron puntos. Toca el mapa para marcarlos.",
  },
  lluvia: {
    titulo: "Precipitación",
    ayuda:
      "Planilla diaria de lluvia: elige técnico y anota los mm de sus pluviómetros.",
    fecha: "Fecha",
    tecnico: "Técnico",
    elegirTecnico: "Elige un técnico",
    zona: (z: number | string) => `Zona ${z}`,
    pluviometro: "Pluviómetro",
    mm: "mm",
    guardar: "Guardar planilla",
    descargar: "⬇️ Descargar consolidado del mes (CSV)",
    guardado: (n: number) =>
      `${n} lectura${n === 1 ? "" : "s"} guardada${n === 1 ? "" : "s"}`,
    nadaQueGuardar: "Anota al menos un valor.",
    acumMes: "mes",
    acumAnio: "año",
    verCapas:
      "Para ver la lluvia de hoy en el mapa, activa la capa “Pluviómetros (lluvia hoy)” en 🗂️ Capas.",
    sinTecnico: "Elige un técnico para ver sus pluviómetros.",
    sinPluviometros: "Esta planta no tiene pluviómetros registrados.",
  },
} as const;

export type Textos = typeof t;
