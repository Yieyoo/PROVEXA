-- PROVEXA admin panel schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > Run)

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null default '',
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  folio integer generated always as identity,
  date date not null,
  customer text not null,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'En proceso de compra',
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.sales enable row level security;

create policy "Authenticated users can read products"
  on public.products for select
  to authenticated
  using (true);

create policy "Authenticated users can write products"
  on public.products for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update products"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete products"
  on public.products for delete
  to authenticated
  using (true);

create policy "Authenticated users can read sales"
  on public.sales for select
  to authenticated
  using (true);

create policy "Authenticated users can write sales"
  on public.sales for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update sales"
  on public.sales for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete sales"
  on public.sales for delete
  to authenticated
  using (true);
