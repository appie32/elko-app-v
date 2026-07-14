create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role text not null default 'medewerker',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  email text,
  street text,
  house_number text,
  postal_code text,
  city text not null,
  source text,
  general_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  project_name text not null,
  project_address text,
  postal_code text,
  city text not null,
  request_date date,
  measurement_date date,
  status text not null default 'Nieuwe aanvraag',
  internal_note text,
  customer_note text,
  quote_status text not null default 'Nog niet gemaakt',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  sort_order integer not null default 1,
  room text not null,
  product_type text not null,
  quantity integer not null default 1,
  width_mm integer,
  height_mm integer,
  color_category text,
  standard_color text,
  ral_code text,
  mesh_type text,
  profile_color text,
  bottom_profile text,
  corner_profiles text,
  cover_caps text,
  mounting_method text,
  execution_description text,
  attention_points text,
  internal_note text,
  customer_note text,
  suggested_price numeric(10,2),
  manual_price numeric(10,2) not null default 0,
  subtotal numeric(10,2) generated always as (quantity * manual_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  product_line_id uuid references product_lines(id) on delete set null,
  file_url text not null,
  file_name text,
  description text,
  photo_type text,
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  quote_number text not null unique,
  quote_date date not null default current_date,
  customer_snapshot jsonb,
  project_snapshot jsonb,
  product_lines_snapshot jsonb,
  total_amount numeric(10,2) not null default 0,
  intro_text text,
  body_text text,
  payment_text text,
  approval_text text,
  closing_text text,
  full_quote_text text not null,
  status text not null default 'Concept',
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_rules (
  id uuid primary key default gen_random_uuid(),
  product_type text not null,
  color_category text,
  mesh_type text,
  suggested_price numeric(10,2) not null,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);

create or replace view project_totals as
select
  p.id as project_id,
  coalesce(sum(pl.subtotal), 0)::numeric(10,2) as total_amount
from projects p
left join product_lines pl on pl.project_id = p.id
group by p.id;

alter table profiles enable row level security;
alter table customers enable row level security;
alter table projects enable row level security;
alter table product_lines enable row level security;
alter table photos enable row level security;
alter table quotes enable row level security;
alter table price_rules enable row level security;

-- Eerste eenvoudige policies voor intern prototype.
-- Later strakker maken per rol.
create policy "authenticated read profiles" on profiles for select to authenticated using (true);
create policy "authenticated manage customers" on customers for all to authenticated using (true) with check (true);
create policy "authenticated manage projects" on projects for all to authenticated using (true) with check (true);
create policy "authenticated manage product_lines" on product_lines for all to authenticated using (true) with check (true);
create policy "authenticated manage photos" on photos for all to authenticated using (true) with check (true);
create policy "authenticated manage quotes" on quotes for all to authenticated using (true) with check (true);
create policy "authenticated read price_rules" on price_rules for select to authenticated using (true);


create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  title text not null,
  appointment_type text not null default 'Inmeting',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text,
  status text not null default 'Gepland',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'ELKO Solutions',
  trade_name text default 'Fly Horren / ELKO Solutions',
  contact_name text default 'Alexa',
  phone text,
  email text,
  website text default 'elkosolutions.nl',
  address_line text,
  postal_code text,
  city text,
  kvk_number text,
  vat_number text,
  iban text,
  logo_url text,
  quote_prefix text not null default 'ELKO',
  quote_payment_text text not null default 'Een aanbetaling is niet nodig. De volledige betaling mag na montage worden voldaan, zodra alles netjes geplaatst is en jullie tevreden zijn.',
  quote_approval_text text not null default 'Als bovenstaande gegevens kloppen en jullie hiermee akkoord zijn, ontvangen wij graag jullie bevestiging. Daarna zetten wij de bestelling definitief door en nemen wij contact met jullie op zodra de montage ingepland kan worden.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table appointments enable row level security;
alter table business_settings enable row level security;

create policy "authenticated manage appointments" on appointments for all to authenticated using (true) with check (true);
create policy "authenticated manage business_settings" on business_settings for all to authenticated using (true) with check (true);
