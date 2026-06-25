-- ============================================================
-- Rio Map · Lecturas diarias de precipitación (lluvia) por pluviómetro
-- Cualquier usuario autenticado registra lecturas; TODA la empresa las
-- ve (dato operativo compartido). Escritura/edición sólo del autor.
-- RLS de SELECT compartida (a diferencia de marcadores/mediciones, que
-- son privados por dueño). Soft delete + auditoría.
-- ============================================================

create table if not exists public.precipitaciones (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null references auth.users(id) default auth.uid(),
  planta      text not null,                 -- 'riopaila' | 'castilla'
  pluviometro integer not null,              -- ID Pluviometr (207, 208, …)
  fecha       date not null,                 -- día de la lectura
  mm          numeric(6, 2) not null check (mm >= 0),
  nota        text not null default '',
  deleted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists precipitaciones_planta_idx on public.precipitaciones (planta);
create index if not exists precipitaciones_pluviometro_idx on public.precipitaciones (pluviometro);
create index if not exists precipitaciones_fecha_idx on public.precipitaciones (fecha);

alter table public.precipitaciones enable row level security;

-- SELECT compartido: todo usuario autenticado ve todas las lecturas.
drop policy if exists "precipitaciones_select_all" on public.precipitaciones;
create policy "precipitaciones_select_all" on public.precipitaciones
  for select to authenticated using (true);

-- Insert/Update sólo del propio autor (cada quien gestiona lo suyo).
drop policy if exists "precipitaciones_insert_own" on public.precipitaciones;
create policy "precipitaciones_insert_own" on public.precipitaciones
  for insert to authenticated with check (autor = auth.uid());

drop policy if exists "precipitaciones_update_own" on public.precipitaciones;
create policy "precipitaciones_update_own" on public.precipitaciones
  for update to authenticated using (autor = auth.uid());

-- Auditoría (reusa el trigger fn_audit de 0004).
drop trigger if exists audit_precipitaciones on public.precipitaciones;
create trigger audit_precipitaciones
  after insert or update or delete on public.precipitaciones
  for each row execute function public.fn_audit();
