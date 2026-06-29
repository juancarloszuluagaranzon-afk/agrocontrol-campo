#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera los datos de referencia de pluviómetros de Riopaila para la planilla de
lluvia: une el Excel "Ponderado de Precipitaciones" (técnico, zona, hacienda,
sitio, área de influencia) con `contexto_pluviometros.geojson` (lat/lon), por ID
de pluviómetro (`PLUV No` ↔ `Pluviometr`).

Salida: public/data/pluviometros_riopaila.json
  [{ id, zona, tecnico, hacienda, sitio, area_ha, lat, lon }]

El TÉCNICO en el Excel es un encabezado de grupo (solo va en la primera fila de
cada bloque), así que se rellena hacia abajo. Se filtran las filas de resumen
(ids de "promedio/total": 1, 15, 20, 35 — todos < 40; los PV reales son ≥ 207).

Uso:  python scripts/convertir_pluviometros.py [ruta_excel] [hoja]
"""

import json
import sys
from pathlib import Path

import openpyxl

EXCEL = Path(
    sys.argv[1]
    if len(sys.argv) > 1
    else Path.home() / "Downloads" / "Ponderado de Precipitaciones año 2026.xlsx"
)
HOJA = sys.argv[2] if len(sys.argv) > 2 else "Precip.Junio "
DATA = Path(__file__).resolve().parent.parent / "public" / "data"
GEOJSON = DATA / "contexto_pluviometros.geojson"
SALIDA = DATA / "pluviometros_riopaila.json"

# Columnas (0-based) en las hojas mensuales del Excel.
COL_ZONA, COL_HAC, COL_LOC, COL_TEC, COL_PLU, COL_AREA = 0, 1, 2, 3, 4, 5
PLU_MIN = 40  # los pluviómetros reales son ≥ 207; <40 son filas de resumen.


def limpiar(v):
    s = ("" if v is None else str(v)).strip()
    return s or None


def main() -> None:
    # Coordenadas por ID desde el geojson oficial.
    geo = json.loads(GEOJSON.read_text(encoding="utf-8"))
    coords = {
        f["properties"]["Pluviometr"]: f["geometry"]["coordinates"]
        for f in geo["features"]
    }

    wb = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    ws = wb[HOJA]

    filas = []
    zona = tecnico = None
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < 5:  # encabezados
            continue
        z = limpiar(row[COL_ZONA])
        tec = limpiar(row[COL_TEC])
        if z is not None:
            zona = z
        if tec is not None:
            tecnico = tec
        try:
            pid = int(row[COL_PLU])
        except (TypeError, ValueError):
            continue
        if pid < PLU_MIN or pid not in coords:
            continue  # fila de resumen o PV sin cartografía
        try:
            area = round(float(row[COL_AREA]), 2)
        except (TypeError, ValueError):
            area = None
        lon, lat = coords[pid]
        filas.append(
            {
                "id": pid,
                "zona": int(zona) if (zona or "").isdigit() else zona,
                "tecnico": tecnico,
                "hacienda": limpiar(row[COL_HAC]),
                "sitio": limpiar(row[COL_LOC]),
                "area_ha": area,
                "lat": lat,
                "lon": lon,
            }
        )

    filas.sort(key=lambda r: r["id"])
    SALIDA.write_text(
        json.dumps(filas, ensure_ascii=False, indent=0), encoding="utf-8"
    )
    huerfanos = sorted(set(coords) - {f["id"] for f in filas})
    print(f"{SALIDA.name}: {len(filas)} pluviómetros")
    print(f"Técnicos: {sorted({f['tecnico'] for f in filas})}")
    print(f"PV en geojson sin fila en el Excel: {len(huerfanos)} {huerfanos}")


if __name__ == "__main__":
    main()
