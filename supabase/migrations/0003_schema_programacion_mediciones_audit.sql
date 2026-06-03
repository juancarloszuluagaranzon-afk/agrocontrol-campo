-- ============================================================
-- AgroControl · Esquema alineado con la app (§9)
-- Reajusta `programacion` al modelo de la app (tipo/identificación en línea,
-- atributos derivados, autoría y soft delete) y añade `mediciones` y `audit_log`.
-- ============================================================

-- La `programacion` original (0001) usaba maquinaria_id; la app inlinea el equipo.
-- La BD está vacía en Fase 4, por lo que se recrea sin pérdida de datos.
drop table if exists public.programacion cascade;

create table public.programacion (
  id             uuid primary key default gen_random_uuid(),
  fecha          date not null,
  tipo           text not null,
  identificacion text,
  operador       text,
  sec_ste        text references public.suertes(sec_ste),
  hacienda       text,
  lat            double precision,
  lon            double precision,
  labor          text,
  zona           smallint,
  avance         numeric(5,2) not null default 0,
  observaciones  text not null default '',
  deleted        boolean not null default false,
  created_by     uuid references auth.users(id) default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index programacion_fecha_idx on public.programacion (fecha);
create index programacion_sec_ste_idx on public.programacion (sec_ste);
alter table public.programacion enable row level security;

-- Mediciones de campo (§9).
create table if not exists public.mediciones (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null check (tipo in ('area','distancia')),
  valor      numeric not null,
  unidad     text not null,
  geom       jsonb,
  autor      uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.mediciones enable row level security;

-- Bitácora de auditoría inmutable (§10). La pueblan triggers (0004).
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  registro_id text not null,
  accion      text not null check (accion in ('insert','update','delete')),
  autor       uuid,
  antes       jsonb,
  despues     jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_tabla_idx on public.audit_log (tabla, registro_id);
alter table public.audit_log enable row level security;
