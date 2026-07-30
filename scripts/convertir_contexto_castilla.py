#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convierte las capas de contexto de Castilla Agrícola (shapefiles en Datum
Bogotá / Colombia West Zone) a GeoJSON WGS84 para Rio Map, análogo a
`convertir_contexto.py` (Riopaila) pero:

  - El CRS de origen se toma del WKT del propio .prj de cada shapefile
    (Bogotá/West, esferoide Internacional 1924) — NO se hardcodea un EPSG.
  - Las salidas van con prefijo de planta: contexto_castilla_<id>.geojson.
  - Dos capas regionales gigantes (RIOS 48k, municipios 6.5k) se RECORTAN al
    bounding box de Castilla; si no, el geojson pesaría decenas de MB y
    rompería el caché offline de campo.

Uso:
    python scripts/convertir_contexto_castilla.py
"""

import json
from pathlib import Path
import shapefile  # pyshp
from pyproj import CRS, Transformer

BASE = Path(r"C:\Users\Agr349\Downloads\Shapes Castilla Agricola\Shapes Castilla Agricola")
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data"

# Bounding box de Castilla (WGS84), generoso, para recortar capas regionales.
BBOX = (-76.55, 3.00, -76.15, 3.50)  # (min_lon, min_lat, max_lon, max_lat)


def transformer_de(src_name):
    """Transformer del CRS del .prj de la capa a WGS84."""
    prj = (BASE / f"{src_name}.prj").read_text()
    return Transformer.from_crs(CRS.from_wkt(prj), "EPSG:4326", always_xy=True)


def parts_rings(shape):
    parts = list(shape.parts) + [len(shape.points)]
    return [shape.points[parts[i] : parts[i + 1]] for i in range(len(parts) - 1)]


def en_bbox(lon, lat):
    return BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]


def convert(src_name, out_name, layer_name, geom, recortar=False, filtro=None):
    """`filtro`: predicado opcional sobre props (p. ej. quedarse solo con los
    ríos que tienen nombre en la red hídrica)."""
    shp = BASE / f"{src_name}.shp"
    if not shp.exists():
        print(f"{out_name}: OMITIDO (falta {src_name}.shp)")
        return
    tr = transformer_de(src_name)
    r = shapefile.Reader(str(BASE / src_name), encoding="latin-1")
    fields = [f[0] for f in r.fields[1:]]

    def wgs(ring):
        return [[round(lon, 7), round(lat, 7)]
                for lon, lat in (tr.transform(x, y) for x, y in ring)]

    features = []
    for s, rec in zip(r.shapes(), r.records()):
        props = {k: (v.strip() if isinstance(v, str) else v) for k, v in zip(fields, rec)}
        if filtro is not None and not filtro(props):
            continue
        if geom == "point":
            if not s.points:
                continue
            lon, lat = tr.transform(*s.points[0])
            if recortar and not en_bbox(lon, lat):
                continue
            geometry = {"type": "Point", "coordinates": [round(lon, 7), round(lat, 7)]}
        else:
            rings = [wgs(rg) for rg in parts_rings(s) if rg]
            if not rings:
                continue
            if recortar and not any(en_bbox(lon, lat) for rg in rings for lon, lat in rg):
                continue
            if geom == "polygon":
                geometry = {"type": "Polygon", "coordinates": rings}
            else:  # line
                geometry = ({"type": "LineString", "coordinates": rings[0]}
                            if len(rings) == 1
                            else {"type": "MultiLineString", "coordinates": rings})
        features.append({"type": "Feature", "properties": props, "geometry": geometry})

    fc = {"type": "FeatureCollection", "name": layer_name,
          "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
          "features": features}
    (OUT_DIR / out_name).write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
    print(f"{out_name}: {len(features)} features" + (" (recortado a Castilla)" if recortar else ""))


if __name__ == "__main__":
    P = "castilla"
    convert("Canal", f"contexto_{P}_canales_riego.geojson", "CANALES DE RIEGO", "line")
    convert("drenaje_princ_castilla", f"contexto_{P}_drenajes.geojson", "DRENAJES", "line")
    # Red hídrica: solo ríos con nombre (`principale`); se descartan ~38.7k
    # micro-drenajes/zanjas sin nombre que inflaban el archivo a ~18 MB.
    convert("RIOS", f"contexto_{P}_red_hidrica.geojson", "RED HIDRICA", "line",
            recortar=True, filtro=lambda p: str(p.get("principale", "")).strip() != "")
    convert("POZOS", f"contexto_{P}_freatimetros.geojson", "POZOS", "point")
    convert("HDAS", f"contexto_{P}_haciendas.geojson", "HACIENDAS", "polygon")
    convert("VIA_DESTAPADA", f"contexto_{P}_vias_acceso.geojson", "VIAS DE ACCESO", "line")
    convert("HIDRANTES", f"contexto_{P}_hidrantes.geojson", "HIDRANTES", "point")
    convert("LLAVES", f"contexto_{P}_llaves.geojson", "LLAVES", "point")
    convert("TUBERIA_ENTERRADA", f"contexto_{P}_tuberia.geojson", "TUBERIA ENTERRADA", "line")
    # MUNICIPIOS_CORREGIMIENTOS: omitido — 6.501 fragmentos, 6.479 sin nombre,
    # ~3 MB de bajo valor para un mapa de campo (decisión del usuario).
    # VIA_PAVIMENTADA: incompleta (sin .shp) — se omite.
