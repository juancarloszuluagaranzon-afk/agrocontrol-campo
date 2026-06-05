-- ============================================================
-- AgroControl · Marcadores personales (waypoints privados, §5)
-- Cada usuario inserta marcadores que SÓLO él ve (RLS por dueño).
-- ============================================================

create table if not exists public.marcadores (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) default auth.uid(),
  nombre     text not null,
  nota       text not null default '',
  color      text not null default '#ef4444',
  lat        double precision not null,
  lon        double precision not null,
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marcadores_user_idx on public.marcadores (user_id);
alter table public.marcadores enable row level security;

-- RLS: privacidad total — sólo el dueño ve y gestiona sus marcadores (§12).
drop policy if exists "marcadores_select_own" on public.marcadores;
create policy "marcadores_select_own" on public.marcadores
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "marcadores_insert_own" on public.marcadores;
create policy "marcadores_insert_own" on public.marcadores
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "marcadores_update_own" on public.marcadores;
create policy "marcadores_update_own" on public.marcadores
  for update to authenticated using (user_id = auth.uid());

-- Auditoría (reusa el trigger fn_audit de 0004).
drop trigger if exists audit_marcadores on public.marcadores;
create trigger audit_marcadores
  after insert or update or delete on public.marcadores
  for each row execute function public.fn_audit();
