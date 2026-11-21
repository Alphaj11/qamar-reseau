# Qamar Réseaux — cartes de fidélité Wallet (SaaS)

## Structure
- `web/` — Next.js : page d'inscription client, API (images de tampons, API caisse, plus tard cartes Apple/Google), futur back-office.
- `mobile/` — application commerçant (Expo / React Native, iPhone + Android) : connexion vendeur, scanner QR, tampons / points / récompenses, **mode hors ligne**.
- `supabase/migrations/` — schéma de la base de données (à appliquer quand le compte Supabase sera créé).

## Lancer en local
```bash
cd web && npm install && npm run dev        # serveur + pages client : http://localhost:3000
cd mobile && npm install && npm run web     # appli commerçant dans le navigateur : http://localhost:8081
```

### Tester l'appli commerçant sur un vrai téléphone
1. Installer **Expo Go** sur le téléphone (App Store / Play Store).
2. Dans `mobile/.env`, remplacer `localhost` par l'adresse IP de l'ordinateur (ex. `http://192.168.1.20:3000`), téléphone et PC sur le même Wi-Fi.
3. `cd mobile && npx expo start`, puis scanner le QR code affiché avec le téléphone.

Comptes de démo (données de test, code `1234`) :
- `cafe@demo.test` — patron du café (tous les onglets : Caisse, Clients, Messages, Stats, Réglages + éditeur de carte)
- `vendeur@demo.test` — vendeur du café (Caisse, Clients, Réglages du compte uniquement)
- `institut@demo.test` — patronne de l'institut (carte à points)

## Pages et API
- `/c/<slug>` — inscription client (ouverte via le QR du comptoir)
- `/carte/<id>` — carte du client + boutons Wallet (actifs au sprint 2)
- `/api/strip/<slug>?value=3&format=apple|google|preview` — image des tampons / points
- `/api/staff/login`, `/api/staff/snapshot`, `/api/staff/cards/<serial>`, `/api/staff/sync` — API de l'appli commerçant
- `/api/staff/customers?q=`, `/api/staff/customers/<serial>` — liste et fiche client (historique)
- `/api/staff/stats?days=7|30|90|365` — statistiques (patron)
- `/api/staff/program` (GET, PATCH) — réglages de la carte (patron) ; chaque modification met à jour les cartes des clients
- `/api/staff/campaigns` (GET, POST) — messages aux clients (patron, 3 par 24 h maximum)
- `/api/wallet/apple/<cardId>` — fichier `.pkpass` ; `/api/wallet/google/<cardId>` — lien « Ajouter à Google Wallet »
- `/api/passkit/v1/...` — service web Apple (enregistrement des iPhone, envoi des mises à jour)

## Cartes Wallet (Apple / Google)
Les identifiants se règlent dans `web/.env.local` (modèle : `web/.env.example`).
- **Apple** : `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, certificat + clé du Pass Type ID, certificat WWDR. `APPLE_PUSH_ENABLED=true` pour envoyer les mises à jour aux iPhone.
- **Google** : `GOOGLE_WALLET_ISSUER_ID` + compte de service JSON. `GOOGLE_WALLET_API_ENABLED=true` pour pousser les mises à jour et les messages.
- `PUBLIC_URL` doit être une adresse **https** joignable par les téléphones (obligatoire pour Apple).

Pour tester sans les vrais comptes : `cd web && bash scripts/dev-wallet-certs.sh` crée de faux certificats (les cartes sont générées mais un iPhone les refusera).

Test complet de l'API (serveur lancé) : `cd web && node scripts/e2e-api.mjs`.

## Mode hors ligne (appli commerçant)
- À la connexion, l'appli télécharge les programmes et toutes les cartes du commerce.
- Chaque passage reçoit un identifiant unique et part dans une file sur le téléphone ; la carte affichée se met à jour tout de suite.
- La file est envoyée au retour du réseau, au retour de l'appli au premier plan, et toutes les 30 s. Le serveur ignore les doublons.
- Logique testée : `cd mobile && npm test`.

## Données en développement
En attendant Supabase, les données sont dans `web/.data/dev-db.json` (ignoré par git).
Supprimer ce fichier remet les données de démo à zéro.

## Avancement
- [x] Sprint 1 : structure, schéma BDD, générateur de tampons, inscription client
- [x] Sprint 2 : cartes Apple Wallet / Google Wallet, mises à jour, push — code prêt, à brancher sur les vrais comptes
- [x] Sprint 3 : application commerçant (Expo), scanner, hors ligne
- [x] Sprint 4 : onglets Clients / Messages / Stats / Réglages, éditeur de carte, rôles patron / vendeur (squelette, design à faire)
- [x] Design Qamar (clair, orange #FC4F00, polices Geist) : appli et pages web, barre d'onglets à bulle glissante, caisse plein écran
- [x] Studio de carte : 29 modèles par métier, 30 pictogrammes, motif en filigrane, logo, couleurs, textes
- [x] Mode démo « Découvrir l'appli » : boulangerie fictive en lecture seule (`web/src/lib/showcase.ts`)
- [x] Sécurité : audit des 10 erreurs courantes, voir [SECURITE.md](SECURITE.md)
- [x] Préparation App Store : `mobile/eas.json`, pages /aide et /confidentialite, voir [PUBLICATION.md](PUBLICATION.md)
- [ ] Sprint 5 : hébergement https, Supabase, Stripe live, envoi à Apple (étapes dans PUBLICATION.md)
