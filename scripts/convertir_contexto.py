#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte las capas de contexto oficiales de Ingeniería Agrícola (shapefiles
EPSG:3115 MAGNA-SIRGAS) a GeoJSON WGS84 para Rio Map, y reemplaza las versiones
extraídas del GeoPDF (que tenían artefactos / menor calidad).

  Reemplazos (dato oficial):
    - Canales de riego y drenaje (líneas)  -> contexto_canales.geojson
    - Cuerpos de agua (polígonos)          -> contexto_cuerpos_agua.geojson
    - Redes hídricas (líneas)              -> contexto_red_hidrica.geojson
  Nuevas:
    - Freatímetros (puntos, nivel freático) -> contexto_freatimetros.geojson
    - Pluviómetros (puntos)                 -> contexto_pluviometros.geojson
    - Polígonos Thiessen (polígonos, lluvia)-> contexto_thiessen.geojson
    - Haciendas (polígonos, contorno)       -> contexto_haciendas.geojson

Las .cpg de origen NO son uniformes: unas capas vienen en UTF-8 y otras en
Windows-1252; por eso `convert()` recibe la codificación por capa (si no, los
acentos salen rotos, p. ej. "André s" en vez de "Andrés").
"""

import json
from pathlib import Path
import shapefile  # pyshp
from pyproj import Transformer

BASE = Path(r"C:\Users\Agr349\Documents\Rio Maps\Elementos qGIS\Elementos qGIS")
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"
tr = Transformer.from_crs("EPSG:3115", "EPSG:4326", always_xy=True)


def parts_rings(shape):
    parts = list(shape.parts) + [len(shape.points)]
    return [shape.points[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]


def wgs(ring):
    return [[round(lon, 7), round(lat, 7)] for lon, lat in (tr.transform(x, y) for x, y in ring)]


def convert(src_name, out_name, layer_name, geom, encoding="utf-8"):
    r = shapefile.Reader(str(BASE / src_name), encoding=encoding)
    fields = [f[0] for f in r.fields[1:]]
    features = []
    for shp, rec in zip(r.shapes(), r.records()):
        props = {k: (v.strip() if isinstance(v, str) else v) for k, v in zip(fields, rec)}
        if geom == "point":
            if not shp.points:
                continue
            x, y = shp.points[0]
            lon, lat = tr.transform(x, y)
            geometry = {"type": "Point", "coordinates": [round(lon, 7), round(lat, 7)]}
        else:
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
    # Reemplazos con el dato oficial.
    convert("Canales de riego y drenaje", "contexto_canales.geojson", "CANALES", "line", "utf-8")
    convert("Cuerpos de agua", "contexto_cuerpos_agua.geojson", "CUERPOS DE AGUA", "polygon", "cp1252")
    convert("Redes Hídricas", "contexto_red_hidrica.geojson", "RED HIDRICA", "line", "utf-8")
    # Capas nuevas.
    convert("Freatímetros", "contexto_freatimetros.geojson", "FREATIMETROS", "point", "utf-8")
    convert("Pluviómetros", "contexto_pluviometros.geojson", "PLUVIOMETROS", "point", "utf-8")
    convert("Polígonos Thiessen", "contexto_thiessen.geojson", "POLIGONOS THIESSEN", "polygon", "cp1252")
    convert("Haciendas", "contexto_haciendas.geojson", "HACIENDAS", "polygon", "cp1252")
