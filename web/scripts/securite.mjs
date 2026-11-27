// Tests de vulnérabilité : ce qu'un attaquant essaierait sur le serveur.
// Serveur de production lancé avec SEED_DEMO=1, TRUSTED_PROXY_HOPS=0, CRON_SECRET et STRIPE_WEBHOOK_SECRET
// (voir .github/workflows/ci.yml), base Postgres (DATABASE_URL).
//   node scripts/securite.mjs [http://localhost:3000]
import { strict as assert } from "node:assert";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
let failures = 0;
let ipCounter = 0;
// Chaque groupe de tests se présente avec sa propre adresse (dernière de X-Forwarded-For, TRUSTED_PROXY_HOPS=0)
const freshIp = () => `198.51.100.${++ipCounter}`;

async function step(name, fn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (e) {
    failures++;
    console.log(`✖ ${name}\n    ${e.message}`);
  }
}

const api = (p, { token, method = "GET", body, headers = {}, ip } = {}) =>
  fetch(BASE + p, {
    method,
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ip ? { "X-Forwarded-For": ip } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

async function login(email, pin = "1234") {
  const res = await api("/api/staff/login", { method: "POST", body: { email, pin }, ip: freshIp() });
  return res.ok ? (await res.json()).token : undefined;
}

// ——— Accès direct à la base de test (même format que le serveur) ———
function readEnvLocal() {
  try {
    return Object.fromEntries(
      readFileSync(path.resolve(".env.local"), "utf8")
        .split(/\r?\n/)
        .filter((l) => /^[A-Z_]+=/.test(l))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
    );
  } catch {
    return {};
  }
}
const DATABASE_URL = process.env.DATABASE_URL ?? readEnvLocal().DATABASE_URL;
assert.ok(DATABASE_URL, "DATABASE_URL requis (tests sur Postgres)");
const { default: pg } = await import("pg");
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
const sql = async (q, params) => (await pool.query(q, params)).rows;
const hashPin = (pin, salt = crypto.randomBytes(16).toString("hex")) => `${salt}:${crypto.scryptSync(pin, salt, 32).toString("hex")}`;

const owner = await login("cafe@demo.test");
const vendeur = await login("vendeur@demo.test");
const otherOwner = await login("institut@demo.test");
assert.ok(owner && vendeur && otherOwner, "comptes de démo introuvables (SEED_DEMO=1 ?)");

// Une carte client du café, pour les essais d'accès d'un autre commerce
let [cafeCard] = await sql("select c.serial from cards c where c.program_id = 'prog-cafe' limit 1");
if (!cafeCard) {
  await sql(
    "insert into customers (id, merchant_id, first_name, marketing_consent, created_at) values ('cust-secu', 'merchant-demo', 'Secu', false, now()) on conflict do nothing",
  );
  await sql(
    "insert into cards (id, program_id, customer_id, serial, auth_token, stamps, points, rewards_available, rewards_redeemed, created_at, updated_at) values ('card-secu', 'prog-cafe', 'cust-secu', 'SECU' || md5(random()::text), md5(random()::text) || md5(random()::text), 0, 0, 0, 0, now(), now())",
  );
  [cafeCard] = await sql("select serial from cards where program_id = 'prog-cafe' limit 1");
}

// ——— 1. En-têtes de sécurité et cookies ———
await step("En-têtes : CSP, HSTS, anti-iframe, nosniff, pas de X-Powered-By, aucun cookie", async () => {
  for (const p of ["/", "/inscription", "/c/cafe-demo", "/confidentialite", "/code-oublie"]) {
    const res = await fetch(BASE + p);
    assert.equal(res.status, 200, `${p} → ${res.status}`);
    const h = res.headers;
    const csp = h.get("content-security-policy") ?? "";
    for (const d of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'"]) assert.ok(csp.includes(d), `${p} : CSP sans ${d}`);
    assert.ok(h.get("strict-transport-security")?.includes("max-age="), `${p} : HSTS absent`);
    assert.equal(h.get("x-frame-options"), "DENY", `${p} : X-Frame-Options`);
    assert.equal(h.get("x-content-type-options"), "nosniff", `${p} : nosniff`);
    assert.equal(h.get("x-powered-by"), null, `${p} : X-Powered-By visible`);
    assert.equal(h.get("set-cookie"), null, `${p} : un cookie est déposé`);
  }
});

await step("Accueil public : aucun commerce listé", async () => {
  const html = await (await fetch(BASE + "/")).text();
  for (const leak of ["Café Démo", "Institut Démo", "/c/cafe-demo"]) assert.ok(!html.includes(leak), `l'accueil montre « ${leak} »`);
});

// ——— 2. Routes du commerçant sans session ———
const STAFF_ROUTES = [
  ["GET", "/api/staff/home"], ["GET", "/api/staff/snapshot"], ["GET", "/api/staff/stats"], ["GET", "/api/staff/customers"],
  ["GET", `/api/staff/customers/${cafeCard.serial}`], ["DELETE", `/api/staff/customers/${cafeCard.serial}`],
  ["GET", `/api/staff/cards/${cafeCard.serial}`], ["POST", "/api/staff/sync"], ["GET", "/api/staff/program"],
  ["PATCH", "/api/staff/program"], ["POST", "/api/staff/program/logo"], ["POST", "/api/staff/program/banner"],
  ["GET", "/api/staff/team"], ["POST", "/api/staff/team"], ["DELETE", "/api/staff/team/staff-cafe-vendeur"],
  ["GET", "/api/staff/campaigns"], ["POST", "/api/staff/campaigns"], ["GET", "/api/staff/winback"], ["PATCH", "/api/staff/winback"],
  ["GET", "/api/staff/birthday"], ["PATCH", "/api/staff/birthday"], ["GET", "/api/staff/review"], ["PATCH", "/api/staff/review"],
  ["GET", "/api/staff/export?format=csv"], ["GET", "/api/staff/export/link"], ["POST", "/api/staff/billing"],
  ["GET", "/api/staff/account"], ["DELETE", "/api/staff/account"], ["POST", "/api/staff/me/pin"],
];

await step("Sans session, ou avec une fausse session : 401 sur toutes les routes du commerçant", async () => {
  for (const token of [undefined, "faux-jeton", crypto.randomBytes(32).toString("base64url"), "' or 1=1 --"]) {
    for (const [method, p] of STAFF_ROUTES) {
      const res = await api(p, { method, token, body: method === "GET" || method === "DELETE" ? undefined : {} });
      assert.ok([401, 403].includes(res.status), `${method} ${p} (jeton ${token ?? "absent"}) → ${res.status}`);
    }
  }
});

// ——— 3. Routes réservées au responsable ———
await step("Vendeur : refusé sur les réglages, l'équipe, les statistiques, les exports, la facturation, les messages", async () => {
  const OWNER_ONLY = [
    ["GET", "/api/staff/stats"], ["PATCH", "/api/staff/program", { rewardLabel: "piraté" }],
    ["POST", "/api/staff/program/logo", { image: "A".repeat(200) }], ["DELETE", "/api/staff/program/logo"],
    ["POST", "/api/staff/program/banner", { image: "A".repeat(200) }], ["DELETE", "/api/staff/program/banner"],
    ["GET", "/api/staff/team"], ["POST", "/api/staff/team", { name: "Intrus", email: "intrus@example.com", pin: "123456" }],
    ["DELETE", "/api/staff/team/staff-cafe"], ["POST", "/api/staff/campaigns", { message: "spam" }],
    ["PATCH", "/api/staff/winback", { enabled: true }], ["PATCH", "/api/staff/birthday", { enabled: true }],
    ["PATCH", "/api/staff/review", { enabled: true }], ["GET", "/api/staff/export/link"], ["POST", "/api/staff/billing"],
    ["GET", "/api/staff/export?format=csv"], ["DELETE", `/api/staff/customers/${cafeCard.serial}`],
  ];
  for (const [method, p, body] of OWNER_ONLY) {
    const res = await api(p, { method, token: vendeur, body });
    assert.ok([401, 403].includes(res.status), `${method} ${p} par un vendeur → ${res.status}`);
  }
  // Le compte du vendeur n'a pas changé de rôle et le patron est toujours là
  const [row] = await sql("select role from staff where id = 'staff-cafe'");
  assert.equal(row?.role, "owner");
});

// ——— 4. Cloisonnement entre commerces ———
await step("Un commerce ne voit ni ne modifie les clients d'un autre (carte, fiche, effacement, passage)", async () => {
  const s = cafeCard.serial;
  for (const [method, p] of [["GET", `/api/staff/cards/${s}`], ["GET", `/api/staff/customers/${s}`], ["DELETE", `/api/staff/customers/${s}`]]) {
    const res = await api(p, { method, token: otherOwner });
    assert.ok([403, 404].includes(res.status), `${method} ${p} par un autre commerce → ${res.status}`);
  }
  const [before] = await sql("select stamps, points from cards where serial = $1", [s]);
  const res = await api("/api/staff/sync", {
    method: "POST",
    token: otherOwner,
    body: { ops: [{ clientOpId: crypto.randomUUID(), serial: s, kind: "points", amount: 50, occurredAt: new Date().toISOString() }] },
  });
  const out = res.ok ? await res.json() : {};
  assert.ok(!res.ok || out.results?.every((r) => r.status === "rejected"), "passage accepté sur la carte d'un autre commerce");
  const [after] = await sql("select stamps, points from cards where serial = $1", [s]);
  assert.deepEqual(after, before, "la carte d'un autre commerce a changé");
  const customers = await (await api("/api/staff/customers", { token: otherOwner })).json();
  assert.ok(!JSON.stringify(customers).includes(s), "la liste des clients contient ceux d'un autre commerce");
});

// ——— 5. XSS : un nom de commerce piégé est affiché comme du texte ———
await step("XSS : balises dans le nom du commerce et la récompense affichées comme du texte", async () => {
  const [orig] = await sql("select merchant_name, reward_label from programs where id = 'prog-beaute'");
  const payload = `<img src=x onerror=alert(1)>`;
  try {
    const res = await api("/api/staff/program", { method: "PATCH", token: otherOwner, body: { merchantName: payload, rewardLabel: `<script>alert(2)</script>` } });
    assert.equal(res.status, 200, `modification refusée (${res.status})`);
    for (const p of ["/c/institut-demo", "/c/institut-demo/affiche"]) {
      const html = await (await fetch(BASE + p)).text();
      assert.ok(!html.includes(payload) && !html.includes("<script>alert(2)"), `${p} : balise injectée telle quelle`);
      assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"), `${p} : nom attendu échappé`);
    }
  } finally {
    await sql("update programs set merchant_name = $1, reward_label = $2 where id = 'prog-beaute'", [orig.merchant_name, orig.reward_label]);
  }
});

await step("Logo : un fichier SVG ou HTML déguisé est refusé ou réencodé en PNG", async () => {
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect width="10" height="10"/></svg>`.padEnd(200, " ")).toString("base64");
  const html = Buffer.from("<html><script>alert(1)</script></html>".padEnd(200, " ")).toString("base64");
  try {
    for (const image of [`data:image/svg+xml;base64,${svg}`, html]) {
      const res = await api("/api/staff/program/logo", { method: "POST", token: otherOwner, body: { image } });
      if (res.ok) {
        const [row] = await sql("select logo from programs where id = 'prog-beaute'");
        assert.ok(row.logo?.startsWith("data:image/png;base64,"), "logo enregistré sans être réencodé en PNG");
        assert.ok(!Buffer.from(row.logo.split(",")[1], "base64").toString("latin1").includes("<script"), "script resté dans le logo");
      } else assert.equal(res.status, 400);
    }
  } finally {
    await api("/api/staff/program/logo", { method: "DELETE", token: otherOwner });
  }
});

// ——— 6. Injections SQL et entrées hostiles ———
await step("Injections SQL : identifiants piégés sans effet (404/401, base intacte)", async () => {
  const [{ n: before }] = await sql("select count(*)::int as n from cards");
  for (const evil of ["' or '1'='1", "1; drop table cards; --", "%27%20or%201%3D1--"]) {
    const enc = encodeURIComponent(evil);
    for (const p of [`/api/staff/cards/${enc}`, `/api/staff/customers/${enc}`, `/api/wallet/apple/${enc}`, `/api/wallet/google/${enc}`, `/api/qr/${enc}`]) {
      const res = await api(p, { token: owner });
      assert.ok(res.status >= 400 && res.status < 500, `${p} → ${res.status}`);
    }
    const html = await (await fetch(`${BASE}/c/${enc}`)).text();
    assert.ok(html.includes("NEXT_HTTP_ERROR_FALLBACK;404"), `/c/${enc} : pas la page « introuvable »`);
  }
  const login = await api("/api/staff/login", { method: "POST", body: { email: "' or 1=1 --", pin: "123456" }, ip: freshIp() });
  assert.equal(login.status, 401);
  const [{ n: after }] = await sql("select count(*)::int as n from cards");
  assert.equal(after, before);
});

await step("Corps de requête invalides : erreurs propres, jamais 500", async () => {
  for (const [method, p] of [["POST", "/api/staff/sync"], ["PATCH", "/api/staff/program"], ["POST", "/api/staff/team"], ["POST", "/api/staff/login"]]) {
    for (const body of ["{pas du json", JSON.stringify({ __proto__: { admin: true }, constructor: { prototype: { admin: true } } }), JSON.stringify({ ops: "x".repeat(10000) })]) {
      const res = await api(p, { method, token: owner, body, ip: freshIp() });
      assert.ok(res.status < 500, `${method} ${p} → ${res.status}`);
    }
  }
});

// ——— 7. Tâches et webhooks protégés ———
await step("Tâche du matin : refusée sans le secret ou avec un faux secret", async () => {
  for (const authorization of [undefined, "Bearer faux", "Bearer ", "cron_dev_local_test"]) {
    const res = await fetch(BASE + "/api/cron/daily", { headers: authorization ? { authorization } : {} });
    assert.equal(res.status, 401, `Authorization: ${authorization} → ${res.status}`);
  }
});

await step("Webhook Stripe : signature absente, fausse ou ancienne refusée, aucun abonnement activé", async () => {
  const event = JSON.stringify({ type: "checkout.session.completed", data: { object: { client_reference_id: "merchant-demo-2", subscription: "sub_x", customer: "cus_x" } } });
  const old = Math.floor(Date.now() / 1000) - 3600;
  const oldSig = crypto.createHmac("sha256", "whsec_dev_local_test").update(`${old}.${event}`).digest("hex");
  for (const sig of [undefined, "t=1,v1=00", `t=${Math.floor(Date.now() / 1000)},v1=${"ab".repeat(32)}`, `t=${old},v1=${oldSig}`]) {
    const res = await fetch(BASE + "/api/stripe/webhook", { method: "POST", body: event, headers: sig ? { "stripe-signature": sig } : {} });
    assert.equal(res.status, 400, `signature ${sig} → ${res.status}`);
  }
  const [m] = await sql("select stripe_subscription_id from merchants where id = 'merchant-demo-2'");
  assert.notEqual(m?.stripe_subscription_id, "sub_x");
});

await step("Apple Wallet : appels sans le jeton de la carte refusés", async () => {
  const res = await fetch(`${BASE}/api/passkit/v1/passes/pass.dev.qamar.fidelite/${cafeCard.serial}`, { headers: { Authorization: "ApplePass faux" } });
  assert.equal(res.status, 401);
  const reg = await fetch(`${BASE}/api/passkit/v1/devices/x/registrations/pass.dev.qamar.fidelite/${cafeCard.serial}`, {
    method: "POST",
    headers: { Authorization: "ApplePass faux", "Content-Type": "application/json" },
    body: JSON.stringify({ pushToken: "x" }),
  });
  assert.equal(reg.status, 401);
  const trav = await fetch(`${BASE}/api/passkit/..%2F..%2F..%2Fetc%2Fpasswd`);
  assert.ok(trav.status >= 400 && trav.status < 500, `chemin ../ → ${trav.status}`);
});

await step("Cartes Wallet : un identifiant de carte inventé ne donne rien", async () => {
  for (const p of [`/api/wallet/apple/${crypto.randomUUID()}`, `/api/wallet/google/${crypto.randomUUID()}`]) {
    const res = await fetch(BASE + p);
    assert.equal(res.status, 404, `${p} → ${res.status}`);
  }
  // Page en streaming : le code 200 est déjà parti, Next.js affiche la page « introuvable » à la place de la carte
  const html = await (await fetch(`${BASE}/carte/${crypto.randomUUID()}`)).text();
  assert.ok(html.includes("NEXT_HTTP_ERROR_FALLBACK;404") && !html.includes("Bienvenue"), "carte inventée affichée");
});

// ——— 8. Essais répétés ———
await step("Connexion : changer la première adresse de X-Forwarded-For ne contourne pas la limite", async () => {
  const real = freshIp();
  let blocked = false;
  for (let i = 0; i < 25 && !blocked; i++) {
    const res = await api("/api/staff/login", {
      method: "POST",
      body: { email: `inconnu${i}@example.com`, pin: "123456" },
      headers: { "X-Forwarded-For": `10.0.${i}.1, ${real}` },
    });
    blocked = res.status === 429;
  }
  assert.ok(blocked, "toujours pas bloqué après 25 essais avec une fausse adresse différente à chaque fois");
});

await step("Connexion : compte bloqué après 5 codes faux, même avec des adresses différentes", async () => {
  await sql("delete from login_failures where email = 'institut@demo.test'");
  const statuses = [];
  for (let i = 0; i < 7; i++) {
    statuses.push((await api("/api/staff/login", { method: "POST", body: { email: "institut@demo.test", pin: "999999" }, ip: freshIp() })).status);
  }
  assert.deepEqual(statuses.slice(0, 5), [401, 401, 401, 401, 401]);
  assert.ok(statuses.slice(5).every((s) => s === 429), `après 5 essais : ${statuses.slice(5)}`);
  await sql("delete from login_failures where email = 'institut@demo.test'");
});

// ——— 9. Code oublié : lien de 30 minutes, une seule fois ———
// Navigateur pour les formulaires (actions serveur) : Playwright installé dans le projet ou sur la machine
const { chromium } = createRequire(import.meta.url)("playwright");
const browser = await chromium.launch();
const newToken = async (staffId, minutes) => {
  const token = crypto.randomBytes(32).toString("base64url");
  await sql("insert into pin_resets (token_hash, staff_id, expires_at) values ($1, $2, now() + make_interval(mins => $3))", [
    crypto.createHash("sha256").update(token).digest("hex"),
    staffId,
    minutes,
  ]);
  return token;
};

await step("Code oublié : même réponse que le compte existe ou non", async () => {
  const page = await browser.newPage({ extraHTTPHeaders: { "X-Forwarded-For": freshIp() } });
  const texts = [];
  for (const email of ["cafe@demo.test", "personne-ici@example.com"]) {
    await page.goto(BASE + "/code-oublie");
    await page.fill('input[name="email"]', email);
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Si un compte existe");
    texts.push(await page.locator("main").innerText());
  }
  assert.equal(texts[0], texts[1]);
  await page.close();
});

await step("Code oublié : lien expiré ou inventé refusé", async () => {
  const page = await browser.newPage();
  for (const token of [await newToken("staff-beaute", -1), crypto.randomBytes(32).toString("base64url"), "court"]) {
    await page.goto(`${BASE}/code-oublie/${token}`);
    await page.waitForSelector("text=Ce lien a expiré ou a déjà servi");
    assert.equal(await page.locator('input[name="pin"]').count(), 0);
  }
  await page.close();
});

await step("Code oublié : nouveau code enregistré, sessions coupées, lien inutilisable une 2e fois", async () => {
  const before = await login("institut@demo.test");
  const token = await newToken("staff-beaute", 30);
  const page = await browser.newPage({ extraHTTPHeaders: { "X-Forwarded-For": freshIp() } });
  try {
    await page.goto(`${BASE}/code-oublie/${token}`);
    await page.fill('input[name="pin"]', "246810");
    await page.fill('input[name="pinConfirm"]', "246810");
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=C'est fait");
    assert.equal((await api("/api/staff/home", { token: before })).status, 401, "ancienne session encore valable");
    assert.equal(await login("institut@demo.test"), undefined, "l'ancien code marche encore");
    assert.ok(await login("institut@demo.test", "246810"), "le nouveau code ne marche pas");
    // Deuxième utilisation du même lien
    await page.goto(`${BASE}/code-oublie/${token}`);
    await page.waitForSelector("text=Ce lien a expiré ou a déjà servi");
    const [{ n }] = await sql("select count(*)::int as n from pin_resets where staff_id = 'staff-beaute' and used_at is null and expires_at > now()");
    assert.equal(n, 0);
  } finally {
    await sql("update staff set pin_hash = $1 where id = 'staff-beaute'", [hashPin("1234")]);
    await sql("delete from login_failures where email = 'institut@demo.test'");
    await page.close();
  }
});

await browser.close();

// ——— 10. Base de données ———
await step("Base : sécurité par ligne (RLS) active sur toutes les tables", async () => {
  const rows = await sql("select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity");
  assert.deepEqual(rows.map((r) => r.relname), []);
});

await step("Base : codes et liens jamais stockés en clair", async () => {
  // (le compte « Découvrir l'appli » a volontairement un code impossible : « x:00 »)
  const staff = await sql("select id, pin_hash from staff where id <> 'staff-vitrine'");
  const bad = staff.filter((s) => !/^[0-9a-f]{32}:[0-9a-f]{64}$/.test(s.pin_hash));
  assert.deepEqual(bad.map((s) => s.id), [], "code enregistré autrement qu'en scrypt");
  const resets = await sql("select token_hash from pin_resets");
  assert.ok(resets.every((r) => /^[0-9a-f]{64}$/.test(r.token_hash)), "lien de réinitialisation stocké en clair");
});

await pool.end();
console.log(failures ? `\n${failures} test(s) en échec` : "\nTous les tests de sécurité passent");
process.exit(failures ? 1 : 0);
