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
  vez te pedirá permiso para la orientación.
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
  y **Guardar aquí**. La lista permite **ir** a un marcador o **borrarlo**. Se
  guardan sin conexión y se sincronizan a tus otros dispositivos.

## 4. Plano de campo (muestreo de suelos)

- Menú ✏️ → **Plano de campo**. Sube el **GeoPDF** de muestreo de tu suerte; la
  app lo muestra como una capa de imagen ubicada sobre el mapa, con los **puntos
  de muestreo** ya numerados.
- Toca cada punto para marcarlo **muestreado** (o agrégalo a mano si el punto no
  quedó en el PDF). Se ve tu distancia GPS a cada punto para ubicarte.
- Con un plano activo, las suertes se ocultan para ver el plano solo (como en
  Avenza); se puede quitar/ocultar para volver a verlas.
- El plano queda guardado **por dispositivo** (no se sincroniza entre equipos ni
  requiere conexión una vez cargado).

## 5. Foto de campo

- Menú ✏️ → **Foto de campo**. Toma una foto con la cámara del celular; la app la
  **sella** automáticamente con tus coordenadas, la suerte/hacienda detectada por
  tu ubicación (editable si no es la correcta) y la fecha.
- Descarga la foto sellada o compártela directo (WhatsApp, correo, etc.).
- Funciona sin conexión; no queda guardada en una galería dentro de la app.

## 6. Lluvia (precipitación), nivel de río y evaporación

- Menú ✏️ → **Lluvia (precipitación)**: planilla diaria por técnico. Elige la
  **fecha** y tu **nombre** en el desplegable; verás tus pluviómetros con su
  acumulado del mes y del año.
- Anota los **mm** de cada pluviómetro y, si tienes puntos asignados, el
  **nivel de río (cota)** o la **evaporación** del día, en la misma planilla.
  Si un punto de nivel de río tiene umbrales definidos y el valor los alcanza,
  aparece una insignia **Alerta / Crítico / Emergencia**.
- **Guardar planilla**: confirma cuántas lecturas se guardaron (✓ en verde) y
  deja los campos en blanco para seguir anotando; si vuelves a elegir la misma
  fecha y técnico más tarde, tus datos guardados reaparecen.
- El dato de lluvia y nivel de río es **compartido**: todos los usuarios lo ven
  (no solo quien lo escribió), pero cada quien solo edita lo suyo.
- **📊 Reporte de lluvia** (menú ✏️): tabla mensual con el mismo formato del
  reporte oficial de Recursos Hídricos, y botón para descargarla en Excel.
- **⬇️ Descargar consolidado del mes (CSV)**: dentro del panel de Lluvia, exporta
  el mes completo en CSV.

## 7. Sin conexión

- Tras la primera carga, la app **abre y funciona sin señal**.
- Lo que registres sin red queda **pendiente** hasta que vuelva la conexión,
  momento en que se **sincroniza solo**. El punto de color junto a tu nombre
  (arriba a la derecha) indica el estado: verde = sincronizado, ámbar = sin
  conexión o con pendientes, celeste = sincronizando.
- Para llevar el **mapa offline**: navega por la zona con conexión antes de ir a
  campo (los mosaicos se guardan en caché).

## 8. Consejos de campo

- Botones grandes y alto contraste para uso con guantes y bajo sol.
- El GPS necesita **HTTPS** (la app desplegada lo cumple) o `localhost`.
- Si la precisión del GPS es baja, espera unos segundos a cielo abierto.
