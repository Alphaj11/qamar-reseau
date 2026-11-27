-- Qamar Réseaux — protections partagées entre tous les serveurs
-- Jusqu'ici gardées dans la mémoire du serveur : un redémarrage les effaçait, et avec plusieurs serveurs
-- chacun avait ses propres compteurs. En base, elles tiennent quel que soit l'hébergement.

-- ——— Limite d'essais (connexion, inscription, découverte) : un essai = une ligne ———
create table rate_hits (
  key text        not null,             -- ex. "login:203.0.113.7"
  at  timestamptz not null default now()
);
create index rate_hits_key_idx on rate_hits (key, at);

-- ——— Blocage d'un compte après 5 codes faux de suite ———
create table login_failures (
  email        text primary key,         -- en minuscules
  count        int  not null default 0,
  locked_until timestamptz
);

-- ——— Liens de téléchargement des exports (2 minutes, une seule fois) ———
create table download_tokens (
  token      text primary key,
  session    text not null references sessions(token) on delete cascade,
  expires_at timestamptz not null
);

alter table rate_hits       enable row level security;
alter table login_failures  enable row level security;
alter table download_tokens enable row level security;
