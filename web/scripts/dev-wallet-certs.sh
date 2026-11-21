#!/usr/bin/env bash
# Crée de FAUX certificats Apple et un FAUX compte de service Google pour tester en local
# toute la chaîne Wallet (génération, service web, synchro) sans les vrais comptes.
# Les cartes produites ne s'installent PAS sur un iPhone : seuls les vrais certificats le permettent.
set -euo pipefail
# Git Bash (Windows) : empêche la conversion de "/CN=..." en chemin de fichier
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."
OUT=.data/certs
mkdir -p "$OUT"

# Fausse autorité "WWDR" + certificat "Pass Type ID" signé par elle
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=Fake WWDR (dev)" \
  -keyout "$OUT/wwdr.key" -out "$OUT/wwdr.pem" 2>/dev/null
openssl req -newkey rsa:2048 -nodes -subj "/CN=Pass Type ID: pass.dev.qamar.fidelite/OU=DEVTEAM0001" \
  -keyout "$OUT/signer.key" -out "$OUT/signer.csr" 2>/dev/null
openssl x509 -req -in "$OUT/signer.csr" -CA "$OUT/wwdr.pem" -CAkey "$OUT/wwdr.key" -CAcreateserial \
  -days 3650 -out "$OUT/signer.pem" 2>/dev/null

# Faux compte de service Google (clé RSA réelle, identifiants bidon)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$OUT/google.key" 2>/dev/null
node -e '
const fs = require("fs");
const key = fs.readFileSync(process.argv[1], "utf8");
fs.writeFileSync(process.argv[2], JSON.stringify({ type: "service_account", client_email: "dev@qamar-dev.iam.gserviceaccount.com", private_key: key }, null, 2));
' "$OUT/google.key" "$OUT/google-service-account.json"

if [ ! -f .env.local ]; then
cat > .env.local <<EOF
# Configuration Wallet de DÉVELOPPEMENT (faux certificats, aucun envoi réel)
PUBLIC_URL=http://localhost:3000
APPLE_PASS_TYPE_ID=pass.dev.qamar.fidelite
APPLE_TEAM_ID=DEVTEAM0001
APPLE_PASS_CERT=.data/certs/signer.pem
APPLE_PASS_KEY=.data/certs/signer.key
APPLE_WWDR_CERT=.data/certs/wwdr.pem
APPLE_PUSH_ENABLED=false
GOOGLE_WALLET_ISSUER_ID=3388000000000000000
GOOGLE_SERVICE_ACCOUNT=.data/certs/google-service-account.json
GOOGLE_WALLET_API_ENABLED=false
EOF
  echo ".env.local créé"
fi
echo "Faux certificats créés dans $OUT"
