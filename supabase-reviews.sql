-- Supabase setup for Cruuz Management public reviews.
-- Run this in the Supabase SQL editor.
-- Then copy supabase-config.example.js to supabase-config.js and add your
-- Supabase Project URL plus anon public key. Never use a service role key here.

create extension if not exists "pgcrypto";

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  business_name text check (business_name is null or char_length(business_name) <= 100),
  review_text text not null check (char_length(review_text) between 10 and 700),
  rating integer not null check (rating between 1 and 5),
  industry text not null check (char_length(industry) between 2 and 80),
  is_approved boolean not null default false,
  display_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

grant select, insert on public.reviews to anon;

drop policy if exists "Anyone can read approved reviews" on public.reviews;
create policy "Anyone can read approved reviews"
on public.reviews
for select
to anon
using (is_approved = true);

drop policy if exists "Anyone can submit pending reviews" on public.reviews;
create policy "Anyone can submit pending reviews"
on public.reviews
for insert
to anon
with check (is_approved = false);

create index if not exists reviews_public_display_idx
on public.reviews (is_approved, display_order asc, created_at desc);
