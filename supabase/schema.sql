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


-- Phase 2: reseller in-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('order_status')),
  order_id uuid references public.orders(id) on delete cascade,
  order_number text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at) where read_at is null;

alter table public.notifications enable row level security;
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read" on public.notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications" on public.notifications for delete to authenticated using ((select auth.uid()) = user_id);
