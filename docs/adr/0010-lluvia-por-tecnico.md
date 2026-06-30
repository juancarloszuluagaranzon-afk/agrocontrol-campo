# ADR-0010 — Planilla de lluvia por técnico, acumulado y mapa de gotas

Fecha: 2026-06-25 · Estado: aceptado

## Contexto

El reporte de lluvia (ADR-0009) registraba un pluviómetro a la vez. En la operación real
cada **técnico** lee a diario un grupo fijo de pluviómetros. El usuario entregó el Excel
"Ponderado de Precipitaciones 2026" (con la asignación técnico→pluviómetro, zona, hacienda,
sitio y **área de influencia** Thiessen) y pantallazos de **Gotas** (Cenicaña) como
referencia (acumulado por estación, mapa con gotas de colores por intensidad).

## Decisión

- **Datos de referencia técnico→PV**: `scripts/convertir_pluviometros.py` une el Excel con
  `contexto_pluviometros.geojson` → `public/data/pluviometros_riopaila.json`
  (`{id, zona, tecnico, hacienda, sitio, area_ha, lat, lon}`). Los **36 IDs cuadran exactamente**
  con la cartografía (0 huérfanos). Validado con Zod (`domain/pluviometros/schema.ts`).
- **Técnico = organizativo, no atado al login**: cualquiera elige su técnico y registra
  (coherente con "cualquiera registra, todos ven", ADR-0009). No se crea rol ni asignación
  usuario→técnico en BD.
- **Planilla diaria**: se elige fecha + técnico → se anotan los mm de **todos** sus
  pluviómetros de una. Nueva acción de store **`setLectura`** que **actualiza** la lectura
  propia de ese `(planta, pluviómetro, fecha)` o crea una nueva → **sin duplicados** al editar
  la planilla. **Sin migración**: sigue siendo la tabla `precipitaciones` (planta, pluviómetro,
  fecha, mm); el técnico/hacienda se derivan de los datos de referencia.
- **Acumulado por PV** (mes/año): cálculo puro (`domain/precipitaciones/acumulado.ts`) sobre
  las lecturas (una por día, la más reciente). Se calcula de lo registrado; **no** se importa
  el histórico 2026 todavía.
- **Mapa "Lluvia de hoy"** (de Gotas): capa dinámica (`LLUVIA_HOY_*`) construida en `MapView`
  desde los pluviómetros de referencia + las lecturas de hoy, gateada por `mapReady` (mismo
  cuidado que el backdrop del plano). **Se dibuja como "gotas" de color** (un icono por nivel
  de mm registrado con `map.addImage`, elegido por `step`; umbrales en `lib/geo/lluvia.ts`) con
  el número de mm dentro. La **enciende cualquier usuario** desde la capa "Pluviómetros (lluvia
  hoy)" de 🗂️ Capas (visibilidad ligada a `activeContext["pluviometros"]`), no solo el
  supervisor. (Antes era un flag `mostrarLluviaHoy` dentro del panel de captura, retirado.)

## Consecuencias

- La planilla es rápida en campo (un técnico, sus PVs, una pasada). Editar el día reescribe la
  misma fila (no apila).
- El acumulado y el mapa parten de las lecturas que se vayan registrando; el **ponderado por
  zona** (promedio por área de influencia, el cálculo central del Excel) queda para una
  siguiente entrega, igual que **importar el acumulado 2026**.
- Castilla no tiene pluviómetros → planilla y mapa de lluvia vacíos (correcto).

## Alternativas descartadas

- **Atar el técnico al usuario autenticado**: exigiría asignación usuario→técnico (infra
  nueva); se mantiene el modelo abierto de ADR-0009.
- **Un `unique (pluviometro, fecha)` en BD**: chocaría con la RLS por autor (varios autores);
  el anti-duplicado se hace por autor en el cliente (`setLectura`).
