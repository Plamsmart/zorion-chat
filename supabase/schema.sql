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
  created_at       timestamptz not null default now()
);

alter table public.bots enable row level security;

create policy "bots_authenticated_all"
  on public.bots
  for all
  to authenticated
  using (true)
  with check (true);

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
  created_at  timestamptz not null default now()
);

alter table public.conocimiento enable row level security;

create policy "conocimiento_authenticated_all"
  on public.conocimiento
  for all
  to authenticated
  using (true)
  with check (true);

-- =========================================================
-- Índices
-- =========================================================
create index if not exists idx_conversaciones_bot_id on public.conversaciones (bot_id);
create index if not exists idx_conversaciones_canal on public.conversaciones (canal);
create index if not exists idx_mensajes_conversacion_id on public.mensajes (conversacion_id);
create index if not exists idx_conocimiento_bot_id on public.conocimiento (bot_id);
