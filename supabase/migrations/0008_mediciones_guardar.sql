-- ============================================================
-- AgroControl · Guardar mediciones de campo (privadas por dueño, §5)
-- Amplía `mediciones` (0003) para poder nombrar, ubicar y borrar (soft delete),
-- y la vuelve privada: cada usuario solo ve y gestiona las suyas (RLS).
-- ============================================================

alter table public.mediciones
  add column if not exists nombre     text not null default '',
  add column if not exists lat        double precision,
  add column if not exists lon        double precision,
  add column if not exists deleted    boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists mediciones_autor_idx on public.mediciones (autor);

-- RLS privada: el select compartido (0004) se reemplaza por dueño; se añade
-- update (no existía) para renombrar / soft delete. Insert ya exige autor=uid.
drop policy if exists "mediciones_select" on public.mediciones;
create policy "mediciones_select_own" on public.mediciones
  for select to authenticated using (autor = auth.uid());

drop policy if exists "mediciones_update_own" on public.mediciones;
create policy "mediciones_update_own" on public.mediciones
  for update to authenticated using (autor = auth.uid());

-- Auditoría (reusa el trigger fn_audit de 0004).
drop trigger if exists audit_mediciones on public.mediciones;
create trigger audit_mediciones
  after insert or update or delete on public.mediciones
  for each row execute function public.fn_audit();
