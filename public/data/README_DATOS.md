# Insumos geoespaciales — Riopaila Agrícola

Datos extraídos del GeoPDF `AVENZA_GENERAL_2025.pdf` (QGIS 3.42, EPSG:3115 MAGNA
Colombia Oeste) y reproyectados a **WGS84 / EPSG:4326** (lon/lat), listo para
mapas web (Leaflet, MapLibre, Mapbox) y para cargar a Supabase/PostGIS.

## Resumen de la extracción

- **610 suertes** únicas (código `sec_ste`), en **17 haciendas**, **2.849,12 ha**.
- Geometría = polígonos vectoriales reales de cada lote (linderos), no imagen.
- **Validación de área:** el área geodésica calculada coincide con el área oficial
  embebida en el PDF — error mediano 0,01 %, máximo 3,59 %, 607/610 por debajo del 1 %.
- **Alcance:** la capa `SUERTES2024` del PDF contiene estas 610 suertes (2.849 ha).
  No es la totalidad del ingenio (la tabla del mapa reporta ~5.583 ha netas
  incluyendo lotes fuera de esta capa). Las áreas por suerte sí son las oficiales.

## Archivos

| Archivo | Tipo | Uso |
|---|---|---|
| `suertes_riopaila.geojson` | GeoJSON Polygon (WGS84) | **Capa principal.** Linderos + atributos de cada suerte. |
| `suertes_centroides.geojson` | GeoJSON Point (WGS84) | Centroide de cada suerte (ubicación rápida, etiquetas, marcadores). |
| `suertes_catalogo.json` | JSON array | Catálogo ligero para autocompletar/buscador (sin geometría). |
| `maestro_suertes.json` | JSON objeto (por `sec_ste`) | **Agronomía por suerte** (variedad, corte, fechas, TCH…) del maestro de Riopaila. 604 suertes. Generado con `scripts/convertir_maestro.py`. |
| `suertes_maestro.xlsx` / `.csv` | Tabla | Atributos completos + centroide + áreas. Hoja "Resumen" por hacienda. |
| `contexto_red_hidrica.geojson` | GeoJSON Line | Red hídrica (contexto del mapa). |
| `contexto_vias_acceso.geojson` | GeoJSON Line | Vías de acceso. |
| `contexto_canales.geojson` | GeoJSON Line | Canales de riego y drenaje. |
| `contexto_cuerpos_agua.geojson` | GeoJSON Polygon | Lagos / cuerpos de agua. |
| `contexto_estaciones_bombeo.geojson` | GeoJSON Point | Estaciones de bombeo. |
| `preview_suertes.png` | Imagen | Render de validación de las 610 suertes por hacienda. |

## Esquema de atributos de cada suerte (`properties`)

| Campo | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `sec_ste` | texto | `3110-090` | **Código único** de suerte = `sector`-`suerte`. Clave primaria. |
| `suerte` | texto | `090` | Número de suerte dentro del sector. |
| `sector` | texto | `3110` | Sector / bloque. |
| `hacienda` | texto | `NORMANDIA` | Hacienda (campo `nombre` en el PDF). |
| `planta` | texto | `Riopaila` | Planta. |
| `supervisor` | texto | `Andres Felipe Messa` | Supervisor asignado. |
| `jefe_zona` | texto | `Walter Bermudez` | Jefe de zona. |
| `ha_oficial` | número | `3.428` | Área oficial (ha) embebida en el PDF. **Usar esta como autoridad.** |
| `ha_geom` | número | `3.428` | Área geodésica recalculada (control de calidad). |
| `lat`, `lon` | número | `4.2998, -76.1537` | Centroide del polígono (WGS84). |

## Cómo cargarlo (web)

```js
// Leaflet
const r = await fetch('/data/suertes_riopaila.geojson');
const suertes = await r.json();
L.geoJSON(suertes, {
  onEachFeature: (f, layer) => {
    const p = f.properties;
    layer.bindPopup(`<b>${p.sec_ste}</b> · ${p.hacienda}<br>${p.ha_oficial} ha
      <br>Supervisor: ${p.supervisor}`);
  }
}).addTo(map);
```

## Reproducir / actualizar la extracción

Requiere GDAL (`ogr2ogr`), `shapely`, `pyproj`, `pandas`, `openpyxl`.
1. `ogr2ogr -f GeoJSON -t_srs EPSG:4326 suertes_raw.geojson AVENZA_GENERAL_2025.pdf "SUERTES2024"`
2. Agrupar por `sec_ste`; descartar polígonos < 0,05 ha (artefactos); por cada
   suerte elegir el polígono cuya área geodésica ≈ atributo `Ha`; tomar su centroide.
3. Exportar GeoJSON + tabla.

> Nota técnica: la lectura vectorial del GeoPDF agrupa bajo cada `sec_ste` su
> polígono correcto más copias de render y lotes vecinos. La selección por
> coincidencia de área (paso 2) es lo que garantiza el lindero correcto.

---

## Nota de esta app (AgroControl Campo)

Las capas `contexto_*.geojson` de esta carpeta son las **versiones depuradas**: el
GeoPDF original arrastraba artefactos de extracción (features degenerados
amontonados en ~`-76.069, 4.257`). Se filtraron con `limpiar_contexto.py` (en el
repo de insumos). Conteo tras la limpieza: red_hídrica 104, vías 79, canales 113,
cuerpos_agua 16, estaciones_bombeo 16. Las capas de suertes/centroides/catálogo no
requirieron limpieza. Ver ADR-0002.

---

## Castilla Agrícola (multi-planta, ADR-0007)

Segunda empresa del grupo. Cartografía de **ArcGIS** (shapefile
`STES_AGRICOLAS_JUN_9_2026`, WGS84/CRS84), **polígonos por tablón**, con el código
de suerte como atributo (`Suerte_Sap`, ej. `2108-122`). A diferencia de Riopaila,
**no** viene de un GeoPDF: el shapefile trae la tabla completa, así que la
integración es directa (sin heurísticas de área).

| Archivo | Tipo | Uso |
|---|---|---|
| `tablones_castilla.geojson` | GeoJSON Polygon (WGS84) | **Capa principal** de Castilla. Mismo esquema `properties` que Riopaila (`tab_id`, `sec_ste`, `hacienda`, `tablon`…). |
| `tablones_castilla_catalogo.json` | JSON array | Catálogo ligero (buscador). |
| `maestro_castilla.json` | JSON por `sec_ste` | Agronomía por suerte (CAST + CAUC). |

- **2.445 tablones / 853 suertes / 60 sectores / 61 haciendas.** Empresas en el
  insumo: Agrícola Castilla (776 suertes) + Agrícola Invasión (77).
- **Cruce con el maestro: 96 %** (821/853: 775 CAST + 46 CAUC). Las 32 suertes sin
  dato igual se dibujan (geometría + sector + hacienda + área del shapefile).
- Un tablón partido en varios polígonos con el mismo número se fusiona en **un**
  tablón (MultiPolygon, área sumada) para que `tab_id` sea llave única.

Reproducir:

```bash
python scripts/convertir_castilla.py            # shapefile -> geojson + catálogo
python scripts/convertir_maestro.py castilla    # maestro.csv -> maestro_castilla.json
```
