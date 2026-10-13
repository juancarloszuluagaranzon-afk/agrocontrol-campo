# ADR-0037 — Lluvia de Castilla: red de pluviómetros y asignación oficial por suerte

Fecha: 2026-10-13 · Estado: aceptado

## Contexto

La planilla de lluvia, el reporte mensual, las gotas de "lluvia hoy" y la lluvia
por suerte de la capa de Edad (ADR-0009, 0010, 0034) solo funcionaban en
Riopaila: la red de pluviómetros estaba fija en `pluviometros_riopaila.json`.
Recursos Hídricos de Castilla entregó tres archivos:

- **Características de pluviómetros**: 39 pluviómetros con código, zona (1–3),
  nombre, técnico y coordenadas.
- **Pluviómetro suerte**: el pluviómetro asignado a cada suerte (916 filas).
- **Precipitación diaria por pluviómetro**: lluvia diaria de 2017 al
  27-sep-2026 (132.000 lecturas, formato largo).

## Decisión

- `scripts/convertir_pluviometros_castilla.py` genera
  `public/data/pluviometros_castilla.json`, con el mismo formato que Riopaila.
  `hacienda` es el nombre del pluviómetro, y `area_ha` es el área neta del
  maestro de las suertes asignadas, para el ponderado del reporte. También
  genera `pluviometros_suertes_castilla.json` (suerte → pluviómetro), solo con
  pluviómetros de la red.
- Cada planta declara su red (`PlantaConfig.pluviometros`) y, si la tiene, su
  asignación oficial (`pluviometrosSuertes`). `usePluviometros` y la nueva
  `useAsignacionPluviometros` leen la de la planta activa.
- `asignarPluviometros` usa, en este orden:
  1. la **asignación oficial**, si el pluviómetro está en la red;
  2. el polígono de **Thiessen** (Riopaila);
  3. el pluviómetro **más cercano**.

  En Castilla, 753 de las 782 suertes del mapa tienen asignación oficial; las
  29 restantes van al más cercano.

- Castilla tiene la capa "Pluviómetros (lluvia hoy)". El encabezado de los
  reportes usa la razón social de la planta ("CASTILLA AGRICOLA S.A.").
- **Lluvia histórica**: `scripts/gen_precip_castilla_sql.mjs` convierte el CSV a
  SQL idempotente con UUID determinista, igual que `gen_precip_sql.mjs`. Genera
  un archivo por trimestre para el SQL Editor y valida que la serie de Excel
  coincida con año/mes/día, que no haya mm negativos ni duplicados y que el
  pluviómetro esté en la red. Se carga **solo 2026**: 10.530 lecturas, del
  1-ene al 27-sep.

## Consecuencias

- Los técnicos de Castilla pueden registrar su lluvia diaria en Rio Map, y la
  capa de Edad muestra la lluvia por suerte también en Castilla.
- No se carga el histórico 2017–2025 (122.000 filas) en Supabase: la
  sincronización descarga la tabla compartida a cada teléfono, y eso volvería a
  gastar la cuota de transferencia (ADR-0033). Si el estimador de TCH lo
  necesita, lo lee del CSV.
- La carga de 2026 baja unas 10.500 filas a cada teléfono una sola vez (~3 MB).

## Datos a revisar con Recursos Hídricos de Castilla

- 2118 (San Rafael 1) y 2128 (La Tupia) tienen la misma coordenada.
- 2113 está asignado a la suerte 2112-434, pero no está en la red: va al más
  cercano.
- 2950 tiene lecturas hasta nov-2024 y no está en la red: no se carga.
- 70 suertes del Excel no tienen pluviómetro (entre ellas toda la hacienda 2120).
- Faltan las lecturas del 28-sep en adelante.
