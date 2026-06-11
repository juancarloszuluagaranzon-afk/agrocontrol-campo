# -*- coding: utf-8 -*-
"""
Convierte el shapefile de Castilla Agrícola (ArcGIS, polígonos por tablón) a
`public/data/tablones_castilla.geojson` + `tablones_castilla_catalogo.json`,
espejando el esquema de Riopaila (`tablonPropertiesSchema`).

Lee el shapefile en Python puro (sin GDAL/pyshp): parsea el `.dbf` (atributos) y
el `.shp` (polígonos, tipo 5). El CRS de origen es WGS84 (CRS84), así que no hay
reproyección. La llave de cruce con el maestro es `Suerte_Sap` (ej. `2108-122`).

Uso:
    python scripts/convertir_castilla.py [ruta_sin_extension]

Por defecto busca el shapefile en
`~/Documents/Cartografias/STES_AGRICOLAS_JUN_9_2026`.
"""

import json
import struct
import sys
from collections import Counter
from pathlib import Path

DEFAULT_SHP = (
    Path.home() / "Documents" / "Cartografias" / "STES_AGRICOLAS_JUN_9_2026"
)
DATA = Path(__file__).resolve().parent.parent / "public" / "data"

# Empresa del shapefile -> etiqueta de planta para la propiedad `planta`.
EMPRESA = {
    "Agricola Castilla": "Castilla",
    "Agricola Invasion": "Invasión",
    "Agricola invasion": "Invasión",
}


def read_dbf(path: Path) -> list[dict]:
    data = path.read_bytes()
    nrec = struct.unpack("<I", data[4:8])[0]
    hlen = struct.unpack("<H", data[8:10])[0]
    rlen = struct.unpack("<H", data[10:12])[0]
    fields = []
    pos = 32
    while data[pos] != 0x0D:
        name = data[pos : pos + 11].split(b"\x00")[0].decode("latin1")
        fields.append((name, data[pos + 16]))
        pos += 32
    rows = []
    for i in range(nrec):
        off = hlen + i * rlen
        rec = data[off : off + rlen]
        p = 1
        v = {}
        for name, flen in fields:
            v[name] = rec[p : p + flen].decode("utf-8", "replace").strip()
            p += flen
        rows.append(v)
    return rows


def signed_area(ring: list[tuple[float, float]]) -> float:
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        s += x1 * y2 - x2 * y1
    return s / 2.0


def read_shp_polygons(path: Path) -> list[list[list[tuple[float, float]]]]:
    """Devuelve, por registro, su lista de anillos (cada anillo lista de puntos)."""
    data = path.read_bytes()
    pos = 100
    shapes = []
    while pos < len(data):
        clen = struct.unpack(">i", data[pos + 4 : pos + 8])[0]
        content = data[pos + 8 : pos + 8 + clen * 2]
        pos += 8 + clen * 2
        stype = struct.unpack("<i", content[0:4])[0]
        if stype == 0:  # null shape
            shapes.append([])
            continue
        nparts = struct.unpack("<i", content[36:40])[0]
        npts = struct.unpack("<i", content[40:44])[0]
        po = 44
        parts = list(struct.unpack(f"<{nparts}i", content[po : po + 4 * nparts]))
        po += 4 * nparts
        pts = struct.unpack(f"<{2 * npts}d", content[po : po + 16 * npts])
        coords = [(pts[2 * i], pts[2 * i + 1]) for i in range(npts)]
        rings = []
        for k in range(nparts):
            a = parts[k]
            b = parts[k + 1] if k + 1 < nparts else npts
            rings.append(coords[a:b])
        shapes.append(rings)
    return shapes


def rings_to_polygons(rings):
    """Agrupa anillos: horario (área<0)=exterior, antihorario=hueco. Devuelve
    polígonos en orientación GeoJSON (exterior antihorario)."""
    polys = []
    cur = None
    for r in rings:
        if len(r) < 4:
            continue
        ring = [list(p) for p in reversed(r)]  # GeoJSON exterior = antihorario
        if signed_area(r) < 0:  # exterior en shapefile (horario)
            cur = [ring]
            polys.append(cur)
        elif cur is None:
            cur = [ring]
            polys.append(cur)
        else:
            cur.append(ring)
    return polys


