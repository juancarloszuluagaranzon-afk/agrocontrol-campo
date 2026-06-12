# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/);
versionado [SemVer](https://semver.org/lang/es/).

## [No publicado]

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
