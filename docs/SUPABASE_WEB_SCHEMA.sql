-- SPICA Arena OS online web schema for Supabase.
-- Run this in the Supabase SQL editor for the Ezzstar Web App / Player App / Admin surface.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  username text unique,
  role text not null default 'player' check (role in ('player', 'zone_owner', 'manager', 'admin')),
  avatar_url text,
  banner_url text,
  bio text,
  spica_balance integer not null default 1000,
  xp integer not null default 0,
  level integer not null default 1,
  membership text,
  favorite_games text[] not null default '{}',
  favorite_zones text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zone_listing_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  owner_name text not null,
  email text not null,
  phone text,
  zone_name text not null,
  city text,
  pc_count integer not null default 0,
  rent_per_hour integer not null default 100,
  current_pricing_model text,
  message text,
  attachment_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'contacted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  owner_name text,
  owner_email text,
  listing_request_id uuid references public.zone_listing_requests(id) on delete set null,
  name text not null,
  city text,
  pc_count integer not null default 0,
  rent_per_hour integer not null default 100,
  pricing_model text,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'rejected')),
  featured boolean not null default false,
  logo_url text,
  banner_url text,
  branding jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references auth.users(id) on delete set null,
  player_name text,
  zone_id uuid references public.zones(id) on delete set null,
  zone_name text,
  pc_id text,
  pc_name text,
  start_time timestamptz,
  duration_seconds integer not null default 0,
  status text not null default 'completed' check (status in ('active', 'completed')),
  gross_spica integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('buy', 'spend', 'reward', 'withdraw')),
  amount integer not null,
  balance_after integer,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  role text,
  title text not null,
  message text,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_activity (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  type text not null default 'system',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.zone_listing_requests enable row level security;
alter table public.zones enable row level security;
alter table public.player_sessions enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.admin_activity enable row level security;

-- The server uses SUPABASE_SERVICE_ROLE_KEY for admin reads/writes.
-- Add client RLS policies later when direct browser Supabase access is introduced.