def centroid(polys):
    cx = cy = A = 0.0
    for poly in polys:
        ring = poly[0]
        a = signed_area(ring)
        for i in range(len(ring) - 1):
            x1, y1 = ring[i]
            x2, y2 = ring[i + 1]
            cr = x1 * y2 - x2 * y1
            cx += (x1 + x2) * cr
            cy += (y1 + y2) * cr
        A += a
    if abs(A) < 1e-12:
        pts = polys[0][0]
        n = len(pts)
        return round(sum(p[0] for p in pts) / n, 7), round(
            sum(p[1] for p in pts) / n, 7
        )
    return round(cx / (6 * A), 7), round(cy / (6 * A), 7)


def main() -> None:
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SHP
    rows = read_dbf(base.with_suffix(".dbf"))
    shapes = read_shp_polygons(base.with_suffix(".shp"))
    assert len(rows) == len(shapes), f"{len(rows)} dbf vs {len(shapes)} shp"

    # Agrupa por (suerte, tablón): el `tab_id` es la llave primaria, así que un
    # tablón partido en varios polígonos (mismo número) es UN tablón
    # (MultiPolygon, área sumada), no varios. En este insumo ocurre 1 sola vez.
    grupos: dict[tuple[str, int], list] = {}
    skipped = 0
    for r, rings in zip(rows, shapes):
        code = r["Suerte_Sap"].strip()
        if not code or not rings:
            skipped += 1
            continue
        polys = rings_to_polygons(rings)
        if not polys:
            skipped += 1
            continue
        try:
            tablon = int(r["Tablon"] or 0)
        except ValueError:
            tablon = 0
        grupos.setdefault((code, tablon), []).append((r, polys))

    # tablones distintos por suerte (para `tablon_total`).
    por_suerte = Counter(code for (code, _t) in grupos)

    features = []
    catalogo = []
    for (code, tablon), partes in grupos.items():
        r0 = partes[0][0]
        all_polys = [p for _r, polys in partes for p in polys]
        ha = 0.0
        for r, _polys in partes:
            try:
                ha += float(r["Area_dig"])
            except ValueError:
                pass
        ha = round(ha, 3)
        lon, lat = centroid(all_polys)
        tab_id = f"{code}-T{tablon}"
        geom = (
            {"type": "Polygon", "coordinates": all_polys[0]}
            if len(all_polys) == 1
            else {"type": "MultiPolygon", "coordinates": all_polys}
        )
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "tab_id": tab_id,
                    "sec_ste": code,
                    "suerte": r0["Suerte"].strip(),
                    "sector": r0["Sec"].strip(),
                    "hacienda": r0["Nombre"].strip(),
                    "planta": EMPRESA.get(
                        r0["Empresa"].strip(), r0["Empresa"].strip()
                    ),
                    "supervisor": "",
                    "jefe_zona": r0["Jefe_zona"].strip(),
                    "tablon": tablon,
                    "tablon_total": por_suerte[code],
                    "ha_oficial": ha,
                    "lat": lat,
                    "lon": lon,
                },
                "geometry": geom,
            }
        )
        catalogo.append(
            {
                "tab_id": tab_id,
                "sec_ste": code,
                "hacienda": r0["Nombre"].strip(),
                "sector": r0["Sec"].strip(),
                "tablon": tablon,
                "ha": ha,
                "lat": lat,
                "lon": lon,
            }
        )

    fc = {"type": "FeatureCollection", "features": features}
    (DATA / "tablones_castilla.geojson").write_text(
        json.dumps(fc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    (DATA / "tablones_castilla_catalogo.json").write_text(
        json.dumps(catalogo, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"OK: {len(features)} tablones / {len(por_suerte)} suertes "
        f"-> tablones_castilla.geojson (+catalogo). Saltados: {skipped}"
    )


if __name__ == "__main__":
    main()
