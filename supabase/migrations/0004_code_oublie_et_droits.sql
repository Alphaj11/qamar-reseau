-- Qamar Réseaux — « Code oublié » et fermeture de l'accès public à la base

-- ——— Liens de réinitialisation du code : 30 minutes, une seule fois ———
-- On ne garde que l'empreinte SHA-256 du lien : même une copie de la base ne permet pas de s'en servir.
create table pin_resets (
  token_hash text primary key,
  staff_id   text        not null references staff(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index pin_resets_staff_idx on pin_resets (staff_id);
alter table pin_resets enable row level security;

-- ——— Aucune table lisible par l'API publique de Supabase ———
-- Le serveur se connecte directement à Postgres ; l'API REST de Supabase (rôles anon et authenticated)
-- ne sert pas. La RLS la bloque déjà ; on retire en plus tous les droits, y compris pour les futures tables.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'revoke all on all sequences in schema public from anon, authenticated';
    execute 'revoke all on all functions in schema public from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on tables from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on sequences from anon, authenticated';
    execute 'alter default privileges in schema public revoke all on functions from anon, authenticated';
  end if;
end $$;
