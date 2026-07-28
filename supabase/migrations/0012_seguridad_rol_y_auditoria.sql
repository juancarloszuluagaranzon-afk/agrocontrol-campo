-- ============================================================
-- Rio Map · Endurecimiento de seguridad (auditoría RLS)
-- Corrige dos hallazgos:
--   H1 (crítico) Auto-escalamiento de rol: la política profiles_update_own
--       permitía a un usuario cambiar su propia columna `rol` (RLS no
--       distingue columnas), ascendiéndose a 'direccion'. Se bloquea con un
--       trigger BEFORE UPDATE que rechaza el cambio de `rol` si lo intenta un
--       usuario autenticado que no es 'direccion'. El admin (SQL Editor /
--       service_role, sin auth.uid()) sí puede asignar roles como siempre.
--   H2 (alto) Fuga vía audit_log: `select using(true)` dejaba a cualquier
--       autenticado leer el jsonb antes/después de TODAS las tablas (incluidos
--       marcadores, mediciones y encuestas privadas de otros). Se restringe la
--       lectura a rol 'direccion'.
-- ============================================================

-- ---------- H1: el rol no es auto-editable por el usuario ----------
create or replace function public.fn_bloquea_cambio_rol()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Solo bloquea cuando un usuario autenticado (auth.uid() no nulo) que NO es
  -- 'direccion' intenta cambiar el rol. En el SQL Editor / service_role,
  -- auth.uid() es null → la asignación de roles por admin sigue permitida.
  if new.rol is distinct from old.rol
     and auth.uid() is not null
     and coalesce(public.mi_rol(), 'operador') <> 'direccion' then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end;
$$;

drop trigger if exists bloquea_cambio_rol on public.profiles;
create trigger bloquea_cambio_rol
  before update on public.profiles
  for each row execute function public.fn_bloquea_cambio_rol();

-- ---------- H2: audit_log solo lo lee 'direccion' ----------
drop policy if exists "audit_select" on public.audit_log;
create policy "audit_select" on public.audit_log
  for select to authenticated
  using (public.mi_rol() = 'direccion');
