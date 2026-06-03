-- ============================================================
-- AgroControl · RLS por rol (§12) + triggers de auditoría (§10)
-- ============================================================

-- ---------- Suertes: catálogo de sólo lectura para autenticados ----------
alter table public.suertes enable row level security;
drop policy if exists "suertes_select" on public.suertes;
create policy "suertes_select" on public.suertes
  for select to authenticated using (true);

-- ---------- Programación ----------
-- Lectura: cualquier usuario autenticado (visibilidad de campo).
drop policy if exists "programacion_select" on public.programacion;
create policy "programacion_select" on public.programacion
  for select to authenticated using (true);

-- Alta: autenticado, registrándose como autor.
drop policy if exists "programacion_insert" on public.programacion;
create policy "programacion_insert" on public.programacion
  for insert to authenticated
  with check (created_by = auth.uid());

-- Edición/baja lógica: el autor (p. ej. operador marca avance) o mandos
-- (supervisor / jefe de zona / dirección).
drop policy if exists "programacion_update" on public.programacion;
create policy "programacion_update" on public.programacion
  for update to authenticated
  using (
    created_by = auth.uid()
    or public.mi_rol() in ('supervisor','jefe_zona','direccion')
  );

-- ---------- Mediciones ----------
drop policy if exists "mediciones_select" on public.mediciones;
create policy "mediciones_select" on public.mediciones
  for select to authenticated using (true);

drop policy if exists "mediciones_insert" on public.mediciones;
create policy "mediciones_insert" on public.mediciones
  for insert to authenticated
  with check (autor = auth.uid());

-- ---------- Auditoría: lectura para autenticados; escritura sólo por trigger ----------
drop policy if exists "audit_select" on public.audit_log;
create policy "audit_select" on public.audit_log
  for select to authenticated using (true);

-- ---------- Trigger de auditoría (antes/después en jsonb) ----------
create or replace function public.fn_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accion text;
  v_id text;
begin
  if (tg_op = 'INSERT') then
    v_accion := 'insert'; v_id := new.id::text;
  elsif (tg_op = 'UPDATE') then
    v_accion := 'update'; v_id := new.id::text;
  else
    v_accion := 'delete'; v_id := old.id::text;
  end if;

  insert into public.audit_log (tabla, registro_id, accion, autor, antes, despues)
  values (
    tg_table_name,
    v_id,
    v_accion,
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_programacion on public.programacion;
create trigger audit_programacion
  after insert or update or delete on public.programacion
  for each row execute function public.fn_audit();

drop trigger if exists audit_mediciones on public.mediciones;
create trigger audit_mediciones
  after insert or update or delete on public.mediciones
  for each row execute function public.fn_audit();
