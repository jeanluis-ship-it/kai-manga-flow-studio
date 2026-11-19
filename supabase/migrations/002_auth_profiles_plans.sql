-- =============================================================================
-- MANGAI Studio OS — Sprint 4: Auth Profiles Trigger, Trial Expiration & Plans
-- =============================================================================

-- Añadir columnas de vigencia y billing a profiles
alter table public.profiles
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '3 days'),
  add column if not exists hd_render_enabled boolean not null default false,
  add column if not exists render_priority boolean not null default false,
  add column if not exists billing_customer_id text,
  add column if not exists subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));

-- Trigger: crear perfil automáticamente al registrarse en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    display_name,
    plan_tier,
    max_projects,
    max_pages,
    trial_ends_at,
    hd_render_enabled,
    render_priority
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'trial',
    1,
    10,
    now() + interval '3 days',
    false,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
