# ADR-0039 — App resistente a errores: piezas protegidas y pantalla de error propia

Fecha: 2026-10-14 · Estado: aceptado

## Contexto

Un técnico abrió Rio Map en modo avión y vio "This page couldn't load", con los
botones Reload y Back. Es la pantalla de error por defecto de Next.js. Aparece
cuando un componente lanza un error al renderizar o en un efecto: React desmonta
**toda** la app. El service worker sí entregó la app sin red (ADR-0020), pero
el técnico se quedó sin mapa y sin GPS, que no necesita internet.

No se pudo reproducir. La app abre bien sin red en estos casos, en un celular
simulado:

- producción en limpio;
- un build local con un usuario con sesión y el token vencido;
- desde el ícono, desde un enlace compartido y desde `/`;
- con la app abierta cuando se va la señal, usando las herramientas.

La causa depende de algo de ese celular: sus datos guardados, sus sensores o
la versión que tenía.

## Decisión

- **`Protegido`** (error boundary de React) envuelve cada pieza de la pantalla:
  - el mapa;
  - buscador, satélite/plano y paneles de herramientas;
  - reporte, maestro, brújula y GPS;
  - leyendas, menú y fichas;
  - cabecera: planta, sincronización y usuario;
  - sincronización de fondo y encuesta.

  Si una falla, solo esa se oculta y lo demás sigue. El mapa y el GPS tienen un
  respaldo con botón **Reintentar**, que vuelve a montarlos.

- **Pantalla de error propia** (`app/error.tsx` y `app/global-error.tsx`, con
  `PantallaError`), en español. Muestra:
  - "Rio Map tuvo un problema al abrir" y "Tus datos guardados están a salvo";
  - los botones **Volver a abrir** e **Intentar de nuevo**;
  - el **detalle técnico**: dónde falló, versión, hora, mensaje y pila.

  Usa estilos en línea porque en `global-error` no carga el CSS de la app.

- **Registro local** (`lib/diagnostico/errores.ts`): guarda los últimos 5 errores
  en el celular, porque sin red no se pueden enviar. La versión es el commit de
  Vercel (`NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`).

## Consecuencias

- Una falla de una pieza ya no deja al técnico sin mapa ni ubicación.
- Si se repite el caso del celular, una foto de la pantalla o la pieza que
  desaparezca permite encontrar la causa exacta y corregirla de raíz.
- Los errores fuera de React (eventos, promesas sin `catch`, fallos internos de
  MapLibre) no pasan por los protectores. Tampoco tumban la app.
