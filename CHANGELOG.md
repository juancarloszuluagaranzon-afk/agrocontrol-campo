# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/);
versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

### Mapa — comparar antes/después de un riego (fecha A/B en Sentinel Hub)

- Con una capa **🛰️ Sentinel Hub** encendida aparece un selector **📅 Fecha — comparar riego** en 🗂️
  Capas: dos fechas **Antes/Después** con un botón para **alternar** cuál se muestra sobre la misma vista.
  Cada fecha resuelve a la **última escena Sentinel-2 hasta ese día** (ventana de 14 días, por la revisita
  ~5 días y las nubes). Vacío = imagen más reciente. Ideal para ver el NDVI/NDMI antes y después de regar.
  El cambio de fecha re-tesela en caliente (`setTiles`), sin recargar el mapa. Ver **ADR-0024**.

### Mapa — Sentinel Hub solo sobre nuestras fincas (máscara)

- Con una capa **🛰️ Sentinel Hub** encendida, el índice (NDVI/NDMI) ahora se ve **solo sobre las suertes
  de Riopaila y Castilla**: alrededor el satélite queda **atenuado** (velo oscuro), para resaltar los
  lotes propios manteniendo el contexto de ríos y vías. Es una **máscara inversa** cliente (las suertes
  recortadas como huecos), 100% offline y sin dependencias nuevas; se arma desde la cartografía oficial
  que la app ya carga, así que sigue en sincronía si cambian las suertes. Ver **ADR-0023**.

### Mapa — capas Sentinel Hub (Copernicus Data Space): NDVI + NDMI recientes

- Nuevas capas **🛰️ Sentinel Hub** en 🗂️ Capas (una por índice, con su propio toggle): imágenes
  **Sentinel-2 recientes** e índices agronómicos servidos por WMS desde el **Copernicus Data Space
  Ecosystem**, el "siguiente paso" que anticipó ADR-0021 frente al mosaico anual sin nubes de EOX. Por
  defecto **NDVI** (vigor de la vegetación) y **NDMI** (humedad de la vegetación, útil para riego). A
  diferencia del compuesto anual, cada tesela es la **última imagen** bajo el umbral de nubes, así que
  sirve para **monitoreo temporal del cultivo**.
- Es **opcional y de alta gratuita**: se activa poniendo `NEXT_PUBLIC_SENTINELHUB_INSTANCE_ID` (más los
  opcionales `…_LAYERS`, por defecto `NDVI,NDMI`, y `…_MAXCC`, por defecto `20`) en `.env.local`. Sin
  ese instance ID las capas y sus toggles **no aparecen** (degradación limpia). El acceso OGC de CDSE se
  autentica con el instance ID en la URL, **sin proxy ni OAuth**; las teselas se cachean con
  `StaleWhileRevalidate` (offline en zonas ya navegadas, refrescando en segundo plano). Ver **ADR-0022**.

### Maestro — refrescado al día (espejo del maestro del ingenio)

