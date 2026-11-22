-- Qamar Réseaux — schéma de la base (Supabase / Postgres)
-- Miroir exact des types de web/src/lib/types.ts. Le serveur Next.js est le seul à lire et écrire :
-- il se connecte directement à Postgres (DATABASE_URL). Aucune table n'est ouverte aux clés publiques
-- de Supabase : la RLS est activée partout, sans règle d'accès (tout est refusé par défaut).
--
-- Les identifiants sont des textes : ceux de la démo sont lisibles ("merchant-demo"),
-- les autres sont des UUID générés par le serveur.

-- ——— Commerces (clients payants du SaaS) ———
create table merchants (
  id                     text primary key,
  name                   text not null,
  created_at             timestamptz not null default now(),
  demo                   boolean not null default false,       -- boutique « Découvrir l'appli », lecture seule
  demo_refreshed_at      timestamptz,
  -- Abonnement Stripe
  sub_status             text not null default 'pending'
                         check (sub_status in ('pending', 'trialing', 'active', 'past_due', 'canceled')),
  sub_plan               text check (sub_plan in ('monthly', 'yearly')),
  sub_trial_end          timestamptz,
  sub_current_period_end timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  sub_updated_at         timestamptz not null default now()
);

-- ——— Programme de fidélité = la carte personnalisée ———
create table programs (
  id              text primary key,
  merchant_id     text not null references merchants(id) on delete cascade,
  slug            text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),   -- URL d'inscription : /c/<slug>
  type            text not null check (type in ('stamps', 'points')),
  name            text not null check (char_length(name) between 1 and 40),
  merchant_name   text not null check (char_length(merchant_name) between 1 and 40),
  reward_label    text not null check (char_length(reward_label) between 1 and 60),
  stamps_required int  not null check (stamps_required between 3 and 20),
  points_required int  not null check (points_required between 10 and 100000),
  points_per_euro double precision not null check (points_per_euro between 0.1 and 100),
  welcome_bonus   int  not null default 0 check (welcome_bonus between 0 and 1000),
  -- Apparence
  bg_color        text not null check (bg_color ~ '^#[0-9a-fA-F]{6}$'),
  fg_color        text not null check (fg_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color    text not null check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  label_color     text check (label_color ~ '^#[0-9a-fA-F]{6}$'),
  logo_url        text,
  logo            text check (logo like 'data:image/png;base64,%'),
  banner          text check (banner like 'data:image/jpeg;base64,%'),
  stamp_icon      text not null,
  template        text,
  pattern         boolean,
  terms           text check (char_length(terms) <= 500),
  -- Boutiques (max 10) : [{ latitude, longitude, relevantText }]
  locations       jsonb check (locations is null or (jsonb_typeof(locations) = 'array' and jsonb_array_length(locations) <= 10)),
  average_basket  double precision check (average_basket between 0 and 10000),
  customized_at   timestamptz,
  -- Options (relance, avis Google, anniversaire) : petits objets de réglages
  winback         jsonb,
  review          jsonb,
  birthday        jsonb
);
create index programs_merchant_idx on programs (merchant_id);

-- ——— Client final (pas de compte : identifié par sa carte) ———
create table customers (
  id                   text primary key,
  merchant_id          text not null references merchants(id) on delete cascade,
  first_name           text not null,
  email                text,
  phone                text,
  marketing_consent    boolean not null default false,
  marketing_consent_at timestamptz,
  birthday             text check (birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),  -- "MM-JJ", sans l'année
  created_at           timestamptz not null default now()
  -- L'inscription exige un e-mail ou un téléphone ; les clients fictifs de la démo n'en ont pas.
);
create index customers_merchant_idx on customers (merchant_id);

-- ——— Carte du client (une par programme) ———
create table cards (
  id                text primary key,
  program_id        text not null references programs(id) on delete cascade,
  customer_id       text not null references customers(id) on delete cascade,
  serial            text not null unique,                 -- numéro encodé dans le QR, scanné en caisse
  auth_token        text not null,                        -- jeton du service web Apple
  stamps            int  not null default 0 check (stamps >= 0),
  points            int  not null default 0 check (points >= 0),
  rewards_available int  not null default 0 check (rewards_available >= 0),
  rewards_redeemed  int  not null default 0 check (rewards_redeemed >= 0),
  last_message      text,
  review_asked_at   timestamptz,
  birthday_year     int,
  google_object_id  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (program_id, customer_id)
);
create index cards_program_idx on cards (program_id);

-- ——— Équipe : patron et vendeurs (connexion e-mail + code) ———
create table staff (
  id          text primary key,
  merchant_id text not null references merchants(id) on delete cascade,
  role        text not null check (role in ('owner', 'staff')),
  name        text not null,
  email       text not null,
  pin_hash    text not null                               -- scrypt, format "sel:hash"
);
create unique index staff_email_idx on staff (lower(email));

create table sessions (
  token      text primary key,
  staff_id   text not null references staff(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index sessions_staff_idx on sessions (staff_id);

-- ——— Passages en caisse ———
-- staff_id n'a pas de clé étrangère : l'historique garde la trace d'un vendeur retiré de l'équipe.
create table transactions (
  id           text primary key,
  card_id      text not null references cards(id) on delete cascade,
  staff_id     text not null,
  kind         text not null check (kind in ('stamp', 'points', 'reward')),
  amount       int  not null check (amount between 1 and 10000),
  client_op_id text not null unique,                       -- généré par l'appli : anti-doublon hors ligne
  occurred_at  timestamptz not null,                       -- heure du passage sur le téléphone
  created_at   timestamptz not null default now()
);
create index transactions_card_idx on transactions (card_id, occurred_at desc);

-- ——— Messages aux clients ———
create table campaigns (
  id         text primary key,
  program_id text not null references programs(id) on delete cascade,
  message    text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  recipients int  not null default 0,
  card_ids   text[]                                         -- pour mesurer les retours après le message
);
create index campaigns_program_idx on campaigns (program_id, created_at desc);

-- ——— Téléphones Apple ayant ajouté une carte (service web PassKit) ———
create table apple_registrations (
  device_library_id text not null,
  push_token        text not null,
  serial            text not null references cards(serial) on delete cascade on update cascade,
  created_at        timestamptz not null default now(),
  primary key (device_library_id, serial)
);

-- ——— Relances des clients absents (une par carte et par absence) ———
create table winbacks (
  id         text primary key,
  program_id text not null references programs(id) on delete cascade,
  card_id    text not null references cards(id) on delete cascade,
  sent_at    timestamptz not null
);
create index winbacks_card_idx on winbacks (card_id);

-- ——— Sécurité ———
-- RLS activée sans aucune règle : les clés publiques de Supabase (anon, authenticated) ne voient rien.
-- Seul le serveur, connecté avec le rôle propriétaire de la base, lit et écrit.
alter table merchants           enable row level security;
alter table programs            enable row level security;
alter table customers           enable row level security;
alter table cards               enable row level security;
alter table staff               enable row level security;
alter table sessions            enable row level security;
alter table transactions        enable row level security;
alter table campaigns           enable row level security;
alter table apple_registrations enable row level security;
alter table winbacks            enable row level security;
