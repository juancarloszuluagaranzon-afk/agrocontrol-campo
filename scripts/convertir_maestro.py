"""
Genera el maestro agronómico por suerte a partir de `maestro.csv` del repo
`juancarloszuluagaranzon-afk/maestro-riopaila` (variedad, corte, fechas, TCH,
etc.), indexado por `sec_ste` para cruzarlo con la cartografía de Rio Map. Solo
se incluyen las suertes que existen en el catálogo de la planta. El maestro es
único (todas las empresas) y se filtra por el catálogo de cada planta, así que
sirve igual para Riopaila (RIOP) que para Castilla (CAST/CAUC).

Uso:
    python scripts/convertir_maestro.py                     # riopaila (del repo)
    python scripts/convertir_maestro.py castilla            # castilla (del repo)
    python scripts/convertir_maestro.py riopaila ruta.csv   # CSV local
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

# Catálogo de origen y archivo de salida por planta.
PLANTAS = {
    "riopaila": ("tablones_catalogo.json", "maestro_suertes.json"),
    "castilla": ("tablones_castilla_catalogo.json", "maestro_castilla.json"),
}


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
    args = sys.argv[1:]
    planta = "riopaila"
    if args and args[0] in PLANTAS:
        planta = args.pop(0)
    cat_name, out_name = PLANTAS[planta]
    catalogo_path = DATA / cat_name
    salida_path = DATA / out_name

    catalogo = json.loads(catalogo_path.read_text(encoding="utf-8"))
    nuestras = {c["sec_ste"] for c in catalogo}

    texto = leer_csv(args[0] if args else None)
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

    salida_path.write_text(
        json.dumps(salida, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    faltan = sorted(nuestras - set(salida))
    print(f"OK [{planta}]: {len(salida)} suertes con datos -> {salida_path.name}")
    print(f"Suertes del catálogo sin datos en el maestro: {len(faltan)} {faltan}")


if __name__ == "__main__":
    main()
