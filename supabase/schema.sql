-- Sevenhood — Supabase Schema
-- Run this in your Supabase SQL Editor

create extension if not exists "uuid-ossp";

-- ─── UNITS ───────────────────────────────────────────────────────────────────
create table units (
  id            uuid primary key default uuid_generate_v4(),
  unit_number   text not null unique,
  floor         int  not null,
  tower         text not null default 'Tower A',
  bedrooms      int  not null default 1,
  bathrooms     int  not null default 1,
  area_sqm      numeric,
  status        text not null default 'occupied'
                  check (status in ('occupied','vacant','reserved')),
  created_at    timestamptz default now()
);

-- ─── RESIDENTS ───────────────────────────────────────────────────────────────
create table residents (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  email         text unique,
  phone         text,
  unit_id       uuid references units(id) on delete set null,
  role          text default 'owner'
                  check (role in ('owner','tenant','family')),
  move_in_date  date,
  avatar_url    text,
  created_at    timestamptz default now()
);

-- ─── COMMUNITY POSTS ─────────────────────────────────────────────────────────
create table posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid references residents(id) on delete set null,
  author_name   text,
  content       text not null,
  likes         int default 0,
  comments      int default 0,
  is_operator   boolean default false,
  created_at    timestamptz default now()
);

-- ─── EVENTS ──────────────────────────────────────────────────────────────────
create table events (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  date          date not null,
  time          text,
  location      text,
  capacity      int,
  rsvp_count    int default 0,
  emoji         text default '🎉',
  created_at    timestamptz default now()
);

-- ─── MAINTENANCE TICKETS ─────────────────────────────────────────────────────
create table maintenance_tickets (
  id            uuid primary key default uuid_generate_v4(),
  unit_id       uuid references units(id) on delete set null,
  resident_id   uuid references residents(id) on delete set null,
  category      text not null,
  description   text not null,
  status        text default 'open'
                  check (status in ('open','in_progress','completed','cancelled')),
  priority      text default 'medium'
                  check (priority in ('low','medium','high')),
  assigned_to   text,
  eta           text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table ticket_updates (
  id            uuid primary key default uuid_generate_v4(),
  ticket_id     uuid references maintenance_tickets(id) on delete cascade,
  text          text not null,
  author        text not null,
  created_at    timestamptz default now()
);

-- ─── VISITOR PASSES ──────────────────────────────────────────────────────────
create table visitor_passes (
  id            uuid primary key default uuid_generate_v4(),
  unit_id       uuid references units(id) on delete set null,
  resident_id   uuid references residents(id) on delete set null,
  visitor_name  text not null,
  detail        text,
  pass_type     text default 'one-time'
                  check (pass_type in ('one-time','recurring','temporary')),
  status        text default 'pending'
                  check (status in ('active','pending','expired','cancelled')),
  valid_until   date,
  created_at    timestamptz default now()
);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
create table payments (
  id            uuid primary key default uuid_generate_v4(),
  unit_id       uuid references units(id) on delete set null,
  resident_id   uuid references residents(id) on delete set null,
  installment   text not null,
  amount        numeric not null,
  due_date      date not null,
  status        text default 'upcoming'
                  check (status in ('paid','upcoming','overdue')),
  paid_at       timestamptz,
  created_at    timestamptz default now()
);

-- ─── VENDORS ─────────────────────────────────────────────────────────────────
create table vendors (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text not null,
  rating        numeric default 5.0,
  reviews       int default 0,
  price_from    numeric,
  image_url     text,
  verified      boolean default false,
  tags          text[],
  created_at    timestamptz default now()
);

-- ─── WARRANTIES ──────────────────────────────────────────────────────────────
create table warranties (
  id            uuid primary key default uuid_generate_v4(),
  unit_id       uuid references units(id) on delete cascade,
  item          text not null,
  provider      text,
  start_date    date,
  end_date      date,
  created_at    timestamptz default now()
);

-- ─── SNAGS ───────────────────────────────────────────────────────────────────
create table snags (
  id            uuid primary key default uuid_generate_v4(),
  unit_id       uuid references units(id) on delete cascade,
  description   text not null,
  status        text default 'open'
                  check (status in ('open','pending','resolved')),
  photo_url     text,
  created_at    timestamptz default now()
);

-- ─── SEED DATA ───────────────────────────────────────────────────────────────
insert into units (unit_number, floor, tower, bedrooms, bathrooms, area_sqm, status) values
  ('12B', 12, 'Tower A', 3, 2, 185, 'occupied'),
  ('08A', 8,  'Tower A', 2, 2, 142, 'occupied'),
  ('15C', 15, 'Tower B', 4, 3, 240, 'occupied'),
  ('03D', 3,  'Tower B', 1, 1, 78,  'vacant'),
  ('20A', 20, 'Tower A', 3, 2, 190, 'reserved');

insert into residents (full_name, email, phone, unit_id, role, move_in_date) values
  ('Ahmed Al-Rashid',  'ahmed@example.com',  '+966501234567', (select id from units where unit_number='12B'), 'owner',  '2023-01-15'),
  ('Sara Al-Khalid',   'sara@example.com',   '+966502345678', (select id from units where unit_number='08A'), 'owner',  '2022-08-01'),
  ('Mohammed Nasser',  'mnasser@example.com','+966503456789', (select id from units where unit_number='15C'), 'tenant', '2024-03-10');

insert into maintenance_tickets (unit_id, resident_id, category, description, status, priority) values
  ((select id from units where unit_number='12B'),
   (select id from residents where email='ahmed@example.com'),
   'AC', 'AC unit not cooling properly in master bedroom', 'completed', 'high'),
  ((select id from units where unit_number='08A'),
   (select id from residents where email='sara@example.com'),
   'Plumbing', 'Kitchen tap dripping', 'in_progress', 'medium'),
  ((select id from units where unit_number='15C'),
   (select id from residents where email='mnasser@example.com'),
   'Electrical', 'Socket in living room not working', 'open', 'low');

insert into events (name, date, time, location, capacity, rsvp_count, emoji) values
  ('Summer Pool Party', '2026-06-15', '6:00 PM', 'Rooftop Pool', 80, 47, '🏊'),
  ('Community BBQ',     '2026-06-22', '5:00 PM', 'Garden Level',120, 63, '🔥'),
  ('Yoga Morning',      '2026-05-20', '7:00 AM', 'Gym Studio',   20, 12, '🧘');

insert into vendors (name, category, rating, reviews, price_from, verified, tags) values
  ('CleanPro',    'Cleaning',  4.9, 312, 150, true,  array['deep-clean','move-in']),
  ('FixIt Fast',  'Plumbing',  4.7, 198, 200, true,  array['emergency','pipes']),
  ('AirCool KSA', 'AC',        4.8, 445, 180, true,  array['maintenance','installation']);
