-- Run this script once in the Supabase SQL Editor.
-- It creates private account/subscription tables and sample premium lesson text.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default false,
  plan_name text not null default 'Premium',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.premium_lesson_content (
  lesson_id text primary key,
  title text not null,
  body text not null
);

alter table public.user_profiles enable row level security;
alter table public.site_admins enable row level security;
alter table public.premium_subscriptions enable row level security;
alter table public.premium_lesson_content enable row level security;

revoke all on public.user_profiles from anon, authenticated;
revoke all on public.site_admins from anon, authenticated;
revoke all on public.premium_subscriptions from anon, authenticated;
revoke all on public.premium_lesson_content from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.site_admins
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.is_premium_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_site_admin() or exists (
    select 1
    from public.premium_subscriptions
    where user_id = (select auth.uid())
      and is_active = true
      and starts_at <= now()
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.is_site_admin() from public, anon;
revoke all on function public.is_premium_active() from public, anon;
grant execute on function public.is_site_admin() to authenticated;
grant execute on function public.is_premium_active() to authenticated;

create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    insert into public.user_profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do update set email = excluded.email;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_user_profile() from public, anon, authenticated;

drop trigger if exists sync_user_profile_after_auth_insert on auth.users;
drop trigger if exists sync_user_profile_after_email_update on auth.users;
create trigger sync_user_profile_after_auth_insert
after insert on auth.users
for each row execute function public.sync_user_profile();

create trigger sync_user_profile_after_email_update
after update of email on auth.users
for each row execute function public.sync_user_profile();

insert into public.user_profiles (id, email, created_at)
select id, email, created_at
from auth.users
where email is not null
on conflict (id) do update set email = excluded.email;

drop policy if exists "Users and admins can read profiles" on public.user_profiles;
create policy "Users and admins can read profiles"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id or (select public.is_site_admin()));

drop policy if exists "Users can read their subscription and admins can read all" on public.premium_subscriptions;
create policy "Users can read their subscription and admins can read all"
on public.premium_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id or (select public.is_site_admin()));

drop policy if exists "Admins can add subscriptions" on public.premium_subscriptions;
create policy "Admins can add subscriptions"
on public.premium_subscriptions
for insert
to authenticated
with check ((select public.is_site_admin()));

drop policy if exists "Admins can edit subscriptions" on public.premium_subscriptions;
create policy "Admins can edit subscriptions"
on public.premium_subscriptions
for update
to authenticated
using ((select public.is_site_admin()))
with check ((select public.is_site_admin()));

drop policy if exists "Admins can remove subscriptions" on public.premium_subscriptions;
create policy "Admins can remove subscriptions"
on public.premium_subscriptions
for delete
to authenticated
using ((select public.is_site_admin()));

drop policy if exists "Premium members and admins can read premium lessons" on public.premium_lesson_content;
create policy "Premium members and admins can read premium lessons"
on public.premium_lesson_content
for select
to authenticated
using ((select public.is_premium_active()));

grant select on public.user_profiles to authenticated;
grant select, insert, update, delete on public.premium_subscriptions to authenticated;
grant select on public.premium_lesson_content to authenticated;

insert into public.premium_lesson_content (lesson_id, title, body)
values
  (
    'geto-dacii',
    'Geto-dacii: izvoare, organizare și contactul cu Roma',
    $geto$
Geto-dacii făceau parte din lumea tracică și sunt cunoscuți prin izvoare arheologice și relatări ale autorilor antici. Așezările, fortificațiile și obiectele descoperite oferă indicii despre organizarea comunităților și schimburile din regiune.

În secolul I î.Hr., izvoarele îl menționează pe Burebista, care a reunit pentru o perioadă mai multe triburi. În secolul I d.Hr., Decebal a condus Dacia în timpul conflictelor cu Imperiul Roman. Războaiele dintre romani și daci s-au încheiat în 106 d.Hr., când o parte a Daciei a devenit provincie romană.

Pentru a studia tema, compară o hartă a Daciei cu una a Imperiului Roman și notează ce tipuri de dovezi ne oferă fiecare izvor.
    $geto$
  ),
  (
    'unirea-principatelor',
    'Unirea Principatelor: context și pașii către un stat comun',
    $unire$
În prima jumătate a secolului al XIX-lea, ideea unirii Moldovei și Țării Românești a fost susținută de unioniști, pe fondul dezvoltării conștiinței naționale și al schimbărilor politice din Europa.

După Războiul Crimeii, puterile europene au discutat organizarea Principatelor. Adunările ad-hoc din 1857 au exprimat dorința unirii. În 1859, Alexandru Ioan Cuza a fost ales domnitor în Moldova și apoi în Țara Românească, realizând unirea de facto. Recunoașterea și organizarea instituțiilor comune s-au desfășurat în anii următori.

Unirea a deschis calea unor reforme și a consolidării statului. Când analizezi evenimentul, deosebește momentul dublei alegeri din 1859 de etapele administrative care au urmat.
    $unire$
  )
on conflict (lesson_id) do update
set title = excluded.title, body = excluded.body;
