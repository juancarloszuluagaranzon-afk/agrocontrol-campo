#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte la capa oficial de tablones (shapefile EPSG:3115 de Ingeniería Agrícola)
a GeoJSON WGS84 para AgroControl Campo.

- Cada feature es un TABLÓN (1380 en total), agrupado por suerte (sec_ste, 610).
- Se numera 1..N por suerte en orden geográfico (norte→sur, oeste→este) → tab_id.
- El área oficial (Ha) es por tablón; la de la suerte = suma de sus tablones.

Salidas (en public/data):
  - tablones_riopaila.geojson  (polígonos + atributos)
  - tablones_catalogo.json     (catálogo ligero para buscador/autocompletar)
"""

import json
from pathlib import Path
import shapefile  # pyshp
from pyproj import Transformer

SRC = Path(
    r"C:\Users\Agr349\Documents\doremi\Suertes y cuerpos de agua\Suertes y cuerpos de agua\Capa de suertes"
)
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

tr = Transformer.from_crs("EPSG:3115", "EPSG:4326", always_xy=True)


def rings_from_shape(shape):
    """Devuelve los anillos del polígono como listas de (x,y) en EPSG:3115."""
    parts = list(shape.parts) + [len(shape.points)]
    return [shape.points[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]


def centroid_xy(ring):
    """Centroide (shoelace, área-ponderado) de un anillo en coords proyectadas."""
    a = cx = cy = 0.0
    n = len(ring)
    for i in range(n):
        x0, y0 = ring[i]
        x1, y1 = ring[(i + 1) % n]
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if a == 0:  # degenerado → promedio simple
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return sum(xs) / n, sum(ys) / n
    a *= 0.5
    return cx / (6 * a), cy / (6 * a)


def to_wgs84_ring(ring):
    return [[round(lon, 7), round(lat, 7)] for lon, lat in (tr.transform(x, y) for x, y in ring)]


def main():
    r = shapefile.Reader(str(SRC), encoding="latin1")
    fields = [f[0] for f in r.fields[1:]]

    # 1) Construir tablones crudos con centroide WGS84.
    crudos = []
    for shp, rec in zip(r.shapes(), r.records()):
        d = dict(zip(fields, rec))
        rings = rings_from_shape(shp)
        if not rings:
            continue
        cx, cy = centroid_xy(rings[0])
        clon, clat = tr.transform(cx, cy)
        crudos.append(
            {
                "sec_ste": (d["sec_ste"] or "").strip(),
                "suerte": (d["suerte"] or "").strip(),
                "sector": (d["sector"] or "").strip(),
                "hacienda": (d["nombre"] or "").strip(),
                "planta": (d["planta"] or "").strip(),
                "supervisor": (d["supervisor"] or "").strip(),
                "jefe_zona": (d["jefe_zona"] or "").strip(),
                "ha_oficial": round(float(d["Ha"] or 0), 3),
                "lat": round(clat, 7),
                "lon": round(clon, 7),
                "rings_wgs84": [to_wgs84_ring(rg) for rg in rings],
            }
        )

    # 2) Numerar 1..N por suerte, orden geográfico (norte→sur, oeste→este).
    por_suerte = {}
    for t in crudos:
        por_suerte.setdefault(t["sec_ste"], []).append(t)
    for sec, items in por_suerte.items():
        items.sort(key=lambda t: (-t["lat"], t["lon"]))
        total = len(items)
        for i, t in enumerate(items, start=1):
            t["tablon"] = i
            t["tablon_total"] = total
            t["tab_id"] = f"{sec}-T{i}"

    # 3) Emitir GeoJSON + catálogo (ordenados por tab_id para estabilidad).
    crudos.sort(key=lambda t: t["tab_id"])
    features, catalogo = [], []
    for t in crudos:
        props = {
            "tab_id": t["tab_id"],
            "sec_ste": t["sec_ste"],
            "suerte": t["suerte"],
            "sector": t["sector"],
            "hacienda": t["hacienda"],
            "planta": t["planta"],
            "supervisor": t["supervisor"],
            "jefe_zona": t["jefe_zona"],
            "tablon": t["tablon"],
            "tablon_total": t["tablon_total"],
            "ha_oficial": t["ha_oficial"],
            "lat": t["lat"],
            "lon": t["lon"],
        }
        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "Polygon", "coordinates": t["rings_wgs84"]},
            }
        )
        catalogo.append(
            {
                "tab_id": t["tab_id"],
                "sec_ste": t["sec_ste"],
                "hacienda": t["hacienda"],
                "sector": t["sector"],
                "tablon": t["tablon"],
                "ha": t["ha_oficial"],
                "lat": t["lat"],
                "lon": t["lon"],
            }
        )

    fc = {
        "type": "FeatureCollection",
        "name": "tablones_riopaila",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }
    (OUT_DIR / "tablones_riopaila.geojson").write_text(
        json.dumps(fc, ensure_ascii=False), encoding="utf-8"
    )
    (OUT_DIR / "tablones_catalogo.json").write_text(
        json.dumps(catalogo, ensure_ascii=False), encoding="utf-8"
    )

    # 4) Validación.
    suertes = {t["sec_ste"] for t in crudos}
    area = sum(t["ha_oficial"] for t in crudos)
    t3111 = sorted(
        [t for t in crudos if t["sec_ste"] == "3111-020"], key=lambda t: t["tablon"]
    )
    print(f"Tablones: {len(features)} | Suertes: {len(suertes)} | Area: {area:.2f} ha")
    print("3111-020 ->", [(t["tab_id"], t["ha_oficial"]) for t in t3111])


if __name__ == "__main__":
    main()
