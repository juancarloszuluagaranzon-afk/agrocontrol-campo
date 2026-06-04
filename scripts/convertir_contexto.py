#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte las capas de contexto oficiales (shapefiles EPSG:3115) a GeoJSON WGS84
y reemplaza las versiones extraídas del GeoPDF (que tenían artefactos).

  - Cuerpos de agua (polígonos) -> contexto_cuerpos_agua.geojson
  - Redes hídricas (líneas)     -> contexto_red_hidrica.geojson
"""

import json
from pathlib import Path
import shapefile  # pyshp
from pyproj import Transformer

BASE = Path(
    r"C:\Users\Agr349\Documents\doremi\Suertes y cuerpos de agua\Suertes y cuerpos de agua"
)
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
tr = Transformer.from_crs("EPSG:3115", "EPSG:4326", always_xy=True)


def parts_rings(shape):
    parts = list(shape.parts) + [len(shape.points)]
    return [shape.points[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]


def wgs(ring):
    return [[round(lon, 7), round(lat, 7)] for lon, lat in (tr.transform(x, y) for x, y in ring)]


def convert(src_name, out_name, layer_name, geom):
    r = shapefile.Reader(str(BASE / src_name), encoding="latin1")
    fields = [f[0] for f in r.fields[1:]]
    features = []
    for shp, rec in zip(r.shapes(), r.records()):
        props = {k: (v.strip() if isinstance(v, str) else v) for k, v in zip(fields, rec)}
        rings = [wgs(rg) for rg in parts_rings(shp) if rg]
        if not rings:
            continue
        if geom == "polygon":
            geometry = {"type": "Polygon", "coordinates": rings}
        else:  # line
            geometry = (
                {"type": "LineString", "coordinates": rings[0]}
                if len(rings) == 1
                else {"type": "MultiLineString", "coordinates": rings}
            )
        features.append({"type": "Feature", "properties": props, "geometry": geometry})
    fc = {
        "type": "FeatureCollection",
        "name": layer_name,
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }
    (OUT_DIR / out_name).write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(f"{out_name}: {len(features)} features")


if __name__ == "__main__":
    convert("Cuerpos de agua", "contexto_cuerpos_agua.geojson", "CUERPOS DE AGUA", "polygon")
    convert("Redes hidricas", "contexto_red_hidrica.geojson", "RED HIDRICA", "line")
