# ADR-0012 — Nivel de río (cota) y evaporación en la planilla de lluvia

Fecha: 2026-07-05 · Estado: aceptado

## Contexto

Además de los mm de lluvia por pluviómetro, algunos técnicos reportan a diario **nivel de
río/cota** (metros, en puntos de monitoreo con nombre propio) y **evaporación** (mm, un valor
por técnico/día). El usuario compartió un reporte real de campo con los primeros datos: 5
puntos de nivel de río (Jhon Erick Sanmiguel, Sebastian Rodriguez, Manuel Primero) y 1 de
evaporación (Andrés Mesa), de los 10 técnicos existentes.

## Decisión

- **Tabla nueva `lecturas_hidrologicas`**, no se extiende `precipitaciones`: ahí la llave es un
  `pluviometro: integer`; aquí es un **punto con nombre** (`punto: text`) y hay dos magnitudes
  distintas (metros vs. mm, discriminadas por `tipo`). Mismo patrón de RLS que `precipitaciones`
  (ADR-0009): **SELECT compartido** (`using (true)`), **INSERT/UPDATE solo del autor**, soft
  delete, auditoría (`fn_audit`).
- **Umbrales de alerta en la referencia, no en la transacción**: `public/data/
puntos_hidrologicos_riopaila.json` (análogo a `pluviometros_riopaila.json`) trae
  `alerta/critico/emergencia` opcionales por punto — son estáticos (propiedad del punto de
  monitoreo), no de cada lectura. Solo **"Nivel Río Cauca Luisa 1"** tiene umbrales reales
  (916,50 / 917,00 / 917,50, confirmados con la gráfica del usuario); los otros 4 puntos de
  nivel de río quedan sin umbral hasta que se suministren — sin umbral, `nivelAlerta()` siempre
  da `"normal"` (se captura el dato igual, sin insignia).
- **Evaporación sin punto físico**: se modela igual que nivel de río (`tipo: "evaporacion"`,
  `punto` = nombre del técnico) para no crear una tercera tabla — un valor por técnico/día.
- **Cobertura parcial deliberada**: el formulario es genérico (cualquier técnico con 0, 1 o
  varios puntos); agregar más técnicos/puntos después es solo una edición del JSON de
  referencia, sin tocar código.
- **Misma planilla, sección adicional**: se extiende `PrecipitacionControl.tsx` (no un panel
  aparte) — el técnico reporta lluvia y nivel de río/evaporación en una sola acción de
  "Guardar planilla", igual que en el reporte de campo real (todo en un mensaje).
- **Sin acumulado mes/año**: a diferencia de la lluvia, el nivel de río no es acumulable (es
  una lectura puntual del día), así que no aplica el cálculo de `acumulado()`.

## Consecuencias

- Mismo outbox/sync que lluvia: offline-first, `setLectura` idempotente por
  `(planta,punto,fecha)` del propio autor (evita duplicados al reeditar).
- **Fuera de esta entrega**: reflejar estas lecturas en el CSV/XLSX de "Reporte de lluvia"
  (ADR-0011) — se hace en un PR aparte cuando se confirme el formato deseado.
- Requiere que el usuario aplique la migración `0010_lecturas_hidrologicas.sql` en el SQL
  Editor de Supabase (mismo procedimiento que `0009_precipitaciones.sql`).

## Alternativas descartadas

- **Extender `precipitaciones` con columnas nullable** (`punto`, `cota`, `evaporacion`):
  mezclaría dos tipos de lectura de naturaleza distinta en una sola tabla (violación de
  responsabilidad única, mismo criterio que llevó a crear `precipitaciones` aparte de
  `mediciones` en su momento).
- **Tabla separada para evaporación**: innecesario: comparte exactamente la forma
  `(planta, punto, fecha, valor)` con nivel de río; el discriminador `tipo` alcanza.
