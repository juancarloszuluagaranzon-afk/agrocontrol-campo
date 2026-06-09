"""
Genera `public/data/maestro_suertes.json` a partir de `maestro.csv` del repo
`juancarloszuluagaranzon-afk/maestro-riopaila`: información agronómica por suerte
(variedad, corte, fechas, TCH, etc.), indexada por `sec_ste` para cruzarla con la
cartografía de Rio Map. Solo se incluyen las suertes que existen en nuestro
catálogo (`public/data/tablones_catalogo.json`).

Uso:
    python scripts/convertir_maestro.py            # baja el CSV del repo
    python scripts/convertir_maestro.py ruta.csv   # usa un CSV local
"""

import csv
import io
import json
import sys
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

# Base del serial de Excel (sistema 1900, con el bug del año bisiesto 1900).
EXCEL_EPOCH = date(1899, 12, 30)

RAW_URL = (
    "https://raw.githubusercontent.com/"
    "juancarloszuluagaranzon-afk/maestro-riopaila/main/maestro.csv"
)
DATA = Path(__file__).resolve().parent.parent / "public" / "data"
CATALOGO = DATA / "tablones_catalogo.json"
SALIDA = DATA / "maestro_suertes.json"


def leer_csv(arg: str | None) -> str:
    if arg:
        return Path(arg).read_text(encoding="utf-8-sig")
    with urllib.request.urlopen(RAW_URL) as r:  # noqa: S310 (URL fija conocida)
        return r.read().decode("utf-8-sig")


def fecha_iso(s: str) -> str | None:
    """Acepta dd/mm/aaaa, ISO o serial de Excel (ej. 44170). Devuelve ISO o None."""
    s = (s or "").strip()
    if not s:
        return None
    if "/" in s:
        try:
            return datetime.strptime(s, "%d/%m/%Y").date().isoformat()
        except ValueError:
            return None
    if "-" in s:
        try:
            return datetime.strptime(s[:10], "%Y-%m-%d").date().isoformat()
        except ValueError:
            return None
    try:
        serial = float(s.replace(",", "."))
    except ValueError:
        return None
    if serial <= 0:
        return None
    return (EXCEL_EPOCH + timedelta(days=round(serial))).isoformat()


def num(s: str) -> float | None:
    s = (s or "").strip()
    if not s:
        return None
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def entero(s: str) -> int | None:
    n = num(s)
    return int(n) if n is not None else None


def main() -> None:
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    nuestras = {c["sec_ste"] for c in catalogo}

    texto = leer_csv(sys.argv[1] if len(sys.argv) > 1 else None)
    reader = csv.DictReader(io.StringIO(texto), delimiter=";")

    salida: dict[str, dict] = {}
    for row in reader:
        sec = (row.get("SUERTE") or "").strip()
        if sec not in nuestras:
            continue
        salida[sec] = {
            "variedad": (row.get("VARIEDAD") or "").strip() or None,
            "numero_corte": entero(row.get("NUMERO DE CORTE", "")),
            "uso": (row.get("USO DE LA SUERTE") or "").strip() or None,
            "fecha_siembra": fecha_iso(row.get("FECHA DE SIEMBRA", "")),
            "fecha_ultimo_corte": fecha_iso(row.get("FECHA DE ULTIMO CORTE", "")),
            "fecha_proximo_corte": fecha_iso(row.get("FECHA DEL PROXIMO CORTE", "")),
            "edad_csv": num(row.get("EDAD HOY MESES", "")),
            "zona": entero(row.get("ZONA", "")),
            "zona_agroecologica": (row.get("Zona Agroecologica") or "").strip() or None,
            "area_neta_ha": num(row.get("AREA NETA HA", "")),
            "tch_ppto": num(row.get("TCH PPTO", "")),
            "toneladas_ppto": num(row.get("TONELADAS PPTO", "")),
            "toneladas_estimadas": num(row.get("TONELADAS ESTIMADAS", "")),
            "responsable_zona": (row.get("RESPONSABLE ZONA") or "").strip() or None,
            "tecnico": (row.get("TECNICO AGRICOLA RESPONSABLE") or "").strip() or None,
            "empresa": (row.get("EMPRESA") or "").strip() or None,
        }

    SALIDA.write_text(
        json.dumps(salida, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    faltan = sorted(nuestras - set(salida))
    print(f"OK: {len(salida)} suertes con datos -> {SALIDA.name}")
    print(f"Nuestras suertes sin datos en el maestro: {len(faltan)} {faltan}")


if __name__ == "__main__":
    main()
