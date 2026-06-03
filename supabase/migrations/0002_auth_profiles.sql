-- ============================================================
-- AgroControl · Auth + perfiles de usuario (roles, §4)
-- ============================================================

-- Roles del documento maestro (§4).
do $$ begin
  create type public.rol as enum ('operador','supervisor','jefe_zona','direccion');
exception when duplicate_object then null; end $$;

-- Perfil ligado a auth.users; guarda nombre visible y rol.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  rol        public.rol not null default 'operador',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Crea el perfil automáticamente al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rol del usuario actual (security definer: evita recursión de RLS al consultarlo).
create or replace function public.mi_rol()
returns public.rol
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- RLS de profiles: cada quien ve/edita el suyo; dirección ve todos.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.mi_rol() = 'direccion');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
