-- Hey Samrath: booking rules, conflict prevention and triggers.
--
-- Concurrency model
--   1. `bookings_no_overlap` (EXCLUDE USING gist) makes overlapping confirmed bookings impossible,
--      regardless of which code path writes them or how many transactions race.
--   2. Every calendar-mutating write (confirming a booking, moving a confirmed booking, adding a block,
--      lowering the per-day limit) takes the same transaction-scoped advisory lock first, so the
--      rules the constraint cannot express (blocked ranges, bookings-per-day) are checked serially.
--      Under READ COMMITTED each statement inside the trigger sees rows committed by the previous
--      lock holder.
--   3. The checks live in BEFORE triggers, so a direct UPDATE through the Data API is held to the same
--      rules as the RPCs.
-- Pending requests never occupy the calendar, so no hold/expiry mechanism is needed.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.calendar_lock_key()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 7243150001::bigint $$;

create or replace function public.day_booking_limit(s public.business_settings)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when s.allow_multiple_per_day then coalesce(s.max_bookings_per_day, 20) else 1 end;
$$;

-- Converts a local schedule into absolute instants. DST-safe: PostgreSQL resolves wall-clock times
-- with the zone's rules for that specific date.
create or replace function public.booking_window(
  p_date date,
  p_start time,
  p_end time,
  p_mode public.service_booking_mode,
  p_duration_minutes integer,
  p_timezone text,
  out starts_at timestamptz,
  out ends_at timestamptz,
  out start_time time,
  out end_time time
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_mode = 'full_day' then
    starts_at := p_date::timestamp at time zone p_timezone;
    ends_at := (p_date + 1)::timestamp at time zone p_timezone;
    start_time := null;
    end_time := null;
    return;
  end if;

  if p_start is null then
    raise exception using message = 'START_TIME_REQUIRED', hint = 'Please choose a start time.';
  end if;

  starts_at := (p_date + p_start) at time zone p_timezone;
  if p_end is null then
    ends_at := starts_at + make_interval(mins => p_duration_minutes);
  elsif p_end > p_start then
    ends_at := (p_date + p_end) at time zone p_timezone;
  else
    -- Ends after midnight.
    ends_at := ((p_date + 1) + p_end) at time zone p_timezone;
  end if;
  start_time := p_start;
  end_time := (ends_at at time zone p_timezone)::time;
end;
$$;

create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- no 0/O/1/I/L
  raw bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  ref text := 'BK-';
  i integer;
begin
  for i in 0..7 loop
    ref := ref || substr(alphabet, (get_byte(raw, i) % length(alphabet)) + 1, 1);
  end loop;
  return ref;
end;
$$;

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger portfolio_items_updated_at before update on public.portfolio_items
  for each row execute function public.set_updated_at();
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();
create trigger business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------

-- Every new auth user gets a 'customer' profile. Client-supplied metadata is ignored, so nobody can
-- sign up as an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Defence in depth on top of the missing UPDATE grant: roles can only change from a trusted
-- database session (SQL editor / migrations), never through the API roles.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated') then
    raise exception using message = 'FORBIDDEN', hint = 'Roles can only be changed by a database administrator.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Business settings guard
-- ---------------------------------------------------------------------------
create or replace function public.business_settings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_limit integer;
  conflict_dates text;
begin
  new.id := 1;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using message = 'INVALID_TIMEZONE', hint = 'Use an IANA time zone such as Asia/Kolkata.';
  end if;

  if tg_op = 'UPDATE' then
    -- Re-interpreting stored local times in another zone would silently move existing events.
    if new.timezone <> old.timezone and exists (
      select 1 from public.bookings
      where status in ('pending', 'confirmed') and ends_at > now()
    ) then
      raise exception using message = 'TIMEZONE_LOCKED',
        hint = 'The time zone cannot change while upcoming pending or confirmed bookings exist.';
    end if;

    new_limit := public.day_booking_limit(new);
    if new_limit < public.day_booking_limit(old) then
      perform pg_advisory_xact_lock(public.calendar_lock_key());
      select string_agg(d::text, ', ' order by d) into conflict_dates
      from (
        select b.event_date as d
        from public.bookings b
        where b.status = 'confirmed' and b.occupied is not null
          and b.event_date >= (now() at time zone old.timezone)::date
        group by b.event_date
        having count(*) > new_limit
      ) x;
      if conflict_dates is not null then
        raise exception using message = 'LIMIT_CONFLICT',
          detail = conflict_dates,
          hint = 'Some upcoming dates already have more confirmed bookings than the new limit allows.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger business_settings_guard
  before insert or update on public.business_settings
  for each row execute function public.business_settings_before_write();

-- ---------------------------------------------------------------------------
-- Availability blocks
-- ---------------------------------------------------------------------------
create or replace function public.availability_blocks_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  refs text;
begin
  select timezone into tz from public.business_settings where id = 1;

  if new.start_time is null then
    new.blocked := tstzrange(
      new.start_date::timestamp at time zone tz,
      (new.end_date + 1)::timestamp at time zone tz,
      '[)'
    );
  else
    new.blocked := tstzrange(
      (new.start_date + new.start_time) at time zone tz,
      (new.start_date + new.end_time) at time zone tz,
      '[)'
    );
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;

  -- Never let a block silently swallow an existing confirmed booking.
  perform pg_advisory_xact_lock(public.calendar_lock_key());
  select string_agg(b.booking_reference, ', ' order by b.starts_at) into refs
  from public.bookings b
  where b.status = 'confirmed'
    and b.occupied is not null
    and tstzrange(b.starts_at, b.ends_at, '[)') && new.blocked;

  if refs is not null then
    raise exception using message = 'BLOCK_CONFLICTS_BOOKING',
      detail = refs,
      hint = 'This range overlaps confirmed bookings. Cancel or move them first.';
  end if;

  return new;
end;
$$;

create trigger availability_blocks_guard
  before insert or update on public.availability_blocks
  for each row execute function public.availability_blocks_before_write();

-- ---------------------------------------------------------------------------
-- Bookings: derive schedule, enforce status machine, enforce availability on confirmation
-- ---------------------------------------------------------------------------
create or replace function public.bookings_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.business_settings;
  svc public.services;
  w record;
  schedule_changed boolean;
  conflict_ref text;
  day_count integer;
begin
  select * into s from public.business_settings where id = 1;
  select * into svc from public.services where id = new.service_id;
  if svc.id is null then
    raise exception using message = 'SERVICE_NOT_FOUND', hint = 'The selected service does not exist.';
  end if;

  if tg_op = 'UPDATE' then
    -- Immutable fields.
    new.id := old.id;
    new.booking_reference := old.booking_reference;
    new.created_at := old.created_at;
    new.consent_at := old.consent_at;
    schedule_changed := (new.event_date, new.start_time, new.end_time, new.service_id)
      is distinct from (old.event_date, old.start_time, old.end_time, old.service_id);
  else
    new.booking_reference := coalesce(new.booking_reference, public.generate_booking_reference());
    schedule_changed := true;
  end if;

  if schedule_changed then
    select * into w from public.booking_window(
      new.event_date, new.start_time, new.end_time, svc.booking_mode, svc.duration_minutes, s.timezone
    );
    new.starts_at := w.starts_at;
    new.ends_at := w.ends_at;
    new.start_time := w.start_time;
    new.end_time := w.end_time;
  end if;

  -- Status machine.
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'rejected', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('cancelled', 'completed'))
      or (old.status in ('rejected', 'cancelled') and new.status = 'pending')
    ) then
      raise exception using message = 'INVALID_STATUS_TRANSITION',
        detail = format('%s -> %s', old.status, new.status),
        hint = format('A %s booking cannot be marked %s.', old.status, new.status);
    end if;
    if new.status = 'completed' and new.starts_at > now() then
      raise exception using message = 'EVENT_NOT_STARTED', hint = 'Only events that have started can be completed.';
    end if;
  end if;

  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_changed_at := now();
    case new.status
      when 'confirmed' then new.confirmed_at := now();
      when 'rejected' then new.rejected_at := now();
      when 'cancelled' then new.cancelled_at := now();
      when 'completed' then new.completed_at := now();
      else null;
    end case;
  end if;

  -- Calendar occupancy: only confirmed bookings of calendar-blocking services.
  if new.status = 'confirmed' and svc.blocks_calendar then
    if tg_op = 'INSERT' or schedule_changed or old.status <> 'confirmed' or old.occupied is null then
      new.occupied := tstzrange(
        new.starts_at,
        new.ends_at + case when svc.booking_mode = 'timed'
                           then make_interval(mins => s.buffer_minutes)
                           else interval '0' end,
        '[)'
      );
    else
      -- Keep the occupancy agreed at confirmation time (buffer changes are not retroactive).
      new.occupied := old.occupied;
    end if;
  else
    new.occupied := null;
  end if;

  -- Availability re-check whenever a booking newly occupies (or moves within) the calendar.
  if new.occupied is not null
     and (tg_op = 'INSERT' or old.status <> 'confirmed' or schedule_changed or old.occupied is null) then
    perform pg_advisory_xact_lock(public.calendar_lock_key());

    if new.starts_at < now() then
      raise exception using message = 'EVENT_IN_PAST', hint = 'Bookings in the past cannot be confirmed or moved.';
    end if;

    if exists (
      select 1 from public.availability_blocks a
      where a.blocked && tstzrange(new.starts_at, new.ends_at, '[)')
    ) then
      raise exception using message = 'SLOT_BLOCKED', hint = 'This time overlaps a blocked period.';
    end if;

    select b.booking_reference into conflict_ref
    from public.bookings b
    where b.status = 'confirmed' and b.id <> new.id and b.occupied && new.occupied
    limit 1;
    if conflict_ref is not null then
      raise exception using message = 'SLOT_CONFLICT', detail = conflict_ref,
        hint = format('This time overlaps confirmed booking %s (including buffer time).', conflict_ref);
    end if;

    select count(*) into day_count
    from public.bookings b
    where b.status = 'confirmed' and b.occupied is not null
      and b.event_date = new.event_date and b.id <> new.id;
    if day_count >= public.day_booking_limit(s) then
      raise exception using message = 'DAY_FULL', hint = 'The maximum number of bookings for this date has been reached.';
    end if;
  end if;

  return new;