- El maestro agronómico de Rio Map (`maestro_suertes.json` / `maestro_castilla.json`) estaba
  **desactualizado**: mostraba cortes/edades viejos (p. ej. la suerte 2123-013 en corte 2 y "13,9
  meses" cuando ya iba en corte 3 y ~1,7 meses tras la cosecha de julio 2026). El área sí coincidía,
  por eso pasaba desapercibido. Ahora se **regenera desde el `maestro.csv` de maestro-riopaila** (la
  fuente de verdad): **RIOP 605** y **Castilla 883** suertes (antes 595/821), con cortes, fechas,
  toneladas y responsables al día. La **edad se calcula en vivo**, así que ahora sale correcta.
- Nuevo importador reutilizable `scripts/import_maestro.mjs` para volver a sincronizar cuando el
  ingenio corte/renueve: `node scripts/import_maestro.mjs [ruta/maestro.csv]`.

### Mapa — capa satelital Sentinel-2 sin nubes (EOX)

- Nueva capa **🛰️ Sentinel-2 (sin nubes)** en 🗂️ Capas: un mosaico satelital de EOX
  (`s2cloudless-2025`, gratis y sin clave) que se enciende **encima del satélite Esri** —a veces más
  reciente y siempre libre de nubes— dejando las suertes visibles arriba. Sus teselas se cachean
  (offline en zonas ya navegadas). Es un compuesto anual (no fecha específica ni NDVI, que vendrían
  después). Ver **ADR-0021**.

### Lluvia — la planilla arranca en el día anterior (día vencido)

- La pluviometría se registra **día vencido**, así que la planilla 🌧️ ahora trae por defecto el
  **día anterior** (p. ej. hoy 23 → 22) en vez de hoy. Sigue siendo editable para corregir días
  previos.

### La app ahora **abre y funciona sin señal** (offline)

- Antes, en campo sin conexión, Rio Map **no abría** (pantalla en blanco). Ahora el service worker
  sirve un **shell offline precacheado** ante cualquier navegación sin red, así que la app **siempre
  abre**: muestra el mapa con los datos de suertes y los tiles satelitales ya cacheados, y el **GPS
  funciona**. El satélite se ve donde ya lo hayas navegado con señal (se cachea al vuelo). Sobrevive a
  los despliegues (el shell se versiona junto a su código, sin quedar roto por chunks viejos). Ver
  **ADR-0020**.

### Lluvia — reasignación de responsable del pluviómetro 412

- En la planilla de precipitación, el pluviómetro **412** (Tequendama · Pozo Tequendama, Zona 2)
  pasa de **Freddy Reyes** a **Alberto Vasquez**.

### Maestro de suertes nativo dentro de Rio Map

- Nueva herramienta **📖 Maestro de suertes** en el menú ✏️: una consulta nativa del maestro de la
  **planta activa**. Se busca por suerte o hacienda, se abre la ficha con toda la agronomía
  (variedad, edad viva, cortes, fechas, área neta, toneladas, TCH, zona, técnico, responsable,
  empresa) y un botón **"Ver en el mapa"** que vuela a la suerte y la resalta. Reutiliza los datos
  ya cargados (`useMaestro`/`useCatalogo`) y el `flyTo` del buscador. Ver **ADR-0019**.

### Compartir marcadores y mediciones por WhatsApp

- En **📍 Marcadores** y **📐 Mediciones guardadas**, cada elemento tiene ahora un botón
  **Compartir** (📤): abre la hoja de compartir del sistema (WhatsApp, correo…) con un link que
  abre Rio Map en ese punto. Para una medición, el link apunta a su **primer punto de referencia**.
  Quien reciba el link (y tenga cuenta) cae en la planta correcta, vuela al punto y ve un pin con
  el nombre. Ver **ADR-0018**.

### Mapa — Castilla ahora tiene sus propias capas de contexto

- Las capas de contexto (red hídrica, canales de riego, drenajes, vías, pozos, haciendas) pasan a
  ser **por planta**: antes solo mostraban datos de Riopaila y en Castilla salían vacías. Castilla
  suma además capas nuevas de infraestructura de riego: **hidrantes, llaves y tubería enterrada**.
- La red hídrica de Castilla se limita a los **ríos con nombre** (se descartaron ~38 mil
  micro-drenajes sin nombre que la hacían pesar 18 MB) y municipios se omitió por bajo valor/peso.
  Los shapefiles vienen en datum Bogotá/West y se reproyectan leyendo el `.prj`. Ver **ADR-0017**.

### Mapa — canales de riego y drenajes en capas separadas

- La capa "Canales riego/drenaje" se dividió en dos interruptores independientes en 🗂️ Capas:
  **Canales de riego** (50, cian) y **Drenajes** (88, ámbar). Así se puede ver solo riego, solo
  drenaje, o ambos. Los canales oficiales ya venían etiquetados por tipo (`RIEGO_DREN`).

### Seguridad — el rol no es auto-editable y la auditoría queda restringida

- **Corrige un escalamiento de privilegios**: un usuario podía cambiar su propia columna `rol`
  (la RLS de `profiles` no distinguía columnas) y ascenderse a "dirección". Ahora un trigger
  bloquea el cambio de rol salvo que lo haga dirección o el administrador desde el SQL Editor.
- **Cierra una fuga de datos**: `audit_log` (que guarda el antes/después completo de cada
  cambio) tenía lectura abierta a cualquier usuario autenticado, exponiendo marcadores,
  mediciones y encuestas privadas de todos. Ahora solo la lee dirección. Migración **0012**.
  Ver **ADR-0016**.

### Mapa — capas de contexto actualizadas con cartografía oficial nueva

- Nueva entrega de shapefiles de Ingeniería Agrícola. Al regenerar, 7 de las 9 capas quedaron
  idénticas a lo ya integrado; se refrescaron **vías de acceso** (79→80) y **estaciones de
  bombeo** (16→17), ahora del dato oficial (antes salían de una extracción del GeoPDF).

### Encuesta de satisfacción (popup obligatorio de 5 estrellas)

- Al entrar, cada usuario ve una sola vez un popup para calificar la app de 1 a 5 estrellas, con
  un comentario opcional — obligatorio, sin opción de posponer. Funciona sin conexión (se guarda
  y sincroniza cuando vuelve la señal) y no se vuelve a mostrar una vez respondido, ni siquiera
  desde otro dispositivo. Tabla nueva `encuesta_satisfaccion` (RLS privada, migración **0011**).
  Ver **ADR-0015**.

### Mapa — marca de agua del nombre de hacienda en modo Plano

- En modo **Plano**, el nombre de cada hacienda aparece ahora como una marca de agua (texto
  grande, semitransparente, en el color propio de la hacienda) sobre su área — se apaga al
  acercar el zoom, justo donde ya aparecen los códigos de suerte individuales. Aplica a ambas
  plantas (en Castilla, sin paleta de colores propia, usa un gris oscuro uniforme). Ver
  **ADR-0014**.
- De paso se corrigió un bug preexistente que afectaba **todo el texto del mapa**: códigos de
  suerte, nombres de marcadores y mediciones, números de punto de muestreo y los mm sobre las
  gotas de lluvia usaban una fuente (`"Open Sans Regular"`) que no existe en el servidor de
  glyphs configurado — no se veían. Ahora usan `"Open Sans Semibold"`, la única disponible ahí.
- También se corrigió una condición de carrera en el cambio Satélite↔Plano: si se tocaba el
  conmutador antes de que el mapa terminara de montar sus capas, el cambio de modo no se
  aplicaba y quedaba pegado hasta el siguiente clic.

### Fix — el buscador de suertes no funcionaba en Castilla

- `SearchBox` cargaba el catálogo de Riopaila con una ruta fija, sin importar la planta
  activa. En Castilla, escribir un código real de suerte (ej. `2108-122`) no encontraba
  nada porque comparaba contra suertes de otro ingenio. Ahora usa `useCatalogo()` (ya
  usado en la tabla de área neta), que carga el catálogo de la planta activa y se
  recarga al cambiar de planta.

### Fix — datos de fechas pasadas que no aparecían en la planilla de lluvia

- Al elegir una fecha con historial, los pluviómetros podían mostrarse vacíos aunque el dato
  sí estuviera guardado en Supabase: la descarga de sincronización no paginaba y PostgREST la
  cortaba en 1000 filas. Ahora se paginan las cuatro tablas del sync (marcadores, mediciones,
  precipitaciones, lecturas hidrológicas) para traer siempre el total real. Ver **ADR-0013**.

### Lluvia — confirmación y limpieza al guardar la planilla

- Al guardar la planilla de lluvia (mm por pluviómetro + nivel de río/evaporación), ahora se
  ve una confirmación clara ("✓ N lectura(s) guardada(s)") y los campos quedan en blanco
  (listos para seguir anotando), sin perder lo ya guardado: si se cambia de técnico o de fecha
  y se vuelve, el dato guardado se vuelve a mostrar.

### Lluvia — nivel de río (cota) y evaporación en la planilla

- La planilla 🌧️ Lluvia ahora captura, además de los mm por pluviómetro, **nivel de río
  (cota)** en puntos de monitoreo con nombre propio y **evaporación** (un valor por
  técnico/día) — todo en la misma acción de "Guardar planilla". Cobertura inicial: 4 técnicos
  (Jhon Erick Sanmiguel, Sebastian Rodriguez, Manuel Primero, Andrés Mesa); el resto sigue solo
  con pluviómetros. Agregar más técnicos/puntos es solo editar el archivo de referencia, sin
  tocar código.
- **Alertas por umbral**: si un punto de nivel de río tiene definidos alerta/crítico/emergencia
  (hoy solo "Nivel Río Cauca Luisa 1": 916,50/917,00/917,50 m), el formulario muestra una
  insignia cuando la lectura los alcanza. Los demás puntos capturan el dato sin insignia hasta
  que se suministren sus umbrales.
- **Dato compartido y offline**, mismo patrón que la lluvia: tabla nueva `lecturas_hidrologicas`
  (RLS de lectura abierta, escritura del propio autor, migración **0010**), outbox/sync
  reutilizado. Ver **ADR-0012**. No se refleja aún en el reporte/CSV/XLSX de lluvia (siguiente
  entrega).

### Lluvia — panel "Reporte de lluvia" y descarga en XLSX con el formato oficial

- Nueva herramienta **📊 Reporte de lluvia** (pantalla completa, abierta a cualquier usuario):
  selector de mes + tabla con el **mismo look del reporte oficial** de Recursos Hídricos —
  zonas por color, encabezados **"SEMANA N"** agrupando los días, celda de **técnico
  combinada**, filas **"Promedio Zona"** y el **total** resaltadas.
- Botón **⬇️ Descargar XLSX**: genera un Excel real (no CSV) con esa misma estructura visual
  —colores, semanas agrupadas, celdas combinadas y logo si hay uno disponible—, usando
  **exceljs** (import dinámico, no entra al bundle inicial; ver **ADR-0011**).
- La agregación (ponderado por área, acumulado por día) se unificó en
  `domain/precipitaciones/reporteMensual.ts`: una sola fuente de verdad para el CSV, la tabla
  en pantalla y el XLSX.
- Nota de alcance: la estación "Bella vista" (zona GAN) del reporte del usuario no está en la
  cartografía oficial de pluviómetros (36 estaciones validadas) ni en los datos ya integrados;
  no aparece en el reporte de la app (diferencia despreciable, ~0,04% del área total).

### Lluvia — descargar el consolidado del mes (CSV para Recursos Hídricos)

- Nuevo botón **⬇️ Descargar consolidado del mes (CSV)** en la herramienta 🌧️ Lluvia: baja
  un archivo con el **mismo formato de la planilla** de Recursos Hídricos —pluviómetros en
  filas (zona, hacienda, localización, técnico, PLUV No, área de influencia), **los días del
  mes en columnas** y **Acumul. MES / AÑO**— más una fila **"Promedio Zona"** por zona y el
  **total** de la planta, **ponderados por área de influencia** (Thiessen). Así Recursos
  Hídricos actualiza su acumulado pegando el archivo.
- Formato es-CO (separador `;`, decimales con coma, BOM para los acentos); abre directo en
  Excel. Sin dependencias nuevas. Nota: **Acumul. AÑO** refleja solo lo registrado en la app
  hasta que se importe el histórico 2026.

### Lluvia — gotas en el mapa para todos (desde 🗂️ Capas)

- La **lluvia de hoy** se ve ahora activando la capa **"Pluviómetros (lluvia hoy)"** desde
  🗂️ **Capas** — la puede ver **cualquier usuario**, no solo el supervisor que captura. Cada
  pluviómetro se dibuja como una **gota de color** (estilo Gotas) con los **mm del día** dentro
  (gris sin lluvia → morado en extrema). Se retiró el interruptor que vivía en el panel de
  captura.

### Lluvia — planilla por técnico, acumulado y mapa de gotas

- La herramienta **🌧️ Lluvia** pasa a ser una **planilla por técnico**: eliges fecha y
  **técnico** y anotas los mm de **todos sus pluviómetros** de una. Cada estación muestra su
  **hacienda · sitio** y el **acumulado del mes y del año**. La asignación técnico→pluviómetro
  sale del Excel oficial de Riopaila (36 estaciones, 2 zonas), unida a la cartografía con
  `scripts/convertir_pluviometros.py` → `pluviometros_riopaila.json`.
- **Sin duplicados**: re-guardar un pluviómetro del mismo día **actualiza** la lectura (no
  apila). Sin cambios de BD (sigue la tabla `precipitaciones`).
- **Mapa "Lluvia de hoy"** (idea tomada de la app _Gotas_ de Cenicaña): los pluviómetros se
  pintan como **gotas de colores** según los mm del día (escala baja→alta) con su valor. Se
  activa desde el panel de lluvia. Ver **ADR-0010**.

### Mapa — área total de la suerte en el panel del tablón

- Al tocar un tablón, el panel muestra ahora también el **Área de la suerte** (área
  neta de todos sus tablones, tomada del maestro). Antes solo se veía el área del
  tablón; para suertes de varios tablones el total es distinto y útil. Dato ya
  presente en `maestro_suertes.json` (`area_neta_ha`); sin cambios de BD ni datos.

### Lluvia — reporte diario de precipitación por pluviómetro

- Nueva herramienta **🌧️ Lluvia (precipitación)**: el administrador registra los
  **milímetros** leídos en un **pluviómetro** (por ID) en una **fecha** (hoy por
  defecto). Debajo, el **historial** de lecturas recientes.
- **Dato compartido**: cualquier usuario autenticado registra y **toda la empresa lo
  ve** (a diferencia de marcadores/mediciones, que son privados). Edición/borrado solo
  del autor. Tabla nueva `precipitaciones` (migración **0009**, RLS de lectura abierta,
  soft delete + auditoría). Ver **ADR-0009**.
- **Offline-first**: reutiliza el outbox (ADR-0004); las lecturas se guardan en el
  dispositivo y se sincronizan al volver la red. ⚠️ Requiere aplicar la migración 0009
  (`supabase db push`).

### Mapa — capas de agua oficiales de Ingeniería Agrícola

- El área de **Ingeniería Agrícola** entregó su cartografía oficial y se integró como
  **capas de contexto** (activables desde 🗂️ Capas, offline). Cuatro **nuevas**:
  **freatímetros** (pozos, con nivel freático), **pluviómetros**, **polígonos de
  Thiessen** (zonas de lluvia, relleno tenue) y **límites de hacienda** (contorno).
- Se **reemplazaron** con el dato oficial las capas que antes salían de un GeoPDF:
  **canales de riego/drenaje**, **cuerpos de agua** y **red hídrica** (esta última, la
  red IGAC regional: ríos Cauca, La Paila, Bugalagrande…).
- Generadas con `scripts/convertir_contexto.py` (pyshp + pyproj, reproyección
  EPSG:3115→4326, codificación por capa). Sin BD ni dependencias nuevas de la app.

### Foto de campo — foto sellada con ubicación y suerte

- Nueva herramienta **📷 Foto de campo**: el técnico, parado en un punto, **toma una
  foto** con la cámara del teléfono y la app la **sella** (marca de agua) con las
  **coordenadas GPS**, la **suerte y hacienda** donde está y la **fecha/hora** —queda
  como evidencia georreferenciada para **descargar o compartir** (WhatsApp, correo).
- La **suerte se detecta sola** según la ubicación (cruzando el GPS con la cartografía
  de lotes) y es **editable** por si el GPS cae en el lote vecino (buscador del
  catálogo). Si estás fuera de todo lote, el sello lleva solo coordenadas + fecha.
- **Sin BD ni galería**: todo ocurre en el dispositivo; el celular guarda la foto en su
  galería al compartir/descargar. Funciona offline (la cartografía ya está cacheada).
- La foto sellada lleva el **logo de Rio Map** como insignia en el recuadro, para
  identificar la evidencia como generada por la app (también offline).

### Plano de campo — muestreo de suelos desde un GeoPDF (reemplaza Avenza)

- Nueva herramienta **🗺️ Plano de campo**: el técnico **sube un GeoPDF** de muestreo
  (georreferenciado) y la app lo muestra como **capa de imagen sobre el mapa** (con
  opacidad ajustable), con el **GPS encima** para caminar a los puntos —como en
  Avenza, pero sin pagarlo.
- **Puntos de muestreo**: se **extraen automáticamente** del PDF (capa
  `punto_muestreo`) y aparecen como **marcadores numerados** + un **checklist** con la
  **distancia** a cada punto y una casilla **"muestreado"** (verde al marcar). Si el
  PDF no trae puntos, se pueden **añadir a mano**.
- **Por dispositivo y offline**: el plano (puntos + estado) se guarda en el
  dispositivo (localStorage + IndexedDB para la imagen) y **sobrevive recargas**; no
  va a la BD (uso ocasional). Funciona sin conexión.
- Detalle técnico (pdfjs por import dinámico, georreferencia por bytes, worker
  auto-alojado): **ADR-0008**. Sin cambios de BD.

### Mapa — la cruz de marcado se ve en móvil

- Al crear un marcador, el formulario pasa a una **hoja inferior** (no al panel
  superior) y se quitó el `autoFocus`: así dejan de **tapar el centro** de la
  pantalla, donde está la **cruz ✛** de marcado preciso (en móvil, el panel + el
  teclado la ocultaban). Primero alineas la cruz, luego escribes el nombre.
- La cruz se ve mejor sobre el satélite: trazo más grueso, mayor contraste y por
  encima de los paneles.

### Mapa — calidad de la ubicación (GPS)

- El halo del punto azul ahora es el **disco de precisión real** (radio = `accuracy`
  en metros, como Avenza/Google Maps): se ve cómo la incertidumbre **se cierra** al
  afinar el GPS, en vez de un círculo de tamaño fijo que la ocultaba.
- Lectura **siempre fresca** (`maximumAge: 0`): el punto ya no arranca en una
  posición cacheada vieja.
- Al activar "Mi ubicación" se centra en la primera lectura (rápida, aproximada) y
  se **re-centra una vez** al llegar el primer fix preciso, para no quedar fijado en
  la posición burda. Mientras tanto se muestra **"Afinando ubicación…"**.
- Sin cambios de BD ni dependencias. Helpers puros en `lib/geo/gps.ts` con tests.

### Multi-planta — Castilla Agrícola junto a Riopaila

- La app sirve ahora a **dos empresas**: al abrirla por primera vez se elige la
  **planta** (Riopaila o Castilla); la elección se **guarda** y en cada reapertura
  se entra directo a esa planta. Se puede cambiar desde el **header** (no recarga
  el mapa con botones sueltos; reconstruye la cartografía de la otra empresa).
- **Castilla**: **2.445 tablones / 853 suertes** (cartografía ArcGIS, WGS84) con su
  **maestro** propio que cruza el **96 %** de las suertes (variedad, edad, corte).
  Datos en `public/data/tablones_castilla.*` y `maestro_castilla.json`, generados
  con `scripts/convertir_castilla.py` y `scripts/convertir_maestro.py castilla`.
- Cada planta carga **solo sus datos** (cartografía, catálogo, maestro y encuadre);
  configuración en `lib/plantas.ts`. Sin cambios de BD. Ver **ADR-0007**.

### Mapa — datos agronómicos por suerte (maestro)

- Al tocar un tablón, el panel muestra ahora la **Agronomía** de su suerte tomada
  del **maestro de Riopaila**: **variedad**, **edad** (calculada en vivo igual que
  el maestro: meses desde la fecha más reciente entre siembra y último corte),
  **n.º de corte** y **próximo corte**. Cubre 604 de las 610
  suertes (las 6 sin dato muestran "Sin datos del maestro"). Datos estáticos en
  `public/data/maestro_suertes.json` (generados con `scripts/convertir_maestro.py`
  desde el repo `maestro-riopaila`); funciona offline. Sin cambios de BD.

### Mapa — menú de herramientas (estilo Avenza)

- La pantalla queda **despejada**: las herramientas (dibujar y medir, marcadores,
  mediciones, capas) se agrupan en un **menú ✏️📏** abajo-izquierda, en vez de
  varios botones sueltos. Sobre el mapa quedan siempre visibles el **buscador**,
  el conmutador **Satélite/Plano** y **Mi ubicación** (GPS). Al medir, el panel
  inferior trae un botón **✕** para terminar.
- **Panel de medición responsivo**: el valor va arriba y las acciones (Marcar,
  GPS, Guardar, Deshacer y Limpiar) en una grilla que se acomoda en pantallas
  angostas (ya no se cortan ni se encima el texto). El botón ✏️ se oculta mientras
  hay un panel inferior abierto, para no montarse con él.

### Mapa — guardar mediciones

- Al medir un **área** o una **distancia** ahora se puede **💾 Guardar** con un
  nombre. Las mediciones quedan en una lista (**📐 Mediciones**) para volver a
  ellas (**ir**) o **borrarlas**, y se dibujan en el mapa (relleno violeta con su
  nombre). Son **privadas** (solo quien las crea), funcionan **offline** (outbox)
  y se sincronizan a la nube (tabla `mediciones`, RLS por dueño, migración 0008).

### Mapa — indicador de orientación (brújula tipo Avenza)

- **Cono de dirección**: junto al punto azul de "Mi ubicación", un cono
  semitransparente (~60°) con el vértice en el usuario indica hacia dónde apunta
  el teléfono. Usa los sensores del dispositivo (brújula / magnetómetro), por lo
  que **mantiene el rumbo aunque estés quieto** (el `heading` del GPS se anula al
  detenerse). Rotación suave (interpolación por el camino corto, ~60 fps) y tamaño
  constante en pantalla. Aviso de **calibración** si la brújula está imprecisa.
  En iOS pide permiso de orientación al activar la ubicación; requiere HTTPS.
  Ver [ADR-0006](docs/adr/0006-indicador-orientacion-sensores.md).

### Mapa — etiqueta por tablón

- **Cada tablón** se rotula con el código de su suerte (`sec_ste`), visible desde
  zoom 13. Así todos los tablones quedan identificados (el código se repite entre
  los tablones de una misma suerte). El número de tablón sigue en el panel al
  tocar el lote.

### Marca — "Rio Map"

- **Nombre oficial**: la app pasa a llamarse **Rio Map** (antes "AgroControl
  Campo"). Se actualiza el nombre visible, el título, el manifest PWA y los docs.
- **Logo oficial**: nuevo ícono (pin sobre campo al atardecer) en todos los
  tamaños — favicon, apple-touch e íconos PWA 192/512 + maskable.
- Las claves internas (cachés del service worker, almacenamiento local de
  marcadores) se conservan para no invalidar datos ni cachés de usuarios.

### Enfoque en campo — retiro de Maquinaria y responsive

- **Maquinaria eliminada** (ADR-0005): se retira la pestaña 🚜, su programación,
  historial y los íconos del mapa. La app queda enfocada en el mapa de tablones
  (identificar, medir, marcar, GPS). La barra inferior desaparece (una sola
  sección) y el mapa gana pantalla. La tabla `programacion` se conserva en la base
  de datos como historial (no se borra).
- **Responsive para campo** (uso ~90 % en móvil): el buscador y los controles
  dejan de solaparse en pantallas angostas (los controles bajan bajo el buscador);
  los paneles inferiores respetan el área segura del dispositivo (notch / barra de
  gestos); anchos con tope para no desbordar. Verificado en e2e a 360 px.

### Fase 7 — Modo Plano, marcado preciso y marcadores

- **Modo Plano**: conmutador Satélite/Plano. El plano colorea los tablones por
  hacienda (gama propia, 17 colores) con leyenda plegable, al estilo del plano
  oficial de Ingeniería Agrícola. El satélite sigue disponible.
- **Marcado preciso**: retícula central fija (✛) con lectura de coordenadas en
  vivo; el punto se fija en el centro exacto del mapa (no bajo el dedo), con
  ajuste al vértice de tablón más cercano (≤ ~5 m) al medir.
- **Marcadores privados** (§5): puntos personales con nombre, nota y color,
  visibles **solo para quien los crea** (RLS por `user_id`, migración 0007).
  Funcionan offline (outbox) y se sincronizan/bajan a cualquier dispositivo del
  usuario.
- **Área neta por hacienda**: tabla plegable (solo en modo Plano) con el área
  oficial sumada, tablones y suertes por hacienda, más el total.

### Fase 6 — Tablones (cartografía oficial de Ingeniería Agrícola)

- **Nueva fuente de verdad**: capa oficial de **1.378 tablones** (subdivisiones de
  las 610 suertes), reproyectada de EPSG:3115 a WGS84. Cobertura completa del
  ingenio (**5.567 ha** vs 2.849). Cada suerte = N tablones; el área oficial es
  por tablón (la de la suerte = suma). `tab_id` (ej. `3111-020-T3`), numerados
  1..N por orden geográfico. Scripts en `scripts/`.
- **Mapa**: dibuja e identifica cada tablón; el panel muestra
  "Suerte X · Tablón n de N · área". Buscador por `tab_id`/`sec_ste`/hacienda.
- **Maquinaria por tablón**: el formulario asigna a un tablón (autocompletar);
  hacienda y centroide se derivan del tablón. `programacion` referencia `tab_id`
  (migración 0006).
- **Capas de contexto oficiales**: cuerpos de agua (16) y redes hídricas (103)
  reemplazan las versiones extraídas del GeoPDF (que tenían artefactos).

### Fase 5 — Endurecimiento (en curso)

- **PWA offline real** (§14): el service worker cachea `/data/*.geojson|json`
  (cache-first) y los tiles satelitales de Esri del AOI (cache-first con límite de
  entradas y expiración) — el mapa y los datos sirven sin red.
- **Accesibilidad** (WCAG AA, §11): foco visible por teclado y enlace "saltar al
  contenido".
- **CI**: opta por Node.js 24 en las JS actions (sin aviso de deprecación).
- **Manual de uso** ([docs/MANUAL.md](docs/MANUAL.md)) y pasos de **despliegue a
  Vercel** (env vars, URLs de Auth) en el README.

### Fase 4 — Persistencia y offline

- **Supabase/PostGIS**: migraciones en `supabase/migrations` — `suertes`,
  `programacion` (modelo de la app), `mediciones`, `audit_log`, `profiles`/roles;
  **RLS por rol** y **triggers de auditoría** (antes/después). Seed de 610 suertes.
  CLI de Supabase para `db push`.
- **Auth** email+contraseña (Supabase Auth): login/registro, `AuthGate` que protege
  las pestañas, `UserMenu`, autor de la auditoría = usuario autenticado.
- **Offline-first + outbox**: el store persiste localmente; los cambios se encolan
  (`pending`) y el **SyncManager** hace upsert idempotente a Supabase al haber red
  y sesión (ver [ADR-0004](docs/adr/0004-sync-outbox-localstorage.md)). Indicador
  de estado en la cabecera (en línea / sin conexión / sincronizando / pendientes).
- Verificado contra la instancia: usuario autenticado ve las 610 suertes (RLS),
  el trigger crea el perfil, y el upsert dispara el `audit_log`.

### Fase 3 — Maquinaria amarilla

- Programación diaria por fecha: agregar / editar / eliminar (soft delete)
  equipos, con contadores por zona (1/2) y total (§5 Pestaña B).
- Formulario (React Hook Form + Zod): al elegir la suerte del catálogo
  (autocompletar), se autocompletan hacienda y centroide (lat/lon).
- Campos: tipo, identificación, operador, suerte, labor, zona, avance (%),
  observaciones.
- **Equipos dibujados en el mapa** sobre el centroide de su suerte (capa de
  maquinaria sincronizada con la programación del día) — DoD §18.
- **Historial auditable** (§10): cada alta/edición/baja registra autor, fecha y
  antes/después. Persistencia local (Zustand + localStorage; Supabase en Fase 4).
- Vista imprimible "Programación Maquinaria Amarilla"; export/import JSON
  (validado con Zod) y export CSV (Excel, separador `;`).
- Tests: dominio (operaciones + auditoría + export) y e2e del flujo.

### Fase 2 — GPS y medición

- **Mi ubicación (GPS)**: seguimiento con `watchPosition`, marcador con halo,
  botón "centrar en mí", precisión visible y aviso si es baja (§5, §13).
- **Medición geodésica** con Turf: marcar vértices tocando el mapa o con el botón
  "+ GPS"; área (ha) y perímetro (m), o distancia (m). Contador de puntos,
  deshacer/limpiar.
- **Contraste con área oficial**: si el centroide cae en una suerte conocida, se
  muestra su `ha_oficial` y la diferencia % (§5).
- Validación del motor contra las 610 suertes: error de área < 5% vs oficial
  (mediana < 0,5%), criterio de aceptación §5.
- **Fix**: el contenedor del mapa colapsaba a 0 de alto porque
  `maplibre-gl.css` (`.maplibregl-map{position:relative}`) anulaba `absolute
inset-0`; se usa `size-full`. Esto también restaura el click para seleccionar
  suertes. e2e del GPS y de la medición.

### Fase 1 — Mapa de suertes

- Mapa MapLibre GL con base satelital Esri World Imagery, centrado en el AOI.
- Capa de las 610 suertes como **una sola** capa GeoJSON (relleno + contorno +
  etiquetas `sec_ste`), con resaltado de la suerte seleccionada (§13).
- Panel de atributos al tocar un lote: `sec_ste`, hacienda, sector, área oficial
  (ha, formato es-CO), supervisor y jefe de zona (§5).
- Capas de contexto conmutables (red hídrica, canales, vías, cuerpos de agua,
  estaciones de bombeo) con control plegable.
- Buscador por `sec_ste` o hacienda (lógica de dominio pura + testeada) con
  `flyTo` y resaltado; enriquece los atributos desde el GeoJSON.
- Estado de UI con Zustand (`lib/store/mapStore`). e2e Playwright del flujo
  (buscar → panel; conmutar capas). Puerto de tests/preview movido a 3100.

### Fase 0 — Cimientos

- Scaffold Next.js 16 (App Router) + TypeScript `strict`
  (`noUncheckedIndexedAccess` y flags adicionales).
- Shell de la app: dos pestañas (Mapa / Maquinaria), navegación inferior táctil,
  indicador permanente de estado de conexión, i18n es-CO centralizado.
- Tooling de calidad: ESLint (cero warnings) + Prettier + Husky (pre-commit y
  commit-msg) + lint-staged + commitlint (Conventional Commits).
- Tests: Vitest + React Testing Library (unit) y Playwright (e2e smoke). Incluye
  validación de integridad de los datos (610 suertes / 17 haciendas / 2.849,12 ha).
- PWA con Serwist: service worker, `manifest.webmanifest`, iconos
  (ver [ADR-0003](docs/adr/0003-serwist-build-webpack.md)).
- Supabase: clientes browser/server (SSR), tipos derivados del SQL, validación de
  entorno con Zod, `.env.example`. Esquema PostGIS en `supabase/migrations`.
- Datos: GeoJSON + catálogo en `public/data`; capas de contexto depuradas
  (ver [ADR-0002](docs/adr/0002-limpieza-capas-contexto.md)).
- CI (GitHub Actions): `typecheck → lint → format → test → build` + e2e.
- ADR-0001 (standalone, Next.js, MapLibre), ADR-0002, ADR-0003.
