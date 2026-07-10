# Cruuz Management Website

This is a plain HTML/CSS/JavaScript website. It does not use React, Next.js, Vite, Astro, or a build system.

## Asset Structure

- Images live in `assets/images/`.
- Videos live in `assets/videos/`.
- Use relative paths such as `./assets/images/file-name.png` and `./assets/videos/file-name.mp4` so the site works after GitHub deployment.

## Live Reviews Setup

1. Create a `reviews` table in Supabase.
2. Enable Row Level Security.
3. Add a policy allowing anon users to read only approved reviews.
4. Copy `supabase-config.example.js` to `supabase-config.js`.
5. Add the Supabase Project URL.
6. Add the Supabase anon public key.
7. Never use the service role key in frontend code.
8. If using the public review form, add the pending-review insert policy below.

Reference SQL:

```sql
create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  business_name text,
  review_text text not null,
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  industry text,
  is_approved boolean not null default false,
  display_order integer default 0,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Public can read approved reviews" on public.reviews;

create policy "Public can read approved reviews"
on public.reviews
for select
to anon
using (is_approved = true);

create index if not exists idx_reviews_approved_order
on public.reviews(is_approved, display_order, created_at desc);

grant select, insert on public.reviews to anon;

drop policy if exists "Public can submit pending reviews" on public.reviews;

create policy "Public can submit pending reviews"
on public.reviews
for insert
to anon
with check (is_approved = false);
```

The Approved Reviews section reads only approved reviews and sorts by `display_order` first, then `created_at`.
New public submissions are saved as unapproved rows and will not display until approved.

## Video Hosting Note

The demo section embeds the auto repair and salon demos from YouTube using responsive iframe embeds.
