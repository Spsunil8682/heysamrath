-- Hey Samrath: privileges and Row Level Security.
--
-- Supabase no longer exposes new tables to the Data API automatically, and default privileges vary
-- between projects, so everything is revoked first and then granted explicitly. RLS is the second,
-- row-level layer on top of these grants.

-- ---------------------------------------------------------------------------
-- Table privileges
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.services, public.portfolio_items, public.business_settings to anon, authenticated;

grant insert, update, delete on public.services, public.portfolio_items to authenticated;
grant update on public.business_settings to authenticated;
grant select, update on public.bookings to authenticated;           -- no INSERT: requests go through RPC
grant select, insert, update, delete on public.availability_blocks to authenticated;
grant select on public.booking_events to authenticated;
grant select, update, delete on public.contact_messages to authenticated;
grant select on public.profiles to authenticated;                     -- no INSERT/UPDATE: roles are not self-service

-- ---------------------------------------------------------------------------
-- Function privileges: deny by default, then allow the narrow public surface.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_availability(date, date) to anon, authenticated;
grant execute on function public.create_booking_request(
  text, text, text, uuid, date, time, time, text, text, text, boolean
) to anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text) to anon, authenticated;
grant execute on function public.confirmed_bookings_outside_hours() to authenticated;
-- Used inside CHECK constraints evaluated for admin writes.
grant execute on function public.is_allowed_media_url(text) to anon, authenticated;
grant execute on function public.is_valid_business_hours(jsonb) to anon, authenticated;

-- Future functions are not executable by API roles unless granted explicitly.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.services enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.contact_messages enable row level security;

-- profiles: users see their own row; admins see all. No write policies at all.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- business_settings: public contact details and booking rules; admin edits.
create policy settings_public_read on public.business_settings
  for select to anon, authenticated using (true);
create policy settings_admin_update on public.business_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- services: active services are public; admins see and manage all.
create policy services_read on public.services
  for select to anon, authenticated
  using (active or (select public.is_admin()));
create policy services_admin_insert on public.services
  for insert to authenticated with check ((select public.is_admin()));
create policy services_admin_update on public.services
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy services_admin_delete on public.services
  for delete to authenticated using ((select public.is_admin()));

-- portfolio: published items are public; admins see and manage all.
create policy portfolio_read on public.portfolio_items
  for select to anon, authenticated
  using (published or (select public.is_admin()));
create policy portfolio_admin_insert on public.portfolio_items
  for insert to authenticated with check ((select public.is_admin()));
create policy portfolio_admin_update on public.portfolio_items
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy portfolio_admin_delete on public.portfolio_items
  for delete to authenticated using ((select public.is_admin()));

-- bookings: admin only. The public creates requests via create_booking_request() and never reads rows.
create policy bookings_admin_read on public.bookings
  for select to authenticated using ((select public.is_admin()));
create policy bookings_admin_update on public.bookings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy booking_events_admin_read on public.booking_events
  for select to authenticated using ((select public.is_admin()));

-- availability_blocks: admin only (reasons may be private). Public sees busy ranges via get_availability().
create policy blocks_admin_read on public.availability_blocks
  for select to authenticated using ((select public.is_admin()));
create policy blocks_admin_insert on public.availability_blocks
  for insert to authenticated with check ((select public.is_admin()));
create policy blocks_admin_update on public.availability_blocks
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy blocks_admin_delete on public.availability_blocks
  for delete to authenticated using ((select public.is_admin()));

-- contact_messages: admin only; public submits via submit_contact_message().
create policy contact_admin_read on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy contact_admin_update on public.contact_messages
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy contact_admin_delete on public.contact_messages
  for delete to authenticated using ((select public.is_admin()));
