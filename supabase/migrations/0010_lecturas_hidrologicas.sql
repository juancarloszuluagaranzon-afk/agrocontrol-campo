-- ============================================================
-- Rio Map · Lecturas hidrológicas por técnico (nivel de río/cota + evaporación)
-- Cualquier usuario autenticado registra lecturas; TODA la empresa las
-- ve (dato operativo compartido, mismo patrón que precipitaciones/0009).
-- Escritura/edición sólo del autor. Cobertura parcial: solo los técnicos con
-- puntos asignados en public/data/puntos_hidrologicos_riopaila.json.
-- ============================================================

create table if not exists public.lecturas_hidrologicas (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null references auth.users(id) default auth.uid(),
  planta      text not null,                 -- 'riopaila' | 'castilla'
  punto       text not null,                 -- nombre del punto (nivel_rio) o del técnico (evaporación)
  tipo        text not null check (tipo in ('nivel_rio', 'evaporacion')),
  fecha       date not null,                 -- día de la lectura
  valor       numeric(7, 2) not null,        -- metros (nivel_rio) o mm (evaporación)
  nota        text not null default '',
  deleted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lecturas_hidrologicas_planta_idx on public.lecturas_hidrologicas (planta);
create index if not exists lecturas_hidrologicas_punto_idx on public.lecturas_hidrologicas (punto);
create index if not exists lecturas_hidrologicas_fecha_idx on public.lecturas_hidrologicas (fecha);

alter table public.lecturas_hidrologicas enable row level security;

-- SELECT compartido: todo usuario autenticado ve todas las lecturas.
drop policy if exists "lecturas_hidrologicas_select_all" on public.lecturas_hidrologicas;
create policy "lecturas_hidrologicas_select_all" on public.lecturas_hidrologicas
  for select to authenticated using (true);

-- Insert/Update sólo del propio autor (cada quien gestiona lo suyo).
drop policy if exists "lecturas_hidrologicas_insert_own" on public.lecturas_hidrologicas;
create policy "lecturas_hidrologicas_insert_own" on public.lecturas_hidrologicas
  for insert to authenticated with check (autor = auth.uid());

drop policy if exists "lecturas_hidrologicas_update_own" on public.lecturas_hidrologicas;
create policy "lecturas_hidrologicas_update_own" on public.lecturas_hidrologicas
  for update to authenticated using (autor = auth.uid());

-- Auditoría (reusa el trigger fn_audit de la migración 0004).
drop trigger if exists audit_lecturas_hidrologicas on public.lecturas_hidrologicas;
create trigger audit_lecturas_hidrologicas
  after insert or update or delete on public.lecturas_hidrologicas
  for each row execute function public.fn_audit();
