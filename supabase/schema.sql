-- PROVEXA admin panel schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > Run)

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  customer text not null,
  status text not null default 'En proceso de compra',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.sales enable row level security;
alter table public.products enable row level security;

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

create policy "Authenticated users can read products"
  on public.products for select
  to authenticated
  using (true);

create policy "Authenticated users can write products"
  on public.products for insert
  to authenticated
  with check (true);

create policy "Authenticated users can delete products"
  on public.products for delete
  to authenticated
  using (true);
