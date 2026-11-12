-- TupiniMesa — esquema de sincronização (Supabase / Postgres).
-- Cole este arquivo inteiro em: Supabase > SQL Editor > New query > Run.
-- Depois ative: Authentication > Sign In / Providers > "Allow anonymous sign-ins".

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create sequence if not exists public.records_seq;

-- Um registro por item de estoque, receita, card do cardápio ou residência.
-- `updated_at` é o relógio do aparelho (ms) e decide qual cópia vence;
-- `seq` é o cursor do servidor usado para baixar só o que mudou.
create table if not exists public.records (
  id uuid primary key,
  household_id uuid not null references public.households on delete cascade,
  data jsonb not null,
  updated_at bigint not null,
  deleted boolean not null default false,
  seq bigint not null default nextval('public.records_seq')
);
create index if not exists records_household_seq on public.records (household_id, seq);

create or replace function public.records_lww() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.household_id <> old.household_id then
      raise exception 'record belongs to another household';
    end if;
    -- Uma cópia mais antiga nunca sobrescreve uma mais nova.
    if new.updated_at <= old.updated_at then
      return null;
    end if;
  end if;
  new.seq := nextval('public.records_seq');
  return new;
end $$;

drop trigger if exists records_lww on public.records;
create trigger records_lww before insert or update on public.records
  for each row execute function public.records_lww();

create or replace function public.is_member(h uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.household_members
    where household_id = h and user_id = auth.uid()
  );
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.records enable row level security;

drop policy if exists households_read on public.households;
create policy households_read on public.households
  for select using (public.is_member(id));

drop policy if exists members_read on public.household_members;
create policy members_read on public.household_members
  for select using (user_id = auth.uid());

drop policy if exists records_read on public.records;
create policy records_read on public.records
  for select using (public.is_member(household_id));

drop policy if exists records_insert on public.records;
create policy records_insert on public.records
  for insert with check (public.is_member(household_id));

drop policy if exists records_update on public.records;
create policy records_update on public.records
  for update using (public.is_member(household_id))
  with check (public.is_member(household_id));

-- Cria a residência e já coloca quem chamou como morador.
create or replace function public.create_household(p_name text)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
  i int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.households h where h.code = v_code);
  end loop;
  insert into public.households (name, code)
    values (coalesce(nullif(trim(p_name), ''), 'Minha casa'), v_code)
    returning households.id into v_id;
  insert into public.household_members (household_id, user_id) values (v_id, auth.uid());
  return query select v_id, v_code;
end $$;

-- Entra numa residência existente usando o código de convite.
create or replace function public.join_household(p_code text)
returns table (id uuid, name text, code text)
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select h.id into v_id from public.households h
    where h.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
  if v_id is null then raise exception 'invalid code'; end if;
  insert into public.household_members (household_id, user_id)
    values (v_id, auth.uid()) on conflict do nothing;
  return query select h.id, h.name, h.code from public.households h where h.id = v_id;
end $$;

revoke all on function public.create_household(text) from public, anon;
revoke all on function public.join_household(text) from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- Atualização em tempo real entre aparelhos.
do $$ begin
  alter publication supabase_realtime add table public.records;
exception when duplicate_object then null; end $$;
