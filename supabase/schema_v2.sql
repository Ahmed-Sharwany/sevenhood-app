-- Sevenhood — Schema V2
-- Run this in your Supabase SQL Editor (new query)

-- ─── CITIES ──────────────────────────────────────────────────────────────────
create table if not exists cities (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  country     text default 'Saudi Arabia',
  created_at  timestamptz default now()
);
alter table cities disable row level security;

-- ─── ACCOUNTS (roles) ────────────────────────────────────────────────────────
create table if not exists accounts (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null unique,
  full_name    text not null,
  role         text not null default 'project_owner'
                 check (role in ('super_admin','project_owner','service_provider')),
  company_name text,
  phone        text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);
alter table accounts disable row level security;

-- ─── SERVICE PROVIDERS ───────────────────────────────────────────────────────
create table if not exists service_providers (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  services            text[] not null default '{}',
  city_id             uuid references cities(id) on delete set null,
  coverage_area       text,
  lat                 numeric,
  lng                 numeric,
  working_hours_start text,
  working_hours_end   text,
  logo_url            text,
  description         text,
  contact_phone       text,
  contact_email       text,
  rating              numeric default 0,
  total_jobs          int default 0,
  response_time_hrs   numeric,
  is_active           boolean default true,
  created_at          timestamptz default now()
);
alter table service_providers disable row level security;

-- ─── AI DESIGN REQUESTS ──────────────────────────────────────────────────────
create table if not exists ai_design_requests (
  id                    uuid primary key default uuid_generate_v4(),
  resident_id           uuid references residents(id) on delete set null,
  unit_id               uuid references units(id) on delete set null,
  room_type             text,
  style                 text,
  original_image_url    text,
  generated_image_url   text,
  status                text default 'pending'
                          check (status in ('pending','processing','completed','failed')),
  service_provider_id   uuid references service_providers(id) on delete set null,
  execution_requested   boolean default false,
  notes                 text,
  created_at            timestamptz default now()
);
alter table ai_design_requests disable row level security;

-- ─── UPDATE EXISTING TABLES ──────────────────────────────────────────────────

-- Projects
alter table projects add column if not exists city_id          uuid references cities(id);
alter table projects add column if not exists owner_name       text;
alter table projects add column if not exists owner_company    text;
alter table projects add column if not exists lat              numeric;
alter table projects add column if not exists lng              numeric;
alter table projects add column if not exists amenities        text[] default '{}';
alter table projects add column if not exists image_url        text;
alter table projects add column if not exists contract_start   date;
alter table projects add column if not exists contract_end     date;
alter table projects add column if not exists monthly_fee      numeric default 0;
alter table projects add column if not exists status           text default 'active'
                                               check (status in ('active','inactive','pending'));
alter table projects add column if not exists total_units      int default 0;

-- Buildings
alter table buildings add column if not exists image_url       text;
alter table buildings add column if not exists units_count     int default 0;
alter table buildings add column if not exists city_id         uuid references cities(id);
alter table buildings add column if not exists description     text;

-- Units
alter table units add column if not exists living_rooms   int default 1;
alter table units add column if not exists has_kitchen    boolean default true;
alter table units add column if not exists description    text;
alter table units add column if not exists project_id     uuid references projects(id);

-- Maintenance tickets
alter table maintenance_tickets add column if not exists service_provider_id uuid references service_providers(id);
alter table maintenance_tickets add column if not exists building_id          uuid references buildings(id);
alter table maintenance_tickets add column if not exists project_id           uuid references projects(id);
alter table maintenance_tickets add column if not exists preferred_time       text;
alter table maintenance_tickets add column if not exists city_id              uuid references cities(id);

-- Visitor passes
alter table visitor_passes add column if not exists qr_code    text;
alter table visitor_passes add column if not exists entry_log  jsonb default '[]';
alter table visitor_passes add column if not exists is_recurring boolean default false;

-- ─── SEED CITIES ─────────────────────────────────────────────────────────────
insert into cities (name) values
  ('Riyadh'), ('Jeddah'), ('Dammam'), ('Khobar'), ('Mecca'),
  ('Medina'), ('Abha'), ('Tabuk'), ('Qassim'), ('Hail')
on conflict (name) do nothing;