end;
$$;

create trigger bookings_guard
  before insert or update on public.bookings
  for each row execute function public.bookings_before_write();

create or replace function public.bookings_log_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, event_type, to_status, actor_id)
    values (new.id, 'created', new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.booking_events (booking_id, event_type, from_status, to_status, actor_id)
    values (new.id, 'status_changed', old.status, new.status, auth.uid());
  elsif (new.event_date, new.start_time, new.end_time, new.service_id, new.location, new.customer_name,
         new.phone, new.email, new.admin_notes, new.requirements, new.budget)
        is distinct from
        (old.event_date, old.start_time, old.end_time, old.service_id, old.location, old.customer_name,
         old.phone, old.email, old.admin_notes, old.requirements, old.budget) then
    insert into public.booking_events (booking_id, event_type, from_status, to_status, actor_id)
    values (new.id, 'updated', old.status, new.status, auth.uid());
  end if;
  return null;
end;
$$;

create trigger bookings_log
  after insert or update on public.bookings
  for each row execute function public.bookings_log_event();

-- ---------------------------------------------------------------------------
-- Public RPC: submit a booking request (always 'pending')
-- ---------------------------------------------------------------------------
create or replace function public.create_booking_request(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_service_id uuid,
  p_event_date date,
  p_start_time time,
  p_end_time time,
  p_location text,
  p_budget text,
  p_requirements text,
  p_consent boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.business_settings;
  svc public.services;
  w record;
  tz text;
  today date;
  hrs jsonb;
  open_at timestamptz;
  close_at timestamptz;
  candidate tstzrange;
  day_count integer;
  ref text;
  v_email text := lower(btrim(p_email));
  v_phone text := btrim(p_phone);
  constraint_name text;
  attempt integer := 0;
begin
  if p_consent is not true then
    raise exception using message = 'CONSENT_REQUIRED', hint = 'Please accept the privacy notice.';
  end if;

  select * into s from public.business_settings where id = 1;
  tz := s.timezone;
  today := (now() at time zone tz)::date;

  select * into svc from public.services where id = p_service_id and active;
  if svc.id is null then
    raise exception using message = 'SERVICE_UNAVAILABLE', hint = 'The selected service is not available.';
  end if;

  -- Anti-abuse: per-contact and global throttles.
  if (select count(*) from public.bookings
      where (lower(email) = v_email or phone = v_phone)
        and created_at > now() - interval '1 hour') >= 3 then
    raise exception using message = 'RATE_LIMITED', hint = 'Too many requests. Please try again later or contact us directly.';
  end if;
  if (select count(*) from public.bookings where created_at > now() - interval '10 minutes') >= 30 then
    raise exception using message = 'RATE_LIMITED', hint = 'We are receiving many requests. Please try again shortly.';
  end if;

  if p_event_date is null or p_event_date < today then
    raise exception using message = 'DATE_IN_PAST', hint = 'Please choose a future date.';
  end if;
  if p_event_date > today + s.max_advance_days then
    raise exception using message = 'DATE_TOO_FAR', hint = format('Bookings open up to %s days in advance.', s.max_advance_days);
  end if;

  select * into w from public.booking_window(
    p_event_date, p_start_time, p_end_time, svc.booking_mode, svc.duration_minutes, tz
  );

  if w.starts_at < now() + make_interval(hours => s.min_notice_hours) then
    raise exception using message = 'NOTICE_TOO_SHORT',
      hint = format('Please book at least %s hours in advance.', s.min_notice_hours);
  end if;

  -- Working hours.
  hrs := s.business_hours -> extract(isodow from p_event_date)::integer::text;
  if hrs is null or jsonb_typeof(hrs) = 'null' then
    raise exception using message = 'CLOSED_DAY', hint = 'We are not available on this day of the week.';
  end if;
  if svc.booking_mode = 'timed' then
    open_at := (p_event_date + (hrs ->> 'open')::time) at time zone tz;
    close_at := (p_event_date + (hrs ->> 'close')::time) at time zone tz;
    if w.starts_at < open_at or w.ends_at > close_at then
      raise exception using message = 'OUTSIDE_HOURS',
        hint = format('Please choose a time between %s and %s.', hrs ->> 'open', hrs ->> 'close');
    end if;
  end if;

  if svc.blocks_calendar then
    if exists (select 1 from public.availability_blocks a
               where a.blocked && tstzrange(w.starts_at, w.ends_at, '[)')) then
      raise exception using message = 'SLOT_BLOCKED', hint = 'This date or time is not available.';
    end if;

    candidate := tstzrange(
      w.starts_at,
      w.ends_at + case when svc.booking_mode = 'timed' then make_interval(mins => s.buffer_minutes) else interval '0' end,
      '[)'
    );
    if exists (select 1 from public.bookings b
               where b.status = 'confirmed' and b.occupied && candidate) then
      raise exception using message = 'SLOT_UNAVAILABLE', hint = 'This time is already booked. Please choose another time.';
    end if;

    select count(*) into day_count from public.bookings b
    where b.status = 'confirmed' and b.occupied is not null and b.event_date = p_event_date;
    if day_count >= public.day_booking_limit(s) then
      raise exception using message = 'DAY_FULL', hint = 'This date is fully booked.';
    end if;
  end if;

  loop
    attempt := attempt + 1;
    begin
      insert into public.bookings (
        customer_name, phone, email, service_id, event_date, start_time, end_time,
        location, budget, requirements, status, consent_at
      ) values (
        btrim(p_customer_name), v_phone, v_email, svc.id, p_event_date, w.start_time,
        case when svc.booking_mode = 'timed' then w.end_time end,
        btrim(p_location), nullif(btrim(p_budget), ''), nullif(btrim(p_requirements), ''),
        'pending', now()
      )
      returning booking_reference into ref;
      exit;
    exception when unique_violation then
      get stacked diagnostics constraint_name = constraint_name;
      if constraint_name = 'bookings_pending_dedupe_idx' then
        raise exception using message = 'DUPLICATE_REQUEST',
          hint = 'You already have a pending request for this service and time.';
      end if;
      if attempt >= 5 then
        raise;
      end if;
      -- Reference collision: retry with a fresh reference.
    end;
  end loop;

  return jsonb_build_object(
    'booking_reference', ref,
    'status', 'pending',
    'event_date', p_event_date,
    'start_time', to_char(w.start_time, 'HH24:MI'),
    'end_time', to_char(w.end_time, 'HH24:MI'),
    'service_name', svc.name
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC: availability for a date range (no customer data, no block reasons)
-- ---------------------------------------------------------------------------
create or replace function public.get_availability(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.business_settings;
  tz text;
  today date;
  last_day date;
  d date;
  hrs jsonb;
  day_start timestamptz;
  day_end timestamptz;
  work tstzrange;
  busy jsonb;
  confirmed_count integer;
  day_status text;
  days jsonb := '[]'::jsonb;
  lim integer;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    raise exception using message = 'INVALID_RANGE', hint = 'Request at most 62 days at a time.';
  end if;

  select * into s from public.business_settings where id = 1;
  tz := s.timezone;
  today := (now() at time zone tz)::date;
  last_day := today + s.max_advance_days;
  lim := public.day_booking_limit(s);

  for d in select generate_series(p_from, p_to, interval '1 day')::date loop
    hrs := s.business_hours -> extract(isodow from d)::integer::text;
    if hrs is not null and jsonb_typeof(hrs) = 'null' then
      hrs := null;
    end if;
    day_start := d::timestamp at time zone tz;
    day_end := (d + 1)::timestamp at time zone tz;

    select coalesce(jsonb_agg(jsonb_build_object(
             'start', to_char(greatest(lower(x.r), day_start) at time zone tz, 'HH24:MI'),
             'end', case when upper(x.r) >= day_end then '24:00'
                         else to_char(upper(x.r) at time zone tz, 'HH24:MI') end,
             'kind', x.kind
           ) order by lower(x.r)), '[]'::jsonb)
    into busy
    from (
      select b.occupied as r, 'booked'::text as kind
      from public.bookings b
      where b.status = 'confirmed' and b.occupied && tstzrange(day_start, day_end, '[)')
      union all
      select a.blocked, 'blocked'
      from public.availability_blocks a
      where a.blocked && tstzrange(day_start, day_end, '[)')
    ) x;

    select count(*) into confirmed_count
    from public.bookings b
    where b.status = 'confirmed' and b.occupied is not null and b.event_date = d;

    if hrs is not null then
      work := tstzrange((d + (hrs ->> 'open')::time) at time zone tz,
                        (d + (hrs ->> 'close')::time) at time zone tz, '[)');
    else
      work := null;
    end if;

    if d < today then
      day_status := 'past';
    elsif d > last_day then
      day_status := 'unavailable';
    elsif hrs is null then
      day_status := 'closed';
    elsif exists (select 1 from public.availability_blocks a where a.blocked @> work) then
      day_status := 'blocked';
    elsif confirmed_count >= lim
       or exists (select 1 from public.bookings b
                  where b.status = 'confirmed' and b.occupied @> work) then
      day_status := 'booked';
    elsif jsonb_array_length(busy) > 0 then
      day_status := 'limited';
    else
      day_status := 'available';
    end if;

    days := days || jsonb_build_object(
      'date', d,
      'status', day_status,
      'open', hrs ->> 'open',
      'close', hrs ->> 'close',
      'busy', case when day_status in ('past', 'unavailable', 'closed') then '[]'::jsonb else busy end
    );
  end loop;

  return jsonb_build_object(
    'timezone', tz,
    'today', today,
    'last_bookable_date', last_day,
    'min_notice_hours', s.min_notice_hours,
    'buffer_minutes', s.buffer_minutes,
    'days', days
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public RPC: contact form
-- ---------------------------------------------------------------------------
create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_message text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
  new_id uuid;
begin
  if (select count(*) from public.contact_messages
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from public.contact_messages where created_at > now() - interval '10 minutes') >= 30 then
    raise exception using message = 'RATE_LIMITED', hint = 'Too many messages. Please try again later.';
  end if;

  insert into public.contact_messages (name, email, phone, message)
  values (btrim(p_name), v_email, nullif(btrim(p_phone), ''), btrim(p_message))
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin helper: upcoming confirmed bookings that fall outside the current working hours
-- (shown as a warning after hours change; such bookings are kept, never silently dropped).
-- ---------------------------------------------------------------------------
create or replace function public.confirmed_bookings_outside_hours()
returns table (booking_reference text, event_date date, start_time time, end_time time)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.business_settings;
begin
  if not public.is_admin() then
    raise exception using message = 'FORBIDDEN';
  end if;
  select * into s from public.business_settings where id = 1;

  return query
  select b.booking_reference, b.event_date, b.start_time, b.end_time
  from public.bookings b
  left join lateral (
    select s.business_hours -> extract(isodow from b.event_date)::integer::text as h
  ) hh on true
  where b.status = 'confirmed' and b.ends_at > now()
    and (
      hh.h is null or jsonb_typeof(hh.h) = 'null'
      or (b.start_time is not null and (
            b.start_time < (hh.h ->> 'open')::time
            or b.end_time > (hh.h ->> 'close')::time
            or b.end_time <= b.start_time))
    )
  order by b.starts_at;
end;
$$;
