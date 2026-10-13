# Manual de uso — Rio Map

App de campo para Riopaila: mapa de tablones, GPS, medición y marcadores
personales. Funciona en celular/tablet y **sin conexión** tras la primera carga.
Instálala como app desde el navegador ("Agregar a pantalla de inicio").

## 1. Entrar

- Abre la app e **inicia sesión** con tu correo y contraseña.
- ¿Primera vez? Usa **Crear cuenta** (o pídele al administrador que te dé acceso).
- Arriba a la derecha verás tu nombre, el **estado de conexión** y **Salir**.

## 2. Mapa / Campo

- **Base satelital** del ingenio con las **suertes** dibujadas.
- Una **suerte** está dividida en **tablones**; cada tablón se ve y se toca por
  separado. **Tocar un tablón** → muestra su suerte, número (ej. "Tablón 3 de 5"),
  hacienda, sector, **área oficial (ha)**, supervisor y jefe de zona. Abajo, en
  **Agronomía**: **variedad**, **edad** (en meses, calculada al día), **n.º de
  corte** y **próximo corte** de la suerte (datos del maestro).
- **Buscar** (arriba): escribe un código de suerte `sec_ste` (ej. `3111-020`), un
  tablón (`3111-020-T3`) o una hacienda → la app vuela y lo resalta.
- **Herramientas** (botón ✏️ abajo-izq.): abre el menú con **Dibujar y medir**,
  **Marcadores**, **Mediciones guardadas** y **Capas** (red hídrica, canales, vías,
  cuerpos de agua, estaciones de bombeo). Elige una para abrir su panel.
- **Satélite / Plano** (arriba izq.): siempre visible para cambiar la base del mapa.
- **Mi ubicación** (botón ◎, derecha): activa el GPS; el punto azul es tu posición.
  Tócalo de nuevo para **centrar** el mapa en ti. Muestra la precisión y avisa si
  es baja. Aparece además un **cono de orientación** que indica hacia dónde apuntas
  (usa la brújula del teléfono; gira al mover el equipo). Si el cono "baila" o
  apunta mal, **calibra** moviendo el teléfono en forma de 8. En iPhone, la primera
  vez te pedirá permiso para la orientación; si lo negaste, toca **🧭 Activar
  brújula**. Junto a la precisión verás el rumbo, p. ej. **🧭 NE 45°**.
- **Brújula** (botón 🧭, arriba a la derecha, bajo el zoom): siempre visible; la
  aguja roja apunta al norte. Tócala para que **el mapa gire contigo** (lo que
  tienes al frente queda arriba, el botón se marca en azul); tócala otra vez para
  volver al **norte arriba**. Si giraste el mapa con dos dedos, un toque lo
  endereza.
- **Dibujar y medir** (menú ✏️): elige **área** o **distancia**, toca el mapa para
  marcar vértices (o usa **+ GPS** para marcar tu posición). Verás **área (ha) y
  perímetro** o **distancia (m)**. Si mides dentro de una suerte conocida, te
  muestra su área oficial para comparar. Usa **Deshacer** / **Limpiar**; **✕** para
  terminar.
  - **Guardar** (💾): ponle un **nombre** a la medición para conservarla. Las
    guardadas aparecen en **📐 Mediciones guardadas** (menú ✏️): tócalas para **ir**, o
    **bórralas**. Son privadas (solo tú las ves), sirven **sin conexión** y se
    sincronizan a tus dispositivos.

## 3. Vista Plano y marcadores

- **Satélite / Plano** (arriba izq.): cambia entre la base satelital y el **plano**
  (tablones coloreados por hacienda, como el plano oficial). En modo Plano aparecen
  la **Leyenda** de haciendas y la tabla **Área neta por hacienda**.
- **Marcado preciso**: al medir o al colocar un marcador aparece una **cruz ✛** en
  el centro; mueve el mapa hasta que la cruz quede en el punto exacto y confirma
  (más preciso que tocar con el dedo).
- **Marcadores** (botón 📍, derecha): puntos personales que **solo tú ves**.
  **Nuevo marcador** → centra la cruz, pon **nombre**, una **nota** y un **color**,
  y **Guardar aquí**. La lista muestra la nota bajo el nombre y permite **ir** a
  un marcador, **compartirlo** (el mensaje lleva la nota) o **borrarlo**. **Toca
  un marcador en el mapa** para ver su ficha con la nota completa y la fecha. Se
  guardan sin conexión y se sincronizan a tus otros dispositivos.

## 4. Sin conexión

- Tras la primera carga, la app **abre y funciona sin señal**, con tu sesión
  guardada: no hace falta conexión para entrar.
- Lo que registres sin red queda **pendiente**; la cabecera muestra
  _"N pendientes"_. Al volver la conexión se **sincroniza** solo
  (verás _"Sincronizando…"_ y luego _"Sincronizado"_).
- Para llevar el **mapa offline**: ✏️ Herramientas → **📥 Mapa sin señal** →
  **Descargar**, con Wi-Fi y la app abierta (Riopaila ≈ 115 MB, Castilla ≈ 180
  MB). Baja el satélite alrededor de todas las suertes de tu planta, del
  panorama al detalle. Si se corta, toca **Completar** y sigue donde iba. Hazlo
  una vez por planta; **Borrar** libera el espacio.
- Sin señal, si acercas más allá de lo descargado, el mapa amplía la imagen
  que tenga (se ve más borrosa) en vez de quedar en blanco.

## 5. Consejos de campo

- Botones grandes y alto contraste para uso con guantes y bajo sol.
- El GPS necesita **HTTPS** (la app desplegada lo cumple) o `localhost`.
- Si la precisión del GPS es baja, espera unos segundos a cielo abierto.
