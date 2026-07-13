import { readFileSync, writeFileSync } from "node:fs";
import turfCentroid from "@turf/centroid";
import turfBooleanPointInPolygon from "@turf/boolean-point-in-polygon";

/**
 * Genera, por planta, un punto de etiqueta por hacienda (nombre + lat/lon) para
 * la marca de agua del modo Plano. Corrida única — el resultado se commitea en
 * public/data/, no se regenera en cada build (ADR-0014).
 *
 * Como una misma hacienda puede tener tablones en varios `sector` separados
 * (confirmado: GERTRUDIS, MORILLO, VENECIA, ZAMBRANO en Riopaila), el centroide
 * se calcula solo sobre el sector de mayor área total de esa hacienda — evita
 * que el punto caiga en tierra de nadie entre dos masas desconectadas.
 */

const PLANTAS = [
  {
    entrada: "public/data/tablones_riopaila.geojson",
    salida: "public/data/haciendas_label_riopaila.json",
  },
  {
    entrada: "public/data/tablones_castilla.geojson",
    salida: "public/data/haciendas_label_castilla.json",
  },
];

function procesarPlanta(entrada, salida) {
  const geojson = JSON.parse(readFileSync(entrada, "utf-8"));

  // Agrupa por (hacienda, sector); acumula ha_oficial total del grupo.
  const grupos = new Map();
  for (const feature of geojson.features) {
    const { hacienda, sector, ha_oficial } = feature.properties;
    const clave = `${hacienda}::${sector}`;
    const grupo = grupos.get(clave) ?? {
      hacienda,
      sector,
      haOficialTotal: 0,
      features: [],
    };
    grupo.haOficialTotal += ha_oficial ?? 0;
    grupo.features.push(feature);
    grupos.set(clave, grupo);
  }

  // Por hacienda, el grupo (sector) de mayor área total.
  const mejorPorHacienda = new Map();
  for (const grupo of grupos.values()) {
    const actual = mejorPorHacienda.get(grupo.hacienda);
    if (!actual || grupo.haOficialTotal > actual.haOficialTotal) {
      mejorPorHacienda.set(grupo.hacienda, grupo);
    }
  }

  const filas = [];
  for (const [hacienda, grupo] of mejorPorHacienda) {
    const fc = { type: "FeatureCollection", features: grupo.features };
    const centro = turfCentroid(fc);
    const [lon, lat] = centro.geometry.coordinates;

    const dentro = grupo.features.some((f) =>
      turfBooleanPointInPolygon(centro, f),
    );

    let lonFinal = lon;
    let latFinal = lat;
    if (!dentro) {
      // Fallback: centroide del tablón individual más grande del grupo.
      const masGrande = grupo.features.reduce((a, b) =>
        (a.properties.ha_oficial ?? 0) >= (b.properties.ha_oficial ?? 0)
          ? a
          : b,
      );
      const centroTablon = turfCentroid(masGrande);
      [lonFinal, latFinal] = centroTablon.geometry.coordinates;
      console.warn(
        `  [fallback] ${hacienda}: centroide del sector fuera de sus polígonos, uso el tablón más grande (sector ${grupo.sector}).`,
      );
    }

    filas.push({
      hacienda,
      lat: Math.round(latFinal * 1e6) / 1e6,
      lon: Math.round(lonFinal * 1e6) / 1e6,
    });
  }

  filas.sort((a, b) => a.hacienda.localeCompare(b.hacienda));
  writeFileSync(salida, JSON.stringify(filas), "utf-8");
  console.log(`${salida}: ${filas.length} haciendas`);
}

for (const { entrada, salida } of PLANTAS) {
  procesarPlanta(entrada, salida);
}
