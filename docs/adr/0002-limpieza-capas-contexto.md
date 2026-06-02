# ADR-0002 — Limpieza de las capas de contexto del GeoPDF

- Estado: **Aceptada**
- Fecha: 2026-06-02

## Contexto

Las 5 capas `contexto_*.geojson` extraídas del GeoPDF oficial arrastraban
artefactos de render: features degenerados/duplicados amontonados en un único
punto (~`-76.069, 4.257`, esquina inferior-derecha del AOI). Pintarlas tal cual
mostraría un borrón de basura sobre el mapa. La capa de suertes, centroides y el
catálogo estaban limpios.

## Decisión

Filtrar los features cuya geometría cae **íntegramente** dentro de una caja de
artefactos (`lon −76.072..−76.064`, `lat 4.251..4.261`) con un script
determinista (`limpiar_contexto.py`, en el repo de insumos). El feature real más
cercano queda a > 1 km de la caja → cero falsos positivos.

Conteo conservado: red_hídrica 104, vías 79, canales 113, cuerpos_agua 16,
estaciones_bombeo 16.

## Consecuencias

- `public/data/contexto_*.geojson` son las versiones **depuradas** (canónicas).
- Los originales se conservan aparte para trazabilidad.
- El test `tests/unit/datos.test.ts` valida la integridad de la capa de suertes en CI.
