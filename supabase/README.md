# Base de datos — AgroControl Campo (Supabase)

Esquema de la Fase 4. **Aplícalo en el SQL Editor del dashboard de Supabase**
(Database → SQL Editor → New query), ejecutando los archivos **en este orden**.
La `anon key` no puede crear tablas; el dashboard usa tu sesión autenticada.

## Orden de ejecución

1. `migrations/0001_suertes_maquinaria_programacion.sql` — extensión PostGIS + tablas base.
2. `migrations/0002_auth_profiles.sql` — perfiles + roles + trigger de alta de usuario.
3. `migrations/0003_schema_programacion_mediciones_audit.sql` — `programacion` (modelo de la app), `mediciones`, `audit_log`.
4. `migrations/0004_rls_and_audit_triggers.sql` — políticas RLS por rol + triggers de auditoría.
5. `seed_suertes.sql` — carga las 610 suertes (atributos).

> Cada archivo es idempotente o seguro de re-ejecutar. Pégalos uno a uno (o todos
> juntos respetando el orden) y dale **Run**.

## Después de aplicar

- Crea tu usuario desde la app (pantalla de login → registrarse) o en
  **Authentication → Users**. El trigger crea su `profile` con rol `operador`.
- Para asignar un rol superior, en el SQL Editor:
  ```sql
  update public.profiles set rol = 'direccion' where id =
    (select id from auth.users where email = 'tu-correo@ejemplo.com');
  ```

## Notas

- **Geometría de suertes:** el seed carga atributos (no `geom`). La app dibuja los
  polígonos desde el GeoJSON estático (`/public/data`). Para cargar `geom` en
  PostGIS (consultas espaciales server-side) usar `ogr2ogr` con la cadena de
  conexión — paso opcional, fuera del alcance de la app.
- **Tipos TypeScript:** `lib/supabase/types.ts` refleja este esquema a mano. Con la
  instancia viva se pueden regenerar con `supabase gen types typescript`.
