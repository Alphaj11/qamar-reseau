# Publier l'appli sur l'App Store

L'appli commerçant (`mobile`) parle au serveur (`web`). **Le serveur doit être en ligne en https avant d'envoyer l'appli à Apple** : l'équipe de validation se connecte et teste vraiment la caisse.

## 0. Ce qui est déjà prêt dans le code

- Identifiant `com.qamar.reseaux`, version 1.0.0, build 1 (incrémenté automatiquement par EAS).
- iPhone uniquement pour la v1 (pas de captures iPad à fournir).
- Déclaration « pas de chiffrement spécial » (`ITSAppUsesNonExemptEncryption = false`) : plus de question à chaque envoi.
- Textes des autorisations en français : appareil photo (scanner), photos (logo), position (boutique).
- Suppression du compte dans l'appli (exigée par Apple), pages `/confidentialite` et `/aide`.
- Aucun prix ni lien de paiement dans l'appli iOS (règle 3.1.1) : l'abonnement se règle sur le site.
- `mobile/eas.json` : profils `development`, `preview`, `production`.

## 1. Mettre le serveur en ligne (bloquant)

- **Attention** : tant que Supabase n'est pas branché, les données sont dans un fichier (`web/.data/dev-db.json`). Un hébergeur « serverless » comme Vercel efface ce fichier. Deux choix :
  - **Rapide pour ce week-end** : un hébergeur avec disque persistant (Railway, Render avec disque, ou un petit VPS) : `npm run build` puis `npm start`.
  - **Propre** : brancher Supabase d'abord (je peux le faire dès que le projet Supabase existe).
- Variables à mettre chez l'hébergeur : celles de `web/.env.example` (Stripe en mode live, `CRON_SECRET`, `CONTACT_EMAIL`, certificats Apple Wallet, compte de service Google Wallet).
- Vérifier : `https://TON-DOMAINE/api/health` répond `{"ok":true}`.
- La phrase « données hébergées dans l'Union européenne » de `/confidentialite` suppose un hébergeur et un Supabase en région UE : choisis-les ainsi (ou corrige la phrase).

## 2. Brancher l'appli sur ce serveur

Dans `mobile/eas.json`, remplacer les deux `https://REMPLACER-PAR-VOTRE-DOMAINE` par l'adresse du serveur.

## 3. Construire et envoyer (depuis `mobile`)

```
npx eas-cli@latest login
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest submit -p ios --latest
```

La première fois, EAS demande de se connecter au compte Apple Developer et crée lui-même les certificats : tu tapes toi-même tes identifiants et le code à 2 facteurs.

## 4. Fiche App Store Connect

- **Nom** : Qamar Réseaux · **Sous-titre** : Carte de fidélité Wallet
- **Catégorie** : Économie et entreprise (secondaire : Productivité)
- **Mots-clés** : fidélité,carte,tampon,commerce,caisse,wallet,boulangerie,restaurant,coiffeur,client
- **Description** :
  > Qamar Réseaux remplace la carte de fidélité en carton par une carte dans Apple Wallet et Google Wallet.
  > Vos clients scannent votre QR code, ajoutent la carte en deux gestes, sans application à installer.
  > En caisse, scannez la carte : le tampon s'ajoute et la carte du client se met à jour toute seule. Ça marche même sans réseau.
  > Créez une carte à votre image dans le studio : modèles par métier (boulangerie, café, coiffeur, pizzeria…), logo, couleurs, pictogrammes.
  > Suivez vos visites, vos nouveaux clients et les récompenses, envoyez un message à vos clients et faites revenir ceux qui ne passent plus.
  > Réservé aux commerçants abonnés à Qamar Réseaux.
- **URL d'assistance** : `https://TON-DOMAINE/aide` · **Confidentialité** : `https://TON-DOMAINE/confidentialite`
- **Confidentialité de l'app** (questionnaire) : coordonnées (nom, e-mail) et contenu utilisateur, liés à l'utilisateur, utilisés pour le fonctionnement de l'app ; pas de suivi ; pas de publicité.
- **Captures** : iPhone 6,9" (1320 × 2868) au minimum : Accueil, Scanner, Studio de carte, Analyse, une carte dans le Wallet.
- **Mode démo** : le bouton « Découvrir l'appli » de l'écran de connexion ouvre une boulangerie fictive en lecture seule. Le signaler dans la note à Apple : le testeur peut tout voir sans compte.
- **Infos pour la validation** : créer un commerce de démonstration avec un abonnement actif et donner à Apple l'e-mail et le PIN du responsable. Ajouter une note : « Application professionnelle réservée aux commerçants abonnés. L'abonnement est souscrit sur notre site ; l'app ne vend rien. Pour tester le scanner, ouvrez la carte de démonstration sur https://TON-DOMAINE/carte/… ».

## 5. Délai

La validation Apple prend en général 24 à 48 h. Un refus courant pour ce type d'appli : compte de démo qui ne marche pas, ou serveur hors ligne pendant la validation.
