# Base de datos — AgroControl Campo (Supabase)

Esquema de la Fase 4, en `migrations/` (se aplican en orden por su prefijo numérico):

1. `0001_suertes_maquinaria_programacion.sql` — extensión PostGIS + tablas base.
2. `0002_auth_profiles.sql` — perfiles + roles + trigger de alta de usuario.
3. `0003_schema_programacion_mediciones_audit.sql` — `programacion` (modelo de la app), `mediciones`, `audit_log`.
4. `0004_rls_and_audit_triggers.sql` — RLS por rol + triggers de auditoría.
5. `0005_seed_suertes.sql` — carga las 610 suertes (atributos).

## Opción A — CLI de Supabase (recomendada)

El CLI está instalado como dependencia (`pnpm exec supabase`). Tú corres el login y
el link (manejan tu token y la contraseña de BD); luego el push es automático:

```bash
pnpm exec supabase login                                  # navegador / token
pnpm exec supabase link --project-ref sdlecnysrscszaxkkzca # pide la DB password
pnpm exec supabase db push                                # aplica 0001..0005
```

## Opción B — SQL Editor del dashboard

Database → SQL Editor → New query: pega el contenido de cada archivo **en orden** y
dale **Run**. Cada uno es idempotente / seguro de re-ejecutar.

> Si el paso 1 falla por PostGIS, actívalo en **Database → Extensions** y reintenta.

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
