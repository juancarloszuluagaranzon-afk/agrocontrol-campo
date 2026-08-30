# ADR-0026 — Escala de color del índice activo (leyenda abajo-izquierda)

Fecha: 2026-08-29 · Estado: aceptado

## Contexto

Los índices Sentinel Hub (NDVI/NDMI, ADR-0022) pintan el mapa con colores cuyo significado no es obvio
para el usuario de campo. Se pidió que, **al tener un índice encendido**, aparezca una **escala de color**
que lo explique, en el **margen inferior izquierdo** de la pantalla.

## Decisión

- Componente `SentinelLegend`: una tarjeta compacta con el **degradado del índice** (menor→mayor) y
  etiquetas en los extremos (p. ej. NDVI "Suelo/poca → Vigorosa"; NDMI "Seco → Húmedo"). Una tarjeta por
  índice activo (se apilan si hay varios).
- **Visible mientras el índice esté encendido**, no solo con el panel 🗂️ Capas abierto: se monta en
  `MapScreen`, no dentro del bloque de herramientas.
- **Posición** abajo-izquierda, **encima del FAB de herramientas**
  (`bottom-[calc(4.5rem+safe-area)]`), `pointer-events-none` (informativa, deja pasar los toques al mapa).
  Se **oculta cuando hay un panel inferior** (tablón seleccionado o medición), mismo criterio que
  `ToolsMenu`, para no encimarse con los bottom-sheets (`inset-x-2`).
- Rampas por índice en una tabla (`INDEX_LEGENDS`); solo se muestran los índices con rampa definida (los
  compuestos como color real no llevan escala).

## Consecuencias

- El usuario entiende los colores sin salir del mapa. Sin dependencias ni estado nuevo (lee
  `sentinelHubVisible`, `selected`, `measureMode`).
- Las rampas son **representativas** del significado (bajo→alto); el color exacto lo define el producto de
  la config CDSE, pero la lectura es la misma. Si a futuro se personaliza el evalscript, se ajusta la
  rampa aquí.
