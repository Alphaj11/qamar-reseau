# Sécurité : audit des 10 erreurs courantes

Audit fait le 20/11/2026 sur `web` (Next.js 16) et `mobile` (Expo 58).

## Bilan

| # | Point | État | Ce qui a été fait / constaté |
|---|---|---|---|
| 1 | Clés secrètes dans le code | ✅ OK | Aucune clé secrète dans l'appli mobile (seulement `EXPO_PUBLIC_API_URL`). Les clés Stripe, Apple, Google restent côté serveur. `.env*` ignoré par git (sauf `.env.example`). |
| 2 | Tables Supabase ouvertes | ✅ OK | La RLS est activée sur toutes les tables, **sans aucune règle** : les clés publiques de Supabase (anon) ne voient rien. Seul le serveur, connecté directement à Postgres (`DATABASE_URL`), lit et écrit, et vérifie lui-même les droits patron / vendeur. Testé en local sur Postgres. |
| 3 | Premium avant paiement | ✅ OK | L'abonnement n'est activé que par le webhook Stripe signé (4 évènements gérés, test e2e « signature refusée »). |
| 4 | Sauvegardes | ⚠️ À faire | Voir « Sauvegardes et restauration » ci-dessous. |
| 5 | Dépenses API IA | — Non concerné | Aucune API d'IA appelée. |
| 6 | Mails en spam | — Non concerné pour l'instant | L'appli n'envoie pas d'e-mail. À revoir si on ajoute des e-mails (SPF, DKIM, DMARC). |
| 7 | Suppression du compte | ✅ Ajouté | Profil › Supprimer mon compte (taper « SUPPRIMER »). Patron : résiliation Stripe puis effacement de tout le commerce. Vendeur : son accès seulement. Route `DELETE /api/staff/account`. Exigé par Apple. |
| 8 | Page blanche en cas d'erreur | ✅ Ajouté | Web : `error.tsx`, `global-error.tsx`, `not-found.tsx`. Mobile : écran « Réessayer » (`ErrorBoundary` dans `src/app/_layout.tsx`). |
| 9 | Essais de mots de passe illimités | ✅ Renforcé | Blocage du compte après 5 PIN faux (existait). Ajouté : limite par adresse IP sur la connexion (20 / 15 min), l'inscription commerçant (5 / h) et l'inscription client (15 / 10 min). |
| 10 | Savoir quand l'appli plante | ⚠️ À brancher | Route `/api/health` ajoutée (200 si tout va bien, 503 sinon). Reste à brancher une surveillance (voir plus bas). |

Autres ajouts : en-têtes de sécurité HTTP (HSTS, anti-iframe, nosniff, Referrer-Policy, Permissions-Policy), en-tête `X-Powered-By` retiré, déconnexion qui coupe la session côté serveur.

## À faire par toi (dans les tableaux de bord)

1. **Stripe** › Developers › Webhooks : créer l'adresse de production `https://TON-DOMAINE/api/stripe/webhook` avec les évènements `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, puis copier le `whsec_…` dans les variables de l'hébergeur.
2. **CRON_SECRET** : mettre une longue valeur aléatoire chez l'hébergeur et programmer l'appel quotidien de `/api/cron/daily`.
3. **Supabase** (au branchement) : Advisors › Security Advisor sans rouge ; Database › Backups activé.
4. **Surveillance** : créer un moniteur gratuit (UptimeRobot ou Better Stack) sur `https://TON-DOMAINE/api/health` toutes les 5 minutes, alerte par e-mail. Pour le détail des plantages : créer un compte Sentry et me donner le DSN, je l'intègre (web + mobile).
5. **Hébergement à plusieurs serveurs** : la limite d'essais est gardée en mémoire. Si l'hébergeur lance plusieurs instances, la déplacer dans la base (je peux le faire au branchement de Supabase).
6. **Clé Stripe** : utiliser une clé restreinte (`rk_live_…`) limitée aux abonnements, si possible.

## Sauvegardes et restauration

Tant que la base de dev (`web/.data/dev-db.json`) est utilisée, il suffit de copier ce fichier. Une fois Supabase branché :

- **Automatique** : sauvegardes quotidiennes de Supabase (offre Pro), plus la restauration à un instant précis (PITR) si les données deviennent critiques.
- **Copie hors Supabase** (recommandé) : une fois par semaine,
  ```
  supabase db dump --db-url "$SUPABASE_DB_URL" -f sauvegarde.sql
  supabase db dump --db-url "$SUPABASE_DB_URL" --data-only -f donnees.sql
  ```
  et ranger les fichiers dans un stockage privé et chiffré (jamais dans le dépôt).
- **Restaurer** sur un projet Supabase vide :
  ```
  psql "$NOUVELLE_DB_URL" -f sauvegarde.sql
  psql "$NOUVELLE_DB_URL" -f donnees.sql
  ```
  puis changer `SUPABASE_URL` / les clés chez l'hébergeur et vérifier `/api/health`.
- **Tester une restauration une fois** sur un projet de test : une sauvegarde jamais restaurée n'est pas une sauvegarde.
