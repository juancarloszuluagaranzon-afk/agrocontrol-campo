"""
Genera `public/data/suertes_labels.geojson`: un punto por suerte para rotular su
nomenclatura (sec_ste) UNA sola vez en el mapa, en vez de repetirla por tablón.

Estrategia: por cada suerte (`sec_ste`) se elige el tablón de **mayor área** y se
usa su centro (`lat/lon`). Así el punto siempre cae dentro de la suerte y queda en
su parte más amplia (buena posición para la etiqueta).

Entrada:  public/data/tablones_catalogo.json  (tab_id, sec_ste, hacienda, ha, lat, lon)
Salida:   public/data/suertes_labels.geojson   (FeatureCollection de puntos)
"""

import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "public" / "data"
ENTRADA = DATA / "tablones_catalogo.json"
SALIDA = DATA / "suertes_labels.geojson"


def main() -> None:
    catalogo = json.loads(ENTRADA.read_text(encoding="utf-8"))

    # Por suerte, conservar el tablón de mayor área.
    mejor: dict[str, dict] = {}
    for t in catalogo:
        sec = t["sec_ste"]
        if sec not in mejor or t["ha"] > mejor[sec]["ha"]:
            mejor[sec] = t

    features = []
    for sec in sorted(mejor):
        t = mejor[sec]
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [t["lon"], t["lat"]]},
                "properties": {"sec_ste": sec, "hacienda": t["hacienda"]},
            }
        )

    fc = {
        "type": "FeatureCollection",
        "name": "suertes_labels",
        "features": features,
    }
    SALIDA.write_text(
        json.dumps(fc, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"OK: {len(features)} suertes -> {SALIDA.name}")


if __name__ == "__main__":
    main()
