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

## Audit du 27/11/2026 : parcours, pages légales, failles

Tests automatiques : `web/scripts/securite.mjs` (lancé par la CI après les tests de bout en bout, 20 contrôles).

| Point | État | Détail |
|---|---|---|
| Parcours paiement → accès | ✅ Vérifié | Compte en attente : connexion possible, caisse et inscription client bloquées (402). Webhook Stripe signé → accès ouvert ; résiliation → accès coupé (tests e2e). |
| Accueil public | ✅ Corrigé | Ne liste plus aucun commerce en production. |
| Clés d'API | ✅ OK | Aucune clé dans le dépôt ni dans l'appli mobile ; toutes côté serveur (Render). `RESEND_API_KEY` ajoutée au même endroit. |
| XSS | ✅ Testé | React échappe tout texte ; aucun `dangerouslySetInnerHTML` ; logos et bannières réencodés en PNG/JPEG par le serveur. Ajout d'une politique CSP (scripts du site seulement, formulaires vers le site ou Stripe, pas d'iframe). |
| CORS | ✅ Fermé | En production, plus d'`Access-Control-Allow-Origin: *` sur l'API (variable `CORS_ORIGINS` si besoin). |
| Adresse IP falsifiable | ✅ Corrigé | Les limites d'essais lisaient la 1re adresse de X-Forwarded-For, que le visiteur peut inventer. Maintenant : CF-Connecting-IP, sinon la liste lue depuis la fin (`TRUSTED_PROXY_HOPS`). |
| Routes du responsable | ✅ Testé | 17 routes refusées à un vendeur ; logo et bannière vérifient le rôle avant de lire l'image. Un commerce ne voit ni ne modifie les clients d'un autre. |
| Base de données | ✅ Renforcé | RLS sur toutes les tables (testé) ; migration 0004 retire tous les droits des rôles publics Supabase (`anon`, `authenticated`). Requêtes toujours paramétrées (injections testées). |
| Code oublié | ✅ Ajouté | Lien par e-mail valable 30 min, une seule fois, stocké en empreinte SHA-256 ; nouvelle demande = anciens liens annulés ; nouveau code = toutes les sessions coupées ; même réponse que le compte existe ou non. Nécessite Resend (`RESEND_API_KEY`, `MAIL_FROM`). |
| Cookies | ✅ Aucun | Le site ne dépose aucun cookie (testé) : pas de bandeau nécessaire. À revoir si un outil de mesure d'audience est ajouté. |
| Pages légales | ⚠️ À compléter | Mentions légales, CGV, conditions d'utilisation, confidentialité rédigées ; infos société via les variables `LEGAL_*` ; relecture par un juriste conseillée. |
| Dépendances | ✅ Corrigé | `npm audit` : 0 faille (joi et uuid forcés en versions corrigées) ; contrôle ajouté à la CI. |

## À faire par toi (dans les tableaux de bord)

1. **Stripe** › Developers › Webhooks : créer l'adresse de production `https://TON-DOMAINE/api/stripe/webhook` avec les évènements `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, puis copier le `whsec_…` dans les variables de l'hébergeur.
2. **CRON_SECRET** : mettre une longue valeur aléatoire chez l'hébergeur et programmer l'appel quotidien de `/api/cron/daily`.
3. **Supabase** (au branchement) : Advisors › Security Advisor sans rouge ; Database › Backups activé.
4. **Surveillance** : créer un moniteur gratuit (UptimeRobot ou Better Stack) sur `https://TON-DOMAINE/api/health` toutes les 5 minutes, alerte par e-mail. Pour le détail des plantages : créer un compte Sentry et me donner le DSN, je l'intègre (web + mobile).
5. **Hébergement à plusieurs serveurs** : fait. Avec Postgres, la limite d'essais, le blocage après 5 codes faux et les liens d'export sont en base (`supabase/migrations/0002_securite.sql`) : ils tiennent après un redémarrage et sont partagés entre les serveurs. Sans base (fichier JSON), ils restent en mémoire.
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
