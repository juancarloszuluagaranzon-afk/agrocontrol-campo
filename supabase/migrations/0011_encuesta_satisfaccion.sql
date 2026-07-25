-- ============================================================
-- Rio Map · Encuesta de satisfacción (popup obligatorio de 5 estrellas)
-- Una respuesta por usuario, privada (solo el propio autor la ve/gestiona,
-- igual que marcadores/0007). No se edita ni se borra desde la app.
-- ============================================================

create table if not exists public.encuesta_satisfaccion (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) default auth.uid(),
  estrellas  smallint not null check (estrellas between 1 and 5),
  comentario text not null default '',
  created_at timestamptz not null default now()
);

-- Una respuesta por usuario, también forzado a nivel de BD (no solo en el cliente).
create unique index if not exists encuesta_satisfaccion_user_idx
  on public.encuesta_satisfaccion (user_id);

alter table public.encuesta_satisfaccion enable row level security;

drop policy if exists "encuesta_select_own" on public.encuesta_satisfaccion;
create policy "encuesta_select_own" on public.encuesta_satisfaccion
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "encuesta_insert_own" on public.encuesta_satisfaccion;
create policy "encuesta_insert_own" on public.encuesta_satisfaccion
  for insert to authenticated with check (user_id = auth.uid());

-- Auditoría (reusa el trigger fn_audit de la migración 0004; solo exige columna `id`).
drop trigger if exists audit_encuesta_satisfaccion on public.encuesta_satisfaccion;
create trigger audit_encuesta_satisfaccion
  after insert or update or delete on public.encuesta_satisfaccion
  for each row execute function public.fn_audit();
