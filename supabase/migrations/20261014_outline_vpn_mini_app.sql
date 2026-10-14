-- Additive schema for the Outline VPN Telegram Mini App.
-- All reads/writes should go through trusted server routes using the service role.
-- Do not add public policies for orders, screenshots, Outline API URLs, or access keys.

create table if not exists public.outline_vpn_servers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]{2,32}$'),
  name text not null,
  region text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.outline_vpn_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_days integer not null check (duration_days > 0),
  price_mmk numeric(12,2) not null check (price_mmk > 0),
  server_id uuid not null references public.outline_vpn_servers(id),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outline_vpn_payment_settings (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('kpay','aya_pay')),
  account_name text not null,
  account_number text not null,
  instructions text,
  active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(method, account_number)
);

create table if not exists public.outline_vpn_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  telegram_user_id bigint not null,
  telegram_username text,
  telegram_first_name text,
  package_id uuid references public.outline_vpn_packages(id) on delete set null,
  package_name_snapshot text not null,
  duration_days_snapshot integer not null check (duration_days_snapshot > 0),
  price_mmk_snapshot numeric(12,2) not null check (price_mmk_snapshot > 0),
  server_id uuid not null references public.outline_vpn_servers(id),
  payment_method text not null check (payment_method in ('kpay','aya_pay')),
  screenshot_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','provision_failed')),
  rejection_reason text,
  reviewed_by_telegram_user_id bigint,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.outline_vpn_keys (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.outline_vpn_orders(id) on delete cascade,
  telegram_user_id bigint not null,
  server_id uuid not null references public.outline_vpn_servers(id),
  outline_access_key_id text not null,
  access_url text not null,
  name text not null,
  status text not null default 'active' check (status in ('active','revoked','error')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists outline_vpn_orders_customer_created_idx
  on public.outline_vpn_orders(telegram_user_id, created_at desc);
create index if not exists outline_vpn_orders_pending_idx
  on public.outline_vpn_orders(created_at asc) where status = 'pending';
create index if not exists outline_vpn_packages_active_idx
  on public.outline_vpn_packages(active, sort_order);
create index if not exists outline_vpn_servers_active_idx
  on public.outline_vpn_servers(active, sort_order);
create index if not exists outline_vpn_keys_customer_idx
  on public.outline_vpn_keys(telegram_user_id, created_at desc);

alter table public.outline_vpn_servers enable row level security;
alter table public.outline_vpn_packages enable row level security;
alter table public.outline_vpn_payment_settings enable row level security;
alter table public.outline_vpn_orders enable row level security;
alter table public.outline_vpn_keys enable row level security;

-- Intentionally no anon/authenticated policies are created here.
-- Trusted server-side routes use SUPABASE_SERVICE_ROLE_KEY and enforce Telegram/admin authorization.
-- Keep the service-role key out of client bundles and browser-visible environment variables.