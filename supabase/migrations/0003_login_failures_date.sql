-- Date du dernier essai, pour effacer les compteurs oubliés (adresses inventées) au bout d'un jour.
alter table login_failures add column if not exists updated_at timestamptz not null default now();
