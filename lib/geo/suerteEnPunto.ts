import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { TablonProperties } from "@/domain/suertes/schema";

type TablonFeature = Feature<Polygon | MultiPolygon, TablonProperties>;

/**
 * Devuelve las propiedades del tablón/suerte que **contiene** el punto `[lon,lat]`,
 * o null si cae fuera de todos los lotes. Función pura (testeable) sobre la lista
 * de features de la cartografía de suertes (§ Foto de campo).
 */
export function buscarSuerte(
  features: TablonFeature[],
  lon: number,
  lat: number,
): TablonProperties | null {
  const pt = point([lon, lat]);
  for (const f of features) {
    if (booleanPointInPolygon(pt, f)) return f.properties;
  }
  return null;
}

/**
 * Carga el GeoJSON de tablones (de la planta activa; el SW lo cachea, así que
 * funciona offline) y resuelve en qué suerte cae la ubicación. Devuelve null si
 * no se puede cargar o el punto está fuera de los lotes.
 */
export async function suerteEnUbicacion(
  lon: number,
  lat: number,
  tablonesUrl: string,
): Promise<TablonProperties | null> {
  try {
    const fc = (await (await fetch(tablonesUrl)).json()) as {
      features: TablonFeature[];
    };
    return buscarSuerte(fc.features, lon, lat);
  } catch {
    return null;
  }
}
