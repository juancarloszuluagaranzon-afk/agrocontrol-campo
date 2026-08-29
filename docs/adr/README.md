# Architecture Decision Records (ADR)

Registro de decisiones arquitectónicas relevantes (§10). Una por archivo,
numeradas. No se borran: si una decisión cambia, se marca como _Reemplazada_ y se
añade una nueva.

| #    | Decisión                                                          | Estado   |
| ---- | ----------------------------------------------------------------- | -------- |
| 0001 | Proyecto standalone con Next.js (App Router) y MapLibre           | Aceptada |
| 0002 | Limpieza de las capas de contexto del GeoPDF                      | Aceptada |
| 0003 | Build de producción con webpack por Serwist (Next 16/Turbopack)   | Aceptada |
| 0004 | Outbox de sincronización sobre el store persistido (no Dexie aún) | Aceptada |
| 0005 | Retiro del módulo de Maquinaria                                   | Aceptada |
| 0006 | Indicador de orientación con sensores del dispositivo             | Aceptada |
| 0007 | Multi-planta: Castilla Agrícola junto a Riopaila                  | Aceptada |
| 0008 | "Plano de campo": GeoPDF de muestreo en el cliente (pdfjs)        | Aceptada |
| 0009 | Reporte diario de precipitación por pluviómetro                   | Aceptada |
| 0010 | Planilla de lluvia por técnico, acumulado y mapa de gotas         | Aceptada |
| 0011 | `exceljs` para el reporte de lluvia descargable                   | Aceptada |
| 0012 | Nivel de río (cota) y evaporación en la planilla de lluvia        | Aceptada |
| 0013 | Paginar la descarga en el sync de tablas compartidas              | Aceptada |
| 0014 | Marca de agua del nombre de hacienda en modo Plano                | Aceptada |
| 0015 | Encuesta de satisfacción (popup obligatorio de 5 estrellas)       | Aceptada |
| 0016 | Endurecimiento: rol no auto-editable y auditoría restringida      | Aceptada |
| 0017 | Capas de contexto por planta (Castilla)                           | Aceptada |
| 0018 | Compartir marcador/medición por WhatsApp (deep-link)              | Aceptada |
| 0019 | Maestro de suertes nativo dentro de Rio Map                       | Aceptada |
| 0020 | Apertura offline: shell precacheado + fallback de navegación      | Aceptada |
| 0021 | Capa Sentinel-2 sin nubes (EOX s2cloudless) como satélite alterno | Aceptada |
| 0022 | Capa Sentinel Hub (Copernicus Data Space) por WMS (NDVI reciente) | Aceptada |
| 0023 | Máscara "solo nuestras fincas" para las capas Sentinel Hub        | Aceptada |
| 0024 | Selector de fecha A/B para comparar antes/después (Sentinel Hub)  | Aceptada |
