# ADR-0016 — Endurecimiento de seguridad: rol no auto-editable y auditoría restringida

Fecha: 2026-07-25 · Estado: aceptado

## Contexto

Una auditoría del modelo de acceso encontró dos fallas explotables por cualquier cuenta
autenticada (el registro está abierto al público, así que "cualquiera con el link"):

- **H1 — Auto-escalamiento de rol**: la política `profiles_update_own` (ADR/migración 0002)
  permite `UPDATE` de la propia fila con `using (auth.uid() = id)`. La RLS de PostgreSQL no
  distingue columnas: si puedes actualizar la fila, puedes actualizar cualquier columna,
  incluida `rol`. Un operador podía `update profiles set rol='direccion' where id=auth.uid()`
  y con eso obtener escritura sobre toda la `programacion` y lectura de todos los perfiles.
- **H2 — Fuga vía `audit_log`**: la tabla de auditoría guarda la fila completa (`antes`/`despues`
  en jsonb) de cada cambio, y tenía `select using(true)` (migración 0004). Cualquier
  autenticado podía leer el contenido de `marcadores`, `mediciones` y `encuesta_satisfaccion`
  de otros usuarios por la puerta de atrás, anulando su privacidad por dueño.

## Decisión

- **H1 se corrige con un trigger `BEFORE UPDATE`**, no con `with check`. Motivo: una política RLS
  `with check` evalúa la fila NUEVA, pero **no puede comparar contra la fila anterior** (no hay
  acceso a `OLD` en una policy), así que no puede expresar "el rol no cambió". Un trigger sí ve
  `OLD` y `NEW`. La condición bloquea el cambio de `rol` solo cuando `auth.uid()` no es nulo (un
  usuario final) y no es `direccion` — de modo que el administrador, que asigna roles desde el
  SQL Editor / `service_role` (donde `auth.uid()` es nulo), sigue funcionando sin cambios, tal
  como documenta `supabase/README.md`.
- **H2 se corrige restringiendo el SELECT de `audit_log` a `mi_rol() = 'direccion'`**. La app no
  lee `audit_log` en ningún lado (verificado), así que no se rompe funcionalidad. Se resuelve
  junto con H1 en la misma migración porque, una vez cerrado el auto-escalamiento, "solo
  dirección" vuelve a ser una frontera real (antes cualquiera podía auto-ascenderse a dirección
  y leerla).

## Consecuencias

- Migración `0012_seguridad_rol_y_auditoria.sql`; el usuario la aplica en el SQL Editor.
- La asignación de roles sigue siendo tarea de administrador vía SQL Editor (sin cambios de
  flujo). Si en el futuro se quiere un panel de administración de roles dentro de la app, deberá
  correr con `service_role` en un backend, no desde el cliente.
- Quedan pendientes de otras entregas los hallazgos no incluidos aquí (elección del usuario):
  cerrar el registro público, activar RLS en la tabla huérfana `maquinaria`, añadir `with check`
  simétrico en los UPDATE por dueño, y un `middleware.ts` server-side.

## Alternativas descartadas

- **`with check` en la política de UPDATE de profiles**: no puede referenciar `OLD`, así que no
  puede impedir el cambio de una columna específica manteniendo el resto editable.
- **Revocar `UPDATE` de la columna `rol` a `authenticated` con `GRANT`**: funcionaría, pero es
  menos legible/portable entre entornos que el trigger y no deja un mensaje de error claro.
- **Mover `rol` a una tabla aparte gestionada solo por `service_role`**: más limpio a largo
  plazo, pero es un cambio de esquema mayor; el trigger resuelve el riesgo inmediato sin migrar
  datos.
