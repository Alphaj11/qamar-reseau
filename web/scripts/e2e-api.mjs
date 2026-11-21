// Test de bout en bout de l'API (serveur lancé avec les faux certificats de dev-wallet-certs.sh).
//   node scripts/e2e-api.mjs [http://localhost:3000]
import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASS_TYPE = "pass.dev.qamar.fidelite";
let failures = 0;

async function step(name, fn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (e) {
    failures++;
    console.log(`✖ ${name}\n    ${e.message}`);
  }
}

const api = async (p, { token, method = "GET", body, headers = {} } = {}) => {
  const res = await fetch(BASE + p, {
    method,
    redirect: "manual",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
};
const login = async (email) => (await (await api("/api/staff/login", { method: "POST", body: { email, pin: "1234" } })).json()).token;

// Inscription d'un client de test (via la page publique) → on lit sa carte dans la base de dev
const db = () => JSON.parse(readFileSync(path.resolve(".data/dev-db.json"), "utf8"));

const owner = await login("cafe@demo.test");
const vendeur = await login("vendeur@demo.test");
let card = db().cards.find((c) => c.programId === "prog-cafe");
assert.ok(card, "il faut au moins une carte café (inscrire un client sur /c/cafe-demo)");
const auth = { Authorization: `ApplePass ${card.authToken}` };

await step("rôles : patron et vendeur se connectent", () => {
  assert.ok(owner && vendeur);
});

// ——— Apple Wallet ———
let tmp = mkdtempSync(path.join(tmpdir(), "pkpass-"));
await step("Apple : téléchargement d'une carte .pkpass signée", async () => {
  const res = await api(`/api/wallet/apple/${card.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), "application/vnd.apple.pkpass");
  const file = path.join(tmp, "card.pkpass");
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  const out = execFileSync("python", ["-c", `import zipfile,json,sys
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist()
p=json.loads(z.read("pass.json"))
print(json.dumps({"names":names,"serial":p["serialNumber"],"header":p["storeCard"]["headerFields"][0]["value"],"ws":p["webServiceURL"],"loc":len(p.get("locations",[]))}))`, file]);
  const info = JSON.parse(out.toString());
  for (const f of ["pass.json", "manifest.json", "signature", "icon.png", "logo.png", "strip@3x.png"]) {
    assert.ok(info.names.includes(f), `fichier manquant : ${f}`);
  }
  assert.equal(info.serial, card.serial);
  assert.match(info.header, /^\d+\/10$/);
  assert.equal(info.ws, `${BASE}/api/passkit`);
  assert.equal(info.loc, 1);
});

await step("Apple : enregistrement d'un iPhone (201 puis 200, 401 si mauvais jeton)", async () => {
  const url = `/api/passkit/v1/devices/DEVICE-TEST/registrations/${PASS_TYPE}/${card.serial}`;
  assert.equal((await api(url, { method: "POST", body: { pushToken: "tok-1" }, headers: auth })).status, 201);
  assert.equal((await api(url, { method: "POST", body: { pushToken: "tok-1" }, headers: auth })).status, 200);
  assert.equal(
    (await api(url, { method: "POST", body: { pushToken: "x" }, headers: { Authorization: "ApplePass faux" } })).status,
    401,
  );
});

let lastUpdated;
await step("Apple : liste des cartes de l'iPhone", async () => {
  const res = await api(`/api/passkit/v1/devices/DEVICE-TEST/registrations/${PASS_TYPE}`);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.ok(j.serialNumbers.includes(card.serial));
  lastUpdated = j.lastUpdated;
  const none = await api(`/api/passkit/v1/devices/DEVICE-TEST/registrations/${PASS_TYPE}?passesUpdatedSince=${encodeURIComponent(lastUpdated)}`);
  assert.equal(none.status, 204, "rien de neuf depuis lastUpdated");
});

await step("Apple : un tampon en caisse rend la carte « modifiée » pour l'iPhone", async () => {
  const res = await api("/api/staff/sync", {
    token: vendeur,
    method: "POST",
    body: { ops: [{ clientOpId: `e2e-${crypto.randomUUID()}`, serial: card.serial, kind: "stamp", amount: 1, occurredAt: new Date().toISOString() }] },
  });
  assert.equal((await res.json()).results[0].status, "applied");
  const again = await api(`/api/passkit/v1/devices/DEVICE-TEST/registrations/${PASS_TYPE}?passesUpdatedSince=${encodeURIComponent(lastUpdated)}`);
  assert.equal(again.status, 200);
  assert.deepEqual((await again.json()).serialNumbers, [card.serial]);
});

await step("Apple : l'iPhone récupère la nouvelle version (304 si inchangée)", async () => {
  const url = `/api/passkit/v1/passes/${PASS_TYPE}/${card.serial}`;
  const res = await api(url, { headers: auth });
  assert.equal(res.status, 200);
  const lm = res.headers.get("last-modified");
  assert.ok(lm);
  assert.equal((await api(url, { headers: { ...auth, "If-Modified-Since": lm } })).status, 304);
  assert.equal((await api(url, { headers: { Authorization: "ApplePass faux" } })).status, 401);
});

await step("Apple : désenregistrement", async () => {
  const url = `/api/passkit/v1/devices/DEVICE-TEST/registrations/${PASS_TYPE}/${card.serial}`;
  assert.equal((await api(url, { method: "DELETE", headers: auth })).status, 200);
  assert.equal((await api(`/api/passkit/v1/devices/DEVICE-TEST/registrations/${PASS_TYPE}`)).status, 404);
});

// ——— Google Wallet ———
await step("Google : lien « Ajouter à Google Wallet » avec JWT signé valide", async () => {
  const res = await api(`/api/wallet/google/${card.id}`);
  assert.equal(res.status, 302);
  const loc = res.headers.get("location");
  assert.ok(loc.startsWith("https://pay.google.com/gp/v/save/"));
  const [h, p, s] = loc.split("/save/")[1].split(".");
  const sa = JSON.parse(readFileSync(".data/certs/google-service-account.json", "utf8"));
  const ok = crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), crypto.createPublicKey(sa.private_key), Buffer.from(s, "base64url"));
  assert.ok(ok, "signature JWT invalide");
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  assert.equal(payload.typ, "savetowallet");
  const obj = payload.payload.loyaltyObjects[0];
  assert.equal(obj.barcode.value, card.serial);
  assert.equal(obj.classId, payload.payload.loyaltyClasses[0].id);
});

// ——— Fonctions patron ———
await step("Clients : liste, recherche et fiche avec historique", async () => {
  const list = await (await api("/api/staff/customers", { token: owner })).json();
  assert.ok(list.customers.length >= 1);
  const found = await (await api(`/api/staff/customers?q=${encodeURIComponent(list.customers[0].firstName)}`, { token: owner })).json();
  assert.ok(found.customers.length >= 1);
  const detail = await (await api(`/api/staff/customers/${card.serial}`, { token: owner })).json();
  assert.ok(detail.history.length >= 1);
  assert.ok(detail.history[0].by);
});

await step("Statistiques : réservées au patron", async () => {
  const s = await (await api("/api/staff/stats?days=30", { token: owner })).json();
  assert.ok(s.customers >= 1 && s.visits >= 1 && s.daily.length === 14);
  assert.equal((await api("/api/staff/stats", { token: vendeur })).status, 403);
});

await step("Réglages : lecture, modification, validation, droits", async () => {
  const before = (await (await api("/api/staff/program", { token: owner })).json()).settings;
  const res = await api("/api/staff/program", { token: owner, method: "PATCH", body: { rewardLabel: "1 café offert (test)" } });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).settings.rewardLabel, "1 café offert (test)");
  assert.equal((await api("/api/staff/program", { token: owner, method: "PATCH", body: { bgColor: "rouge" } })).status, 400);
  assert.equal((await api("/api/staff/program", { token: owner, method: "PATCH", body: { type: "points" } })).status, 422);
  assert.equal((await api("/api/staff/program", { token: vendeur, method: "PATCH", body: { rewardLabel: "x" } })).status, 403);
  await api("/api/staff/program", { token: owner, method: "PATCH", body: { rewardLabel: before.rewardLabel } });
});

await step("Messages : envoi, limite de 3 par 24 h, droits", async () => {
  assert.equal((await api("/api/staff/campaigns", { token: vendeur, method: "POST", body: { message: "Coucou" } })).status, 403);
  const statuses = [];
  for (let i = 0; i < 4; i++) {
    statuses.push((await api("/api/staff/campaigns", { token: owner, method: "POST", body: { message: `Offre test ${i}` } })).status);
  }
  // Selon les envois déjà faits aujourd'hui, la limite peut arriver plus tôt : au moins un refus attendu
  assert.ok(statuses.includes(422), `statuts : ${statuses}`);
  const list = await (await api("/api/staff/campaigns", { token: owner })).json();
  assert.ok(list.campaigns.length >= 1);
});

// ——— Accueil, analyse, compte ———

await step("Accueil, analyse et compte : données attendues", async () => {
  const home = await (await api("/api/staff/home", { token: vendeur })).json();
  assert.ok(typeof home.today.visits === "number" && Array.isArray(home.recent) && home.onboarding);
  const stats = await (await api("/api/staff/stats?days=30", { token: owner })).json();
  assert.equal(stats.byWeekday.length, 7);
  assert.equal(stats.byHour.length, 24);
  assert.ok("previous" in stats && "returningRate" in stats && Array.isArray(stats.campaigns));
  assert.equal((await api("/api/staff/stats", { token: vendeur })).status, 403);
  const account = await (await api("/api/staff/account", { token: owner })).json();
  assert.equal(account.subscription.active, true);
  assert.ok(account.enrollUrl.endsWith("/c/cafe-demo"));
  const qr = await api("/api/qr/cafe-demo");
  assert.equal(qr.headers.get("content-type"), "image/png");
});

await step("Export CSV des clients (patron uniquement)", async () => {
  const res = await api("/api/staff/export", { token: owner });
  assert.equal(res.status, 200);
  const bytes = Buffer.from(await res.arrayBuffer());
  // Marqueur UTF-8 en tête : Excel affiche correctement les accents
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  assert.ok(bytes.subarray(3).toString("utf8").startsWith("Prénom;E-mail"));
  assert.equal((await api("/api/staff/export", { token: vendeur })).status, 403);
});

await step("Équipe : ajout d'un vendeur, connexion, retrait (session coupée)", async () => {
  const email = `vendeur-${Date.now()}@demo.test`;
  const added = await api("/api/staff/team", { token: owner, method: "POST", body: { name: "Vendeur test", email, pin: "4321" } });
  assert.equal(added.status, 201);
  const { member } = await added.json();
  assert.equal((await api("/api/staff/team", { token: owner, method: "POST", body: { name: "Doublon", email, pin: "4321" } })).status, 422);
  const t = (await (await api("/api/staff/login", { method: "POST", body: { email, pin: "4321" } })).json()).token;
  assert.equal((await api("/api/staff/home", { token: t })).status, 200);
  assert.equal((await api(`/api/staff/team/${member.id}`, { token: vendeur, method: "DELETE" })).status, 403);
  assert.equal((await api(`/api/staff/team/${member.id}`, { token: owner, method: "DELETE" })).status, 200);
  assert.equal((await api("/api/staff/home", { token: t })).status, 401);
});

// ——— Relance des clients absents ———

await step("Relance : réglages, droits, envoi quotidien unique, retour mesuré", async () => {
  const cron = (secret) => fetch(`${BASE}/api/cron/daily`, { headers: secret ? { Authorization: `Bearer ${secret}` } : {} });
  const first = await (await api("/api/staff/winback", { token: owner })).json();
  assert.equal(typeof first.settings.enabled, "boolean");
  assert.equal((await api("/api/staff/winback", { token: vendeur })).status, 403);
  assert.equal((await api("/api/staff/winback", { token: owner, method: "PATCH", body: { days: 3 } })).status, 400);

  // Nettoyage d'un essai précédent interrompu
  {
    const d0 = db();
    const left = new Set(d0.cards.filter((c) => c.id.startsWith("wb-")).map((c) => c.id));
    d0.cards = d0.cards.filter((c) => !left.has(c.id));
    d0.customers = d0.customers.filter((c) => !c.id.startsWith("cust-wb-"));
    d0.transactions = d0.transactions.filter((t) => !left.has(t.cardId));
    d0.winbacks = (d0.winbacks ?? []).filter((w) => !left.has(w.cardId));
    writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d0, null, 2));
  }
  // Deux clients absents depuis 40 jours : l'un accepte les offres, l'autre non
  const old = new Date(Date.now() - 40 * 86400_000).toISOString();
  const stamp = Date.now();
  const ids = { yes: `wb-yes-${stamp}`, no: `wb-no-${stamp}` };
  {
    const d = db();
    const prog = d.programs.find((p) => p.slug === "cafe-demo");
    for (const [key, consent] of [["yes", true], ["no", false]]) {
      d.customers.push({ id: `cust-${ids[key]}`, merchantId: prog.merchantId, firstName: "Absent", marketingConsent: consent, createdAt: old });
      d.cards.push({
        id: ids[key], programId: prog.id, customerId: `cust-${ids[key]}`, serial: `WB${key.toUpperCase()}${stamp}`, authToken: "x",
        stamps: 1, points: 0, rewardsAvailable: 0, rewardsRedeemed: 0, createdAt: old, updatedAt: old,
      });
    }
    writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
  }

  const on = await (await api("/api/staff/winback", { token: owner, method: "PATCH", body: { enabled: true, days: 30, message: "On vous attend !" } })).json();
  assert.equal(on.settings.enabled, true);
  assert.ok(on.dueNow >= 1 && on.absentWithoutConsent >= 1);

  // Les 3 messages du test précédent bloquent la relance aujourd'hui (limite des téléphones)
  assert.equal((await cron("cron_dev_local_test")).status, 200);
  assert.equal(db().winbacks.filter((w) => w.cardId === ids.yes).length, 0);
  {
    const d2 = db();
    const yesterday = new Date(Date.now() - 2 * 86400_000).toISOString();
    for (const c of d2.campaigns) c.createdAt = c.createdAt > yesterday ? yesterday : c.createdAt;
    writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d2, null, 2));
  }

  assert.equal((await cron()).status, 401);
  assert.equal((await cron("mauvais")).status, 401);
  assert.equal((await cron("cron_dev_local_test")).status, 200);
  let d = db();
  assert.equal(d.winbacks.filter((w) => w.cardId === ids.yes).length, 1);
  assert.equal(d.winbacks.filter((w) => w.cardId === ids.no).length, 0, "sans consentement : jamais relancé");
  assert.equal(d.cards.find((c) => c.id === ids.yes).lastMessage, "On vous attend !");

  // Deuxième passage : pas de nouvelle relance tant que le client n'est pas revenu
  await cron("cron_dev_local_test");
  assert.equal(db().winbacks.filter((w) => w.cardId === ids.yes).length, 1);

  // Le client revient : le retour est compté
  d = db();
  d.transactions.push({
    id: `tx-${ids.yes}`, cardId: ids.yes, staffId: "staff-cafe", kind: "stamp", amount: 1,
    clientOpId: `op-${ids.yes}`, occurredAt: new Date().toISOString(), createdAt: new Date().toISOString(),
  });
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
  const after = await (await api("/api/staff/winback", { token: owner })).json();
  assert.ok(after.last90Days.returned >= 1);

  // Remise en état
  await api("/api/staff/winback", { token: owner, method: "PATCH", body: { enabled: false } });
  d = db();
  const gone = new Set(Object.values(ids));
  d.cards = d.cards.filter((c) => !gone.has(c.id));
  d.customers = d.customers.filter((c) => !gone.has(c.id.replace("cust-", "")));
  d.transactions = d.transactions.filter((t) => !gone.has(t.cardId));
  d.winbacks = d.winbacks.filter((w) => !gone.has(w.cardId));
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
});

// ——— Demande d'avis Google ———

await step("Avis Google : lien vérifié, invitation à la N-ième visite, une seule fois, avec consentement", async () => {
  const patch = (body, token = owner) => api("/api/staff/review", { token, method: "PATCH", body });
  const first = await (await api("/api/staff/review", { token: owner })).json();
  assert.equal(typeof first.settings.enabled, "boolean");
  assert.equal((await api("/api/staff/review", { token: vendeur })).status, 403);
  assert.equal((await patch({ url: "https://exemple-arnaque.com/avis" })).status, 400);
  assert.equal((await patch({ url: "http://g.page/r/abc/review" })).status, 400, "https obligatoire");
  assert.equal((await patch({ enabled: true, url: "" })).status, 400, "activation impossible sans lien");

  const stamp = Date.now();
  const ids = { yes: `rv-yes-${stamp}`, no: `rv-no-${stamp}` };
  const serial = (k) => `RV${k.toUpperCase()}${stamp}`;
  {
    const d = db();
    d.cards = d.cards.filter((c) => !c.id.startsWith("rv-"));
    d.customers = d.customers.filter((c) => !c.id.startsWith("cust-rv-"));
    const prog = d.programs.find((p) => p.slug === "cafe-demo");
    const now = new Date().toISOString();
    for (const [key, consent] of [["yes", true], ["no", false]]) {
      d.customers.push({ id: `cust-${ids[key]}`, merchantId: prog.merchantId, firstName: "Avis", marketingConsent: consent, createdAt: now });
      d.cards.push({
        id: ids[key], programId: prog.id, customerId: `cust-${ids[key]}`, serial: serial(key), authToken: "x",
        stamps: 0, points: 0, rewardsAvailable: 0, rewardsRedeemed: 0, createdAt: now, updatedAt: now,
      });
    }
    writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
  }

  const on = await patch({ enabled: true, url: "https://g.page/r/e2e-test/review", afterVisits: 2, message: "Un avis ?" });
  assert.equal(on.status, 200);
  assert.equal((await on.json()).settings.enabled, true);

  const visit = async (k) => {
    const res = await api("/api/staff/sync", {
      token: vendeur,
      method: "POST",
      body: { ops: [{ clientOpId: `e2e-${crypto.randomUUID()}`, serial: serial(k), kind: "stamp", amount: 1, occurredAt: new Date().toISOString() }] },
    });
    assert.equal((await res.json()).results[0].status, "applied");
  };
  const cardOf = (k) => db().cards.find((c) => c.id === ids[k]);

  await visit("yes");
  assert.equal(cardOf("yes").reviewAskedAt, undefined, "pas avant la 2e visite");
  await visit("yes");
  const asked = cardOf("yes").reviewAskedAt;
  assert.ok(asked);
  assert.equal(cardOf("yes").lastMessage, "Un avis ?");
  await visit("yes");
  assert.equal(cardOf("yes").reviewAskedAt, asked, "une seule invitation");

  await visit("no");
  await visit("no");
  assert.equal(cardOf("no").reviewAskedAt, undefined, "sans consentement : pas d'invitation");

  const overview = await (await api("/api/staff/review", { token: owner })).json();
  assert.ok(overview.asked >= 1 && overview.askedLast30Days >= 1);

  // Remise en état
  assert.equal((await patch({ enabled: false })).status, 200);
  const d = db();
  const gone = new Set(Object.values(ids));
  d.cards = d.cards.filter((c) => !gone.has(c.id));
  d.customers = d.customers.filter((c) => !gone.has(c.id.replace("cust-", "")));
  d.transactions = d.transactions.filter((t) => !gone.has(t.cardId));
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
});

// ——— Offre d'anniversaire ———

await step("Anniversaire : réglages, question à l'inscription, cadeau du jour une fois par an", async () => {
  const patch = (body, token = owner) => api("/api/staff/birthday", { token, method: "PATCH", body });
  const cron = () => fetch(`${BASE}/api/cron/daily`, { headers: { Authorization: "Bearer cron_dev_local_test" } });
  assert.equal((await api("/api/staff/birthday", { token: vendeur })).status, 403);
  assert.equal((await patch({ message: "ok" })).status, 400);

  assert.equal((await patch({ enabled: false })).status, 200);
  assert.ok(!(await (await fetch(`${BASE}/c/cafe-demo`)).text()).includes("Votre anniversaire"), "pas demandé si l'offre est coupée");
  const on = await patch({ enabled: true, gift: true, message: "Bon anniversaire !" });
  assert.equal((await on.json()).settings.enabled, true);
  assert.ok((await (await fetch(`${BASE}/c/cafe-demo`)).text()).includes("Votre anniversaire"));

  const paris = (ms) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(ms)).slice(5);
  const stamp = Date.now();
  const ids = { today: `bd-today-${stamp}`, later: `bd-later-${stamp}` };
  {
    const d = db();
    const prog = d.programs.find((p) => p.slug === "cafe-demo");
    const now = new Date().toISOString();
    const birthdays = { today: paris(Date.now()), later: paris(Date.now() + 5 * 86400_000) };
    for (const key of ["today", "later"]) {
      d.customers.push({ id: `cust-${ids[key]}`, merchantId: prog.merchantId, firstName: "Fête", marketingConsent: false, birthday: birthdays[key], createdAt: now });
      d.cards.push({
        id: ids[key], programId: prog.id, customerId: `cust-${ids[key]}`, serial: `BD${key.toUpperCase()}${stamp}`, authToken: "x",
        stamps: 0, points: 0, rewardsAvailable: 0, rewardsRedeemed: 0, createdAt: now, updatedAt: now,
      });
    }
    writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
  }

  const res = await cron();
  assert.equal(res.status, 200);
  assert.ok((await res.json()).birthdays >= 1);
  const cardOf = (k) => db().cards.find((c) => c.id === ids[k]);
  assert.equal(cardOf("today").rewardsAvailable, 1);
  assert.equal(cardOf("today").lastMessage, "Bon anniversaire !");
  assert.equal(cardOf("today").birthdayYear, new Date().getFullYear());
  assert.equal(cardOf("later").rewardsAvailable, 0, "pas avant le jour J");

  await cron();
  assert.equal(cardOf("today").rewardsAvailable, 1, "un seul cadeau par an");

  const overview = await (await api("/api/staff/birthday", { token: owner })).json();
  assert.ok(overview.known >= 2 && overview.celebratedThisYear >= 1);

  // Remise en état
  assert.equal((await patch({ enabled: false })).status, 200);
  const d = db();
  const gone = new Set(Object.values(ids));
  d.cards = d.cards.filter((c) => !gone.has(c.id));
  d.customers = d.customers.filter((c) => !gone.has(c.id.replace("cust-", "")));
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
});

// ——— Abonnement : commerce de test créé directement dans la base de dev ———

const hashPin = (pin) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(pin, salt, 32).toString("hex")}`;
};
const now = new Date().toISOString();
const m = { id: `merchant-e2e-${Date.now()}`, email: `e2e-${Date.now()}@demo.test`, slug: `e2e-${Date.now()}` };
{
  const d = db();
  d.merchants.push({ id: m.id, name: "Commerce E2E", createdAt: now, subscription: { status: "pending", updatedAt: now } });
  d.programs.push({
    id: `prog-${m.id}`, merchantId: m.id, slug: m.slug, type: "stamps", name: "Carte", merchantName: "Commerce E2E",
    rewardLabel: "1 offert", stampsRequired: 10, pointsRequired: 100, pointsPerEuro: 1, welcomeBonus: 0,
    bgColor: "#000000", fgColor: "#ffffff", accentColor: "#ff9900", stampIcon: "star", locations: [],
  });
  d.staff.push({ id: `staff-${m.id}`, role: "owner", merchantId: m.id, name: "E2E", email: m.email, pinHash: hashPin("123456") });
  d.customers.push({ id: `cust-${m.id}`, merchantId: m.id, firstName: "Effacer", marketingConsent: false, createdAt: now });
  d.cards.push({
    id: `card-${m.id}`, programId: `prog-${m.id}`, customerId: `cust-${m.id}`, serial: `E2E${Date.now()}`, authToken: "x",
    stamps: 0, points: 0, rewardsAvailable: 0, rewardsRedeemed: 0, createdAt: now, updatedAt: now,
  });
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
}
const sign = (payload, secret = "whsec_dev_local_test") => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
};
const webhook = (event, signature) => {
  const payload = JSON.stringify(event);
  return fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Stripe-Signature": signature ?? sign(payload) },
    body: payload,
  });
};
let mToken;

await step("Abonnement en attente : connexion possible, appli et inscription client bloquées", async () => {
  const res = await (await api("/api/staff/login", { method: "POST", body: { email: m.email, pin: "123456" } })).json();
  mToken = res.token;
  assert.equal(res.subscription.active, false);
  assert.equal((await api("/api/staff/home", { token: mToken })).status, 402);
  assert.equal((await api("/api/staff/snapshot", { token: mToken })).status, 402);
  assert.equal((await api("/api/staff/sync", { token: mToken, method: "POST", body: { ops: [] } })).status, 402);
  assert.equal((await api("/api/staff/cards/ABCDEF", { token: mToken })).status, 402);
  assert.equal((await api("/api/staff/account", { token: mToken })).status, 200);
  const page = await (await fetch(`${BASE}/c/${m.slug}`)).text();
  assert.ok(page.includes("pas disponible pour le moment"));
});

await step("Stripe : signature refusée, paiement accepté puis résiliation", async () => {
  const paid = { type: "checkout.session.completed", data: { object: { client_reference_id: m.id, customer: "cus_e2e", subscription: "sub_e2e" } } };
  assert.equal((await webhook(paid, sign(JSON.stringify(paid), "mauvaise-cle"))).status, 400);
  assert.equal((await api("/api/staff/home", { token: mToken })).status, 402);
  assert.equal((await webhook(paid)).status, 200);
  assert.equal((await api("/api/staff/home", { token: mToken })).status, 200);
  const renewed = { type: "customer.subscription.updated", data: { object: { id: "sub_e2e", customer: "cus_e2e", status: "active", items: { data: [{ current_period_end: 1893456000 }] } } } };
  assert.equal((await webhook(renewed)).status, 200);
  const account = await (await api("/api/staff/account", { token: mToken })).json();
  assert.equal(account.subscription.currentPeriodEnd, new Date(1893456000 * 1000).toISOString());
  const canceled = { type: "customer.subscription.deleted", data: { object: { id: "sub_e2e", customer: "cus_e2e", status: "canceled", metadata: { merchantId: m.id } } } };
  assert.equal((await webhook(canceled)).status, 200);
  assert.equal((await api("/api/staff/home", { token: mToken })).status, 402);
  // Réactivation pour la suite
  assert.equal((await webhook(paid)).status, 200);
});

await step("Essai gratuit et formule annuelle : page d'offre, essai Stripe, ordre des évènements", async () => {
  const page = (await (await fetch(`${BASE}/inscription`)).text()).replaceAll("<!-- -->", "");
  assert.ok(page.includes("14 jours gratuits"), "essai annoncé");
  assert.ok(page.includes("Formule annuelle") && page.includes("250 € HT / an"), "formule annuelle proposée");

  // Commerce en attente qui a choisi l'annuel
  const id = `merchant-trial-${Date.now()}`;
  const email = `trial-${Date.now()}@demo.test`;
  const now = new Date().toISOString();
  {
    const d = db();
    d.merchants.push({ id, name: "Essai E2E", createdAt: now, subscription: { status: "pending", plan: "yearly", updatedAt: now } });
    d.programs.push({
      id: `prog-${id}`, merchantId: id, slug: `trial-${Date.now()}`, type: "stamps", name: "Carte", merchantName: "Essai E2E",
      rewardLabel: "1 offert", stampsRequired: 10, pointsRequired: 100, pointsPerEuro: 1, welcomeBonus: 0,
      bgColor: "#000000", fgColor: "#ffffff", accentColor: "#ff9900", stampIcon: "star", locations: [],
    });
    d.staff.push({ id: `staff-${id}`, role: "owner", merchantId: id, name: "Essai", email, pinHash: hashPin("123456") });
    writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
  }
  const token = (await (await api("/api/staff/login", { method: "POST", body: { email, pin: "123456" } })).json()).token;
  const pending = await (await api("/api/staff/account", { token })).json();
  assert.equal(pending.subscription.planId, "yearly");
  assert.equal(pending.subscription.planName, "Formule annuelle");

  // Stripe envoie souvent l'abonnement (en essai) avant la fin du paiement
  const trialEnd = Math.floor(Date.now() / 1000) + 14 * 86400;
  const created = {
    type: "customer.subscription.created",
    data: { object: { id: "sub_trial", customer: "cus_trial", status: "trialing", trial_end: trialEnd, metadata: { merchantId: id },
      items: { data: [{ current_period_end: trialEnd, price: { id: "price_x", recurring: { interval: "year" } } }] } } },
  };
  assert.equal((await webhook(created)).status, 200);
  const done = { type: "checkout.session.completed", data: { object: { client_reference_id: id, customer: "cus_trial", subscription: "sub_trial" } } };
  assert.equal((await webhook(done)).status, 200);

  const account = await (await api("/api/staff/account", { token })).json();
  assert.equal(account.subscription.status, "trialing", "l'essai n'est pas écrasé par « actif »");
  assert.equal(account.subscription.active, true);
  assert.equal(account.subscription.trialEnd, new Date(trialEnd * 1000).toISOString());
  assert.equal(account.subscription.planId, "yearly");
  assert.equal((await api("/api/staff/home", { token })).status, 200, "l'appli fonctionne pendant l'essai");

  // Fin d'essai payée : actif, la date d'essai n'est plus affichée
  const paid = { ...created, type: "customer.subscription.updated" };
  paid.data = { object: { ...created.data.object, status: "active" } };
  assert.equal((await webhook(paid)).status, 200);
  const after = await (await api("/api/staff/account", { token })).json();
  assert.equal(after.subscription.status, "active");
  assert.equal(after.subscription.trialEnd, undefined);

  const d = db();
  d.merchants = d.merchants.filter((x) => x.id !== id);
  d.programs = d.programs.filter((x) => x.merchantId !== id);
  d.staff = d.staff.filter((x) => x.merchantId !== id);
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
});

await step("RGPD : effacement d'un client et de ses données", async () => {
  const serial = db().cards.find((c) => c.id === `card-${m.id}`).serial;
  assert.equal((await api(`/api/staff/customers/${serial}`, { token: mToken, method: "DELETE" })).status, 200);
  const d = db();
  assert.ok(!d.cards.some((c) => c.id === `card-${m.id}`));
  assert.ok(!d.customers.some((c) => c.id === `cust-${m.id}`));
  assert.equal((await api(`/api/staff/customers/${serial}`, { token: mToken, method: "DELETE" })).status, 404);
});

await step("Connexion : blocage après 5 codes faux", async () => {
  const statuses = [];
  for (let i = 0; i < 5; i++) statuses.push((await api("/api/staff/login", { method: "POST", body: { email: m.email, pin: "000000" } })).status);
  assert.deepEqual(statuses, [401, 401, 401, 401, 401]);
  // Même avec le bon code, le compte est bloqué 15 min
  assert.equal((await api("/api/staff/login", { method: "POST", body: { email: m.email, pin: "123456" } })).status, 429);
});

// Nettoyage du commerce de test
{
  const d = db();
  d.merchants = d.merchants.filter((x) => x.id !== m.id);
  d.programs = d.programs.filter((x) => x.merchantId !== m.id);
  d.staff = d.staff.filter((x) => x.merchantId !== m.id);
  writeFileSync(path.resolve(".data/dev-db.json"), JSON.stringify(d, null, 2));
}

await step("Mode démo : boutique fictive consultable, rien n'est modifiable", async () => {
  const res = await api("/api/staff/demo", { method: "POST" });
  assert.equal(res.status, 200);
  const s = await res.json();
  assert.equal(s.demo, true);
  assert.equal(s.staff.role, "owner");
  const snap = await (await api("/api/staff/snapshot", { token: s.token })).json();
  assert.ok(snap.cards.length >= 20, "la démo doit avoir des clients");
  const stats = await api("/api/staff/stats?days=30", { token: s.token });
  assert.equal(stats.status, 200);
  const card = snap.cards[0];
  const sync = await api("/api/staff/sync", {
    token: s.token,
    method: "POST",
    body: { ops: [{ clientOpId: crypto.randomUUID(), serial: card.serial, kind: "stamp", amount: 1, occurredAt: new Date().toISOString() }] },
  });
  assert.equal(sync.status, 403);
  assert.equal((await sync.json()).code, "demo");
  const patch = await api("/api/staff/program", { token: s.token, method: "PATCH", body: { name: "Piratée" } });
  assert.equal(patch.status, 403);
  const del = await api("/api/staff/account", { token: s.token, method: "DELETE", body: { confirm: "SUPPRIMER" } });
  assert.equal(del.status, 403);
  const after = await (await api(`/api/staff/cards/${card.serial}`, { token: s.token })).json();
  assert.equal(after.card.stamps, card.stamps, "la carte de démo ne doit pas changer");
});

console.log(failures ? `\n${failures} échec(s)` : "\nTout est OK");
process.exit(failures ? 1 : 0);
