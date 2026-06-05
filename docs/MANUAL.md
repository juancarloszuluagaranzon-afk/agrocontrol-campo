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
  hacienda, sector, **área oficial (ha)**, supervisor y jefe de zona.
- **Buscar** (arriba): escribe un código de suerte `sec_ste` (ej. `3111-020`), un
  tablón (`3111-020-T3`) o una hacienda → la app vuela y lo resalta.
- **Capas** (arriba izq.): enciende/apaga red hídrica, canales, vías, cuerpos de
  agua y estaciones de bombeo.
- **Mi ubicación** (botón ◎, derecha): activa el GPS; el punto azul es tu posición.
  Tócalo de nuevo para **centrar** el mapa en ti. Muestra la precisión y avisa si
  es baja.
- **Medir** (botón 📐): elige **área** o **distancia**, toca el mapa para marcar
  vértices (o usa **+ GPS** para marcar tu posición). Verás **área (ha) y perímetro**
  o **distancia (m)**. Si mides dentro de una suerte conocida, te muestra su área
  oficial para comparar. Usa **Deshacer** / **Limpiar**.

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

## 4. Sin conexión

- Tras la primera carga, la app **abre y funciona sin señal**.
- Lo que registres sin red queda **pendiente**; la cabecera muestra
  _"N pendientes"_. Al volver la conexión se **sincroniza** solo
  (verás _"Sincronizando…"_ y luego _"Sincronizado"_).
- Para llevar el **mapa offline**: navega por la zona con conexión antes de ir a
  campo (los mosaicos se guardan en caché).

## 5. Consejos de campo

- Botones grandes y alto contraste para uso con guantes y bajo sol.
- El GPS necesita **HTTPS** (la app desplegada lo cumple) o `localhost`.
- Si la precisión del GPS es baja, espera unos segundos a cielo abierto.
