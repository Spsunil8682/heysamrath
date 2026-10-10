-- Hey Samrath: core schema.
-- Local event scheduling uses `date` + `time` (wall-clock in the business time zone).
-- Absolute instants (`starts_at`, `ends_at`, `occupied`, audit timestamps) use `timestamptz`.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'customer');
create type public.booking_status as enum ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
create type public.portfolio_category as enum (
  'weddings', 'pre_wedding', 'events', 'commercial', 'social_reels', 'video_editing', 'photography'
);
create type public.media_type as enum ('image', 'video');
-- timed: occupies start..end (+ buffer). full_day: occupies the whole local day.
create type public.service_booking_mode as enum ('timed', 'full_day');

-- ---------------------------------------------------------------------------
-- Validation helpers (immutable, usable in CHECK constraints)
-- ---------------------------------------------------------------------------

-- Media may only reference files bundled under /media/ or Cloudinary delivery URLs.
create or replace function public.is_allowed_media_url(url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select url is null or (
    (url ~ '^/media/[A-Za-z0-9][A-Za-z0-9._/-]*$' and url !~ '\.\.' and url !~ '//')
    or url ~ '^https://res\.cloudinary\.com/[A-Za-z0-9_-]+/(image|video)/upload/[A-Za-z0-9_./,:%-]+$'
  );
$$;

-- business_hours: {"1": {"open": "09:00", "close": "20:00"}, ..., "7": null}
-- Keys are ISO weekdays (1 = Monday ... 7 = Sunday). null = closed.
create or replace function public.is_valid_business_hours(h jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
  v jsonb;
begin
  if h is null or jsonb_typeof(h) <> 'object' then
    return false;
  end if;
  for k, v in select * from jsonb_each(h) loop
    if k not in ('1', '2', '3', '4', '5', '6', '7') then
      return false;
    end if;
    if jsonb_typeof(v) = 'null' then
      continue;
    end if;
    if jsonb_typeof(v) <> 'object'
       or coalesce(v ->> 'open', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v ->> 'close', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or (v ->> 'close') <= (v ->> 'open') then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
  id smallint primary key default 1 check (id = 1),
  business_name text not null default 'Hey Samrath' check (char_length(business_name) between 1 and 80),
  tagline text check (char_length(tagline) <= 160),
  logo_url text check (public.is_allowed_media_url(logo_url)),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  email text check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Digits only, with country code, as used by https://wa.me/<number>
  whatsapp text check (whatsapp ~ '^[1-9][0-9]{7,14}$'),
  address text check (char_length(address) <= 300),
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  business_hours jsonb not null default '{
    "1": {"open": "09:00", "close": "21:00"},
    "2": {"open": "09:00", "close": "21:00"},
    "3": {"open": "09:00", "close": "21:00"},
    "4": {"open": "09:00", "close": "21:00"},
    "5": {"open": "09:00", "close": "21:00"},
    "6": {"open": "09:00", "close": "21:00"},
    "7": {"open": "09:00", "close": "21:00"}
  }'::jsonb check (public.is_valid_business_hours(business_hours)),
  timezone text not null default 'Asia/Kolkata',
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  -- Booking rules
  buffer_minutes integer not null default 60 check (buffer_minutes between 0 and 720),
  min_notice_hours integer not null default 24 check (min_notice_hours between 0 and 2160),
  max_advance_days integer not null default 365 check (max_advance_days between 1 and 1095),
  allow_multiple_per_day boolean not null default true,
  max_bookings_per_day integer default 2 check (max_bookings_per_day between 1 and 20),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  description text not null default '' check (char_length(description) <= 4000),
  -- null = "price on request". Never seed real-looking prices.
  price numeric(12, 2) check (price >= 0),
  price_is_starting boolean not null default true,
  currency char(3) not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  duration_minutes integer not null default 120 check (duration_minutes between 15 and 1440),
  booking_mode public.service_booking_mode not null default 'timed',
  -- false = remote work (e.g. editing) that does not occupy the shooting calendar.
  blocks_calendar boolean not null default true,
  cover_image_url text check (public.is_allowed_media_url(cover_image_url)),
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_active_order_idx on public.services (active, display_order);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  category public.portfolio_category not null,
  media_type public.media_type not null,
  media_url text not null check (public.is_allowed_media_url(media_url)),
  thumbnail_url text check (public.is_allowed_media_url(thumbnail_url)),
  alt_text text not null default '' check (char_length(alt_text) <= 300),
  event_date date,
  featured boolean not null default false,
  published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Videos need a poster so the gallery never downloads the full file to render a tile.
  constraint portfolio_video_needs_thumbnail check (media_type <> 'video' or thumbnail_url is not null)
);
create index portfolio_published_idx on public.portfolio_items (published, category, display_order, created_at desc);
create index portfolio_featured_idx on public.portfolio_items (featured, display_order) where published;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  phone text not null check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  service_id uuid not null references public.services (id) on delete restrict,
  event_date date not null,
  start_time time,                    -- null for full-day services
  end_time time,                      -- <= start_time means the event ends after midnight
  location text not null check (char_length(location) between 2 and 300),
  budget text check (char_length(budget) <= 60),
  requirements text check (char_length(requirements) <= 4000),
  status public.booking_status not null default 'pending',
  admin_notes text check (char_length(admin_notes) <= 8000),
  -- Derived by trigger from event_date/start_time/end_time in the business time zone.
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Calendar occupancy (incl. buffer). Only set for confirmed bookings of calendar-blocking services.
  occupied tstzrange,
  consent_at timestamptz not null,
  status_changed_at timestamptz not null default now(),
  confirmed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_window_valid check (ends_at > starts_at and ends_at - starts_at <= interval '24 hours'),
  constraint bookings_end_requires_start check (end_time is null or start_time is not null),
  -- Hard guarantee: no two confirmed bookings may overlap, even under concurrent transactions.
  constraint bookings_no_overlap exclude using gist (occupied with &&)
    where (status = 'confirmed' and occupied is not null)
);
create index bookings_status_date_idx on public.bookings (status, event_date);
create index bookings_event_date_idx on public.bookings (event_date);
create index bookings_created_idx on public.bookings (created_at desc);
create index bookings_email_idx on public.bookings (lower(email), created_at desc);
create index bookings_phone_idx on public.bookings (phone, created_at desc);
create index bookings_service_idx on public.bookings (service_id);
-- One open request per customer per service/slot (blocks double-submits, also under races).
create unique index bookings_pending_dedupe_idx
  on public.bookings (lower(email), service_id, event_date, coalesce(start_time, '00:00'::time))
  where status = 'pending';

create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  event_type text not null check (event_type in ('created', 'status_changed', 'updated')),
  from_status public.booking_status,
  to_status public.booking_status,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index booking_events_created_idx on public.booking_events (created_at desc);
create index booking_events_booking_idx on public.booking_events (booking_id);

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  reason text check (char_length(reason) <= 200),
  -- Derived by trigger in the business time zone.
  blocked tstzrange not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocks_dates_ordered check (end_date >= start_date and end_date - start_date <= 366),
  constraint blocks_times_paired check ((start_time is null) = (end_time is null)),
  -- A time range applies to a single date; use whole-day blocks for multi-day closures.
  constraint blocks_time_range_single_day check (
    start_time is null or (start_date = end_date and end_time > start_time)
  )
);
create index availability_blocks_range_idx on public.availability_blocks using gist (blocked);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  message text not null check (char_length(message) between 10 and 4000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

-- The singleton settings row always exists.
insert into public.business_settings (id) values (1);
