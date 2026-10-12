-- JBE Reseller Coin system
create table if not exists public.reseller_coin_accounts (
  reseller_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reseller_coin_ledger (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  event_key text not null unique,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reseller_coin_accounts enable row level security;
alter table public.reseller_coin_ledger enable row level security;
drop policy if exists "Resellers view own coin balance" on public.reseller_coin_accounts;
create policy "Resellers view own coin balance" on public.reseller_coin_accounts for select to authenticated using ((select auth.uid()) = reseller_id);
drop policy if exists "Resellers view own coin ledger" on public.reseller_coin_ledger;
create policy "Resellers view own coin ledger" on public.reseller_coin_ledger for select to authenticated using ((select auth.uid()) = reseller_id);

alter table public.orders add column if not exists subtotal_amount numeric(12,2);
alter table public.orders add column if not exists discount_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists coins_used integer not null default 0 check (coins_used >= 0);
update public.orders set subtotal_amount = total_amount where subtotal_amount is null;
alter table public.orders alter column subtotal_amount set default 0;
alter table public.orders alter column subtotal_amount set not null;

insert into public.reseller_coin_accounts(reseller_id)
select id from public.profiles where role = 'reseller'
on conflict (reseller_id) do nothing;

create or replace function public.ensure_reseller_coin_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'reseller' then
    insert into public.reseller_coin_accounts(reseller_id) values (new.id)
    on conflict (reseller_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_ensure_reseller_coin_account on public.profiles;
create trigger profiles_ensure_reseller_coin_account after insert or update of role on public.profiles
for each row execute function public.ensure_reseller_coin_account();

-- Original earning tiers are retained through 100,000 Ks; each additional 50,000 Ks block earns two more coins.
create or replace function public.reseller_coins_for_amount(p_amount numeric)
returns integer language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_amount, 0) <= 0 then 0
    when p_amount <= 10000 then 1
    when p_amount <= 50000 then 3
    when p_amount <= 100000 then 5
    else 5 + (2 * ceil((p_amount - 100000) / 50000.0))::integer
  end;
$$;

create or replace function public.redeem_reseller_coins(
  p_order_id uuid, p_reseller_id uuid, p_coins integer,
  p_subtotal numeric, p_discount numeric, p_total numeric
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer; v_expected_discount numeric;
begin
  if p_coins < 0 or p_subtotal <= 0 then raise exception 'Invalid coin redemption'; end if;
  v_expected_discount := p_coins * 2;
  if p_discount <> v_expected_discount or p_total <> p_subtotal - p_discount or p_total < 0 then
    raise exception 'Invalid coin discount calculation';
  end if;
  if p_coins = 0 then
    update public.orders set subtotal_amount = p_subtotal, discount_amount = 0, coins_used = 0, total_amount = p_total
      where id = p_order_id and reseller_id = p_reseller_id and status = 'pending';
    if not found then raise exception 'Order not found'; end if;
    return 0;
  end if;

  insert into public.reseller_coin_accounts(reseller_id) values (p_reseller_id) on conflict do nothing;
  select balance into v_balance from public.reseller_coin_accounts where reseller_id = p_reseller_id for update;
  if v_balance < p_coins then raise exception 'Not enough coins'; end if;
  if exists (select 1 from public.reseller_coin_ledger where event_key = 'order:' || p_order_id::text || ':redeem') then
    raise exception 'Coins already redeemed for this order';
  end if;

  update public.reseller_coin_accounts set balance = balance - p_coins, updated_at = now()
    where reseller_id = p_reseller_id returning balance into v_balance;
  insert into public.reseller_coin_ledger(reseller_id, amount, balance_after, reason, event_key, order_id)
    values (p_reseller_id, -p_coins, v_balance, 'Coins redeemed on order', 'order:' || p_order_id::text || ':redeem', p_order_id);
  update public.orders set subtotal_amount = p_subtotal, discount_amount = p_discount, coins_used = p_coins, total_amount = p_total
    where id = p_order_id and reseller_id = p_reseller_id and status = 'pending';
  if not found then raise exception 'Order not found'; end if;
  return v_balance;
end;
$$;

create or replace function public.admin_set_order_status_with_coins(
  p_order_id uuid, p_status text, p_cancel_reason text default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_award integer := 0; v_balance integer;
begin
  if p_status not in ('pending','done','cancel') then raise exception 'Invalid status'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  update public.orders set status = p_status,
    cancel_reason = case when p_status = 'cancel' then p_cancel_reason else null end,
    updated_at = now()
    where id = p_order_id;

  if p_status = 'done' and v_order.status <> 'done' and v_order.source = 'reseller' and v_order.reseller_id is not null then
    v_award := public.reseller_coins_for_amount(coalesce(v_order.subtotal_amount, v_order.total_amount));
    if v_award > 0 then
      insert into public.reseller_coin_accounts(reseller_id) values (v_order.reseller_id) on conflict do nothing;
      select balance into v_balance from public.reseller_coin_accounts where reseller_id = v_order.reseller_id for update;
      if not exists (select 1 from public.reseller_coin_ledger where event_key = 'order:' || p_order_id::text || ':award') then
        update public.reseller_coin_accounts set balance = balance + v_award, updated_at = now()
          where reseller_id = v_order.reseller_id returning balance into v_balance;
        insert into public.reseller_coin_ledger(reseller_id, amount, balance_after, reason, event_key, order_id)
          values (v_order.reseller_id, v_award, v_balance, 'Completed order reward', 'order:' || p_order_id::text || ':award', p_order_id);
      else
        v_award := 0;
      end if;
    end if;
  end if;
  return v_award;
end;
$$;

create or replace function public.admin_adjust_reseller_coins(
  p_reseller_id uuid, p_amount integer, p_reason text, p_admin_id uuid
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  if p_amount = 0 or length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Amount and reason are required'; end if;
  insert into public.reseller_coin_accounts(reseller_id) values (p_reseller_id) on conflict do nothing;
  select balance into v_balance from public.reseller_coin_accounts where reseller_id = p_reseller_id for update;
  if v_balance + p_amount < 0 then raise exception 'Adjustment would make balance negative'; end if;
  update public.reseller_coin_accounts set balance = balance + p_amount, updated_at = now()
    where reseller_id = p_reseller_id returning balance into v_balance;
  insert into public.reseller_coin_ledger(reseller_id, amount, balance_after, reason, event_key, created_by)
    values (p_reseller_id, p_amount, v_balance, trim(p_reason), 'adjust:' || gen_random_uuid()::text, p_admin_id);
  return v_balance;
end;
$$;

revoke all on function public.ensure_reseller_coin_account() from public, anon, authenticated;
revoke all on function public.reseller_coins_for_amount(numeric) from public, anon, authenticated;
revoke all on function public.redeem_reseller_coins(uuid,uuid,integer,numeric,numeric,numeric) from public, anon, authenticated;
revoke all on function public.admin_set_order_status_with_coins(uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_adjust_reseller_coins(uuid,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.redeem_reseller_coins(uuid,uuid,integer,numeric,numeric,numeric) to service_role;
grant execute on function public.admin_set_order_status_with_coins(uuid,text,text) to service_role;
grant execute on function public.admin_adjust_reseller_coins(uuid,integer,text,uuid) to service_role;
