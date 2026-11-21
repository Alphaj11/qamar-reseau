-- Fidélité Wallet — schéma initial (Supabase / Postgres)
-- Un commerçant (merchant) possède des boutiques et un ou plusieurs programmes.
-- Chaque client final possède une carte (card) par programme, stockée dans son Wallet.

create extension if not exists "pgcrypto";

create type program_type as enum ('stamps', 'points');
create type wallet_platform as enum ('apple', 'google');
create type transaction_kind as enum ('stamp', 'points', 'reward', 'adjust');

-- Commerçant = client payant du SaaS
create table merchants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  plan          text not null default 'trial',          -- trial | active | past_due | canceled
  stripe_customer_id text,
  created_at    timestamptz not null default now()
);

-- Membres de l'équipe (patron, vendeurs) qui utilisent l'appli commerçant
create table merchant_members (
  merchant_id uuid not null references merchants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'staff',           -- owner | manager | staff
  primary key (merchant_id, user_id)
);

-- Boutiques (jusqu'à 10 positions par carte Apple)
create table stores (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  name        text not null,
  address     text,
  latitude    double precision,
  longitude   double precision,
  relevant_text text,                                   -- texte écran verrouillé à proximité
  created_at  timestamptz not null default now()
);

-- Programme de fidélité = la carte personnalisée
create table programs (
  id              uuid primary key default gen_random_uuid(),
  merchant_id     uuid not null references merchants(id) on delete cascade,
  slug            text not null unique,                 -- URL d'inscription : /c/<slug>
  type            program_type not null default 'stamps',
  name            text not null,                        -- ex. "Carte café"
  reward_label    text not null,                        -- ex. "1 café offert"
  stamps_required int  not null default 10 check (stamps_required between 1 and 30),
  points_required int  not null default 100 check (points_required > 0),
  points_per_euro numeric(6,2) not null default 1,
  welcome_bonus   int  not null default 0,
  -- design
  bg_color        text not null default '#1f2937',
  fg_color        text not null default '#ffffff',
  accent_color    text not null default '#f59e0b',
  logo_url        text,
  stamp_icon      text not null default 'coffee',       -- coffee | star | heart | check | custom
  stamp_icon_url  text,
  terms           text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Client final (pas de compte : identifié par sa carte)
create table customers (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  first_name  text not null,
  email       text,
  phone       text,
  marketing_consent    boolean not null default false,
  marketing_consent_at timestamptz,
  created_at  timestamptz not null default now()
);

-- Carte du client (une par programme)
create table cards (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs(id) on delete cascade,
  customer_id   uuid not null references customers(id) on delete cascade,
  serial        text not null unique,                   -- numéro de série du pass, encodé dans le QR
  auth_token    text not null,                          -- token du web service Apple
  stamps        int  not null default 0,
  points        int  not null default 0,
  rewards_available int not null default 0,
  rewards_redeemed  int not null default 0,
  last_message  text,                                   -- dernier message push affiché au dos
  google_object_id text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (program_id, customer_id)
);

-- Appareils Apple enregistrés (web service PassKit)
create table apple_registrations (
  device_library_id text not null,
  push_token        text not null,
  card_id           uuid not null references cards(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (device_library_id, card_id)
);

-- Historique des passages en caisse
create table transactions (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid not null references cards(id) on delete cascade,
  store_id    uuid references stores(id) on delete set null,
  staff_user_id uuid references auth.users(id) on delete set null,
  kind        transaction_kind not null,
  amount      int not null,                             -- tampons ou points (+/-)
  client_op_id text unique,                             -- id généré par l'appli : anti-doublon en mode hors ligne
  created_at  timestamptz not null default now()
);

-- Campagnes de messages push
create table campaigns (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  message     text not null,
  scheduled_at timestamptz,
  sent_at     timestamptz,
  recipients  int not null default 0,
  created_at  timestamptz not null default now()
);

create index on cards (program_id);
create index on transactions (card_id, created_at desc);
create index on stores (merchant_id);

-- Sécurité : chaque membre ne voit que les données de son commerçant
alter table merchants enable row level security;
alter table merchant_members enable row level security;
alter table stores enable row level security;
alter table programs enable row level security;
alter table customers enable row level security;
alter table cards enable row level security;
alter table transactions enable row level security;
alter table campaigns enable row level security;
alter table apple_registrations enable row level security; -- accès serveur uniquement

create or replace function is_member(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from merchant_members where merchant_id = m and user_id = auth.uid());
$$;

create policy member_merchants on merchants for select using (is_member(id));
create policy member_self on merchant_members for select using (user_id = auth.uid());
create policy member_stores on stores for all using (is_member(merchant_id));
create policy member_programs on programs for all using (is_member(merchant_id));
create policy member_customers on customers for all using (is_member(merchant_id));
create policy member_cards on cards for all using (
  is_member((select merchant_id from programs p where p.id = program_id)));
create policy member_tx on transactions for all using (
  is_member((select p.merchant_id from cards c join programs p on p.id = c.program_id where c.id = card_id)));
create policy member_campaigns on campaigns for all using (
  is_member((select merchant_id from programs p where p.id = program_id)));
