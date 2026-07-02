# ADR-0011 — `exceljs` para el reporte de lluvia descargable

Fecha: 2026-07-02 · Estado: aceptado

## Contexto

Recursos Hídricos usa un reporte con formato visual específico ("REPORTE DIARIO DE
PRECIPITACIÓN": logo, título, columnas fijas + días agrupados bajo "SEMANA N", filas
coloreadas por zona, celda de técnico combinada, filas "Promedio Zona" y total resaltadas). El
CSV descargable existente (PR "Lluvia — descargar el consolidado del mes") tiene las mismas
columnas y cálculos pero **no puede** tener logo, colores, celdas combinadas ni encabezados
agrupados — son limitaciones del formato de texto plano.

## Decisión

- Se agrega **`exceljs`** (única dependencia nueva) para generar el descargable como **XLSX
  real** con esa fidelidad visual. Se evaluó no agregar nada y quedarse solo con CSV, pero no
  cumple el pedido explícito del usuario de igualar la estructura visual del reporte oficial.
- **Carga por import dinámico** dentro de la función de exportación (`domain/precipitaciones/
exportXlsx.ts`), igual que `pdfjs-dist` en el Plano de campo (ADR-0008): no entra al bundle
  inicial, solo se descarga cuando el usuario pulsa "Descargar XLSX".
- Todo ocurre **en el navegador** (sin servidor): `workbook.xlsx.writeBuffer()` → `Blob` → `<a
download>`, mismo patrón que el resto de descargas de la app (foto sellada, CSV, plano).
- **Logo opcional**: el generador intenta `fetch('/images/logo-riopaila.png')`; si no existe,
  omite la imagen sin romper la generación (no bloquea esta entrega mientras se consigue el
  archivo del logo oficial).
- **Una sola fuente de verdad**: la agregación (ponderado por área, acumulado por día, filas
  por zona) se factorizó a `domain/precipitaciones/reporteMensual.ts`, consumida por el CSV, la
  tabla en pantalla del nuevo panel "📊 Reporte de lluvia" y el XLSX — no se duplica el cálculo
  en tres sitios.

## Consecuencias

- El XLSX no es pixel-perfect frente al Excel del usuario (colores aproximados, no se replica
  cada detalle de formato de su plantilla), pero sí la estructura: columnas, semanas agrupadas,
  colores por zona, técnico combinado, promedio/total.
- `exceljs` (~1 MB) no afecta el bundle inicial por el import dinámico; si en el futuro se
  necesita generar XLSX en más lugares, ya está disponible.

## Alternativas descartadas

- **Seguir solo con CSV**: no cumple el pedido (sin logo/colores/celdas combinadas).
- **Generar el XLSX en servidor** (API route): añadiría una superficie nueva (endpoint,
  posible autenticación de servidor) sin necesidad — todo el resto de descargas de la app es
  client-side; se mantiene la consistencia.
