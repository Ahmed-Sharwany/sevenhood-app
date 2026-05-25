-- ═══════════════════════════════════════════════════════════════════════════════
-- Sevenhood — Amenities & Booking System Schema
-- Run this in Supabase SQL Editor AFTER schema_v2.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── AMENITIES ───────────────────────────────────────────────────────────────
-- Each amenity belongs to a project (required) and optionally to a specific building.
-- category controls display icon/color in the UI.
-- requires_booking controls whether residents must book vs. open access.

create table if not exists amenities (
  id               uuid primary key default uuid_generate_v4(),
  project_id       uuid references projects(id)  on delete cascade,
  building_id      uuid references buildings(id) on delete set null,
  name             text not null,
  category         text not null default 'other'
                     check (category in (
                       'fitness','social','workspace','entertainment',
                       'outdoor','sports','other'
                     )),
  description      text,
  image_url        text,
  requires_booking boolean      default false,
  is_active        boolean      default true,
  created_at       timestamptz  default now()
);
alter table amenities disable row level security;

-- ─── AMENITY BOOKING RULES ───────────────────────────────────────────────────
-- One row per bookable amenity (1:1 via unique constraint on amenity_id).
-- Governs every aspect of how bookings work for that amenity.
--
-- Key fields:
--   capacity                    – max SIMULTANEOUS approved bookings (not people)
--   allowed_durations           – array of permitted slot lengths in minutes
--   operating_hours_start/end   – daily window during which bookings are allowed
--   operating_days              – 1=Mon … 7=Sun; e.g. '{1,2,3,4,5}' = weekdays only
--   buffer_time_mins            – gap enforced between consecutive bookings
--   max_bookings_per_user_per_day/week – resident throttle
--   auto_approve                – true = instant approval; false = admin must approve
--   advance_booking_days        – how many days ahead a resident can book
--   cancellation_hours          – resident must cancel at least N hours before start

create table if not exists amenity_booking_rules (
  id                             uuid primary key default uuid_generate_v4(),
  amenity_id                     uuid references amenities(id) on delete cascade unique not null,
  capacity                       int          default 1    check (capacity >= 1),
  allowed_durations              int[]        default '{30,60,90,120}',
  operating_hours_start          time         default '06:00',
  operating_hours_end            time         default '23:00',
  operating_days                 int[]        default '{1,2,3,4,5,6,7}',
  buffer_time_mins               int          default 0    check (buffer_time_mins >= 0),
  max_bookings_per_user_per_day  int          default 1    check (max_bookings_per_user_per_day >= 1),
  max_bookings_per_user_per_week int          default 3    check (max_bookings_per_user_per_week >= 1),
  auto_approve                   boolean      default true,
  advance_booking_days           int          default 14   check (advance_booking_days >= 1),
  cancellation_hours             int          default 2    check (cancellation_hours >= 0),
  created_at                     timestamptz  default now()
);
alter table amenity_booking_rules disable row level security;

-- ─── AMENITY BOOKINGS ────────────────────────────────────────────────────────
-- One row per booking request.
-- Overlap / conflict detection is enforced by the application layer
-- (query: count approved bookings where booking_date = X and time ranges overlap
--  and amenity_id = Y; reject if >= capacity).

create table if not exists amenity_bookings (
  id               uuid primary key default uuid_generate_v4(),
  amenity_id       uuid references amenities(id)  on delete cascade,
  resident_id      uuid references residents(id)  on delete set null,
  unit_id          uuid references units(id)      on delete set null,
  booking_date     date         not null,
  start_time       time         not null,
  end_time         time         not null,
  duration_mins    int          not null check (duration_mins > 0),
  attendees_count  int          default 1 check (attendees_count >= 1),
  status           text         default 'pending'
                     check (status in ('pending','approved','rejected','completed','cancelled')),
  notes            text,
  rejection_reason text,
  created_at       timestamptz  default now()
);
alter table amenity_bookings disable row level security;

-- ─── HELPFUL INDEXES ─────────────────────────────────────────────────────────
-- Speed up the conflict-detection query (date + amenity + status lookup)
create index if not exists idx_amenity_bookings_lookup
  on amenity_bookings (amenity_id, booking_date, status);

-- Speed up per-resident throttle checks
create index if not exists idx_amenity_bookings_resident
  on amenity_bookings (resident_id, booking_date);
