-- JBE Digital + Gaming — Phase 1 schema
-- Matches the Phase 1 database currently used by the application.

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.prices (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  customer_type text not null default 'b2c' check (customer_type in ('b2c','reseller')),
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'MMK',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(package_id, customer_type)
);

alter table public.products enable row level security;
alter table public.packages enable row level security;
alter table public.prices enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products" on public.products for select to anon, authenticated using (active = true);

drop policy if exists "Public can view active packages" on public.packages;
create policy "Public can view active packages" on public.packages for select to anon, authenticated using (active = true);

drop policy if exists "Public can view B2C prices" on public.prices;
create policy "Public can view B2C prices" on public.prices for select to anon, authenticated using (active = true and customer_type = 'b2c');
