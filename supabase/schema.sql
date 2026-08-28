-- Zorion Chat — esquema inicial de base de datos
-- Ejecutar en el SQL Editor de Supabase (o vía CLI: supabase db push)

create extension if not exists pgcrypto;

-- =========================================================
-- 1. bots — configuración de cada bot por cliente
-- =========================================================
create table if not exists public.bots (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  empresa          text not null,
  descripcion      text,
  color_primario   text not null default '#000000',
  logo_url         text,
  activo           boolean not null default true,
  whatsapp_numero  text,
  owner_id         uuid references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now()
);

-- Multi-tenant: por si la tabla ya existía sin esta columna.
alter table public.bots add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.bots enable row level security;

drop policy if exists "bots_authenticated_all" on public.bots;

-- zorionagencia@gmail.com actúa como super-admin y ve/gestiona todos los bots;
-- el resto de usuarios solo ven y gestionan los suyos (owner_id = auth.uid()).
create policy "bots_owner_select"
  on public.bots
  for select
  to authenticated
  using (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

create policy "bots_owner_insert"
  on public.bots
  for insert
  to authenticated
  with check (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

create policy "bots_owner_update"
  on public.bots
  for update
  to authenticated
  using (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com')
  with check (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

create policy "bots_owner_delete"
  on public.bots
  for delete
  to authenticated
  using (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

-- =========================================================
-- 2. conversaciones — historial de chats
-- =========================================================
create table if not exists public.conversaciones (
  id             uuid primary key default gen_random_uuid(),
  bot_id         uuid not null references public.bots(id) on delete cascade,
  canal          text not null check (canal in ('web', 'whatsapp')),
  identificador  text not null,
  created_at     timestamptz not null default now()
);

alter table public.conversaciones enable row level security;

create policy "conversaciones_authenticated_select"
  on public.conversaciones
  for select
  to authenticated
  using (true);

create policy "conversaciones_anon_insert"
  on public.conversaciones
  for insert
  to anon
  with check (true);

-- =========================================================
-- 3. mensajes — mensajes individuales de cada conversación
-- =========================================================
create table if not exists public.mensajes (
  id               uuid primary key default gen_random_uuid(),
  conversacion_id  uuid not null references public.conversaciones(id) on delete cascade,
  rol              text not null check (rol in ('user', 'assistant')),
  contenido        text not null,
  created_at       timestamptz not null default now()
);

alter table public.mensajes enable row level security;

create policy "mensajes_authenticated_select"
  on public.mensajes
  for select
  to authenticated
  using (true);

create policy "mensajes_anon_insert"
  on public.mensajes
  for insert
  to anon
  with check (true);

-- =========================================================
-- 4. conocimiento — base de conocimiento por bot
-- =========================================================
create table if not exists public.conocimiento (
  id          uuid primary key default gen_random_uuid(),
  bot_id      uuid not null references public.bots(id) on delete cascade,
  titulo      text,
  contenido   text not null,
  activo      boolean not null default true,
  owner_id    uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Multi-tenant: por si la tabla ya existía sin esta columna.
alter table public.conocimiento add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.conocimiento enable row level security;

drop policy if exists "conocimiento_authenticated_all" on public.conocimiento;

create policy "conocimiento_owner_select"
  on public.conocimiento
  for select
  to authenticated
  using (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

create policy "conocimiento_owner_insert"
  on public.conocimiento
  for insert
  to authenticated
  with check (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

create policy "conocimiento_owner_update"
  on public.conocimiento
  for update
  to authenticated
  using (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com')
  with check (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

create policy "conocimiento_owner_delete"
  on public.conocimiento
  for delete
  to authenticated
  using (owner_id = auth.uid() or lower(auth.email()) = 'zorionagencia@gmail.com');

-- =========================================================
-- 5. aimharder_tokens — persistencia de tokens de la integración Aimharder
-- =========================================================
create table if not exists public.aimharder_tokens (
  id            text primary key,
  access_token  text not null,
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

alter table public.aimharder_tokens enable row level security;

-- Sin políticas: solo el cliente admin (service role) puede leer/escribir,
-- que además bypassa RLS por diseño de Supabase.

-- =========================================================
-- Índices
-- =========================================================
create index if not exists idx_conversaciones_bot_id on public.conversaciones (bot_id);
create index if not exists idx_conversaciones_canal on public.conversaciones (canal);
create index if not exists idx_mensajes_conversacion_id on public.mensajes (conversacion_id);
create index if not exists idx_conocimiento_bot_id on public.conocimiento (bot_id);
create index if not exists idx_bots_owner_id on public.bots (owner_id);
create index if not exists idx_conocimiento_owner_id on public.conocimiento (owner_id);

-- =========================================================
-- Migración: asignar los bots/conocimiento existentes (owner_id nulo)
-- al super-admin, para que queden consistentes tras activar multi-tenant.
-- Idempotente: no hace nada si el email no existe o ya no quedan nulos.
-- =========================================================
update public.bots
set owner_id = (select id from auth.users where lower(email) = 'zorionagencia@gmail.com')
where owner_id is null
  and exists (select 1 from auth.users where lower(email) = 'zorionagencia@gmail.com');

update public.conocimiento
set owner_id = (select id from auth.users where lower(email) = 'zorionagencia@gmail.com')
where owner_id is null
  and exists (select 1 from auth.users where lower(email) = 'zorionagencia@gmail.com');
