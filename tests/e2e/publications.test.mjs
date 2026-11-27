// Publications affichées comme les voyages : cartes des listes, page d'une publication (en lecture seule),
// confidentialité de ce qui est publié. Contre les émulateurs Firebase (voir tests/package.json).
// SHOTS=<dossier> : captures ordinateur (1366 px) et téléphone (390 px), en français et en anglais.
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8781;
const SITE = `http://localhost:${PORT}/index.html?emulateur`;
const SHOTS = process.env.SHOTS;
const CHROME = process.env.CHROME_PATH
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".xml": "application/xml" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  if (file.endsWith(".html")) return res.end(fs.readFileSync(file, "utf8").replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:*"));
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

const browser = forceLang(await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-sandbox"] }), "fr-FR");
let ok = 0, ko = 0;
const problems = [];
const check = (label, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (page) => page.evaluate(() => document.getElementById("app").innerText);
const goHash = async (page, hash) => { await page.evaluate((h) => (location.hash = h), hash); await sleep(1500); };
const DESK = { width: 1366, height: 900 }, PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };

async function newUser(email) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport(DESK);
  page.on("pageerror", (e) => problems.push(`[${email}] erreur JS : ${e.message}`));
  page.on("dialog", (d) => d.dismiss());
  await page.goto(SITE + "#voyages");
  await page.waitForSelector('[data-act="open-auth"]', { timeout: 15000 });
  await page.click('#account [data-act="open-auth"]');
  await page.click('[data-act="auth-mode"][data-mode="signup"]');
  await page.type("#auth-email", email);
  await page.type("#auth-password", "motdepasse123");
  await page.type("#auth-confirm", "motdepasse123");
  await page.click(".auth-submit");
  await page.waitForSelector('[data-act="verify-check"]', { timeout: 15000 });
  await page.click('[data-act="verify-later"]');
  return page;
}
async function makeProfile(page, name, handle) {
  await goHash(page, "profil");
  await page.waitForSelector("[data-profile-form]");
  await page.type('[data-profile-form] [name="name"]', name);
  await page.type('[data-profile-form] [name="handle"]', handle);
  await page.click('[data-profile-form] [name="visibility"][value="public"]');
  await page.click('[data-profile-form] button[type="submit"]');
  await sleep(2000);
}

// Voyage avec tout ce qui ne doit jamais être publié : dates, adresse, prix, liens, numéro de réservation,
// billets, notes. Les mots « SECRET… » ne doivent apparaître nulle part dans les publications.
const ROAD = { name: "Portugal en train", currency: "EUR", createdAt: 1, items: [
  { id: "t0", type: "transport", mode: "avion", from: "Paris", to: "Lisbonne", dep: "2026-06-01T08:10", arr: "2026-06-01T09:55", price: 89,
    company: "SECRETAIR", ref: "SECRETREF1", url: "https://secret.example/vol", notes: "SECRETNOTE vol", tickets: [{ id: "k1", name: "SECRETBILLET.pdf", size: 10 }] },
  { id: "s1", type: "stop", place: "Lisbonne", country: "Portugal", arrive: "2026-06-01", depart: "2026-06-04", price: 312, address: "SECRETADRESSE 12 rua",
    notes: "SECRETNOTE code porte", links: [{ id: "l1", label: "SECRETLIEN", url: "https://secret.example/hotel" }], geo: { lat: 38.7223, lng: -9.1393 },
    todos: [{ id: "a1", text: "Tram 28", date: "2026-06-02", time: "09:30", how: "Ligne 28 depuis Martim Moniz", price: 3, book: true, maps: "https://secret.example/maps" },
      { id: "a2", text: "Musée des Azulejos", date: "2026-06-03", time: "14:00", price: 8 }] },
  { id: "t1", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2026-06-04T10:00", arr: "2026-06-04T12:50", price: 25, ref: "SECRETREF2" },
  { id: "s2", type: "stop", place: "Porto", country: "Portugal", arrive: "2026-06-04", depart: "2026-06-06", price: 180, geo: { lat: 41.1579, lng: -8.6291 },
    todos: [{ id: "a3", text: "Caves de Gaia", date: "2026-06-05", time: "16:00" }] },
  { id: "t2", type: "transport", mode: "bus", from: "Porto", to: "Braga", dep: "2026-06-06T09:00", arr: "2026-06-06T10:10", price: 6 },
  { id: "s3", type: "stop", place: "Braga", country: "Portugal", arrive: "2026-06-06", depart: "2026-06-06", geo: { lat: 41.5454, lng: -8.4265 } },
] };
const SEJOUR = { name: "Une semaine à Rome", kind: "sejour", currency: "EUR", createdAt: 2, items: [
  { id: "r0", type: "transport", mode: "avion", from: "Paris", to: "Rome", dep: "2026-09-10T07:00", arr: "2026-09-10T09:05", price: 120, ref: "SECRETREF3" },
  { id: "r1", type: "stop", place: "Rome", country: "Italie", arrive: "2026-09-10", depart: "2026-09-13", price: 350, address: "SECRETADRESSE via", geo: { lat: 41.9028, lng: 12.4964 },
    todos: [{ id: "b1", text: "Colisée", date: "2026-09-11", time: "09:00", how: "Métro B, Colosseo", price: 18 },
      { id: "b2", text: "Trastevere", date: "2026-09-12", time: "19:30" }] },
  { id: "r2", type: "transport", mode: "avion", from: "Rome", to: "Paris", dep: "2026-09-13T18:00", arr: "2026-09-13T20:05" },
] };
const REAL_DATES = /\b(1er|[0-9]{1,2}) (juin|sept)|june|september|2026-0|\/06\/2026/i;

// ---------- Alice publie un road trip (avec budget et recommandations) et un séjour ----------
const alice = await newUser(`alice.${Date.now()}@test.fr`);
await makeProfile(alice, "Alice Martin", "alice.pub");
const [roadId, sejourId] = await alice.evaluate(async (road, sejour) => {
  const social = await import("/js/social.js");
  const a = await social.publish(road, { title: road.name, visibility: "public", budget: true, recos: [
    { kind: "resto", name: "Taberna da Rua", where: "Alfama", note: "Petiscos simples.", stop: 1 },
    { kind: "adresse", name: "Carte Navegante", note: "Pour le métro et le tram." }] });
  const b = await social.publish(sejour, { title: sejour.name, visibility: "public", budget: true, recos: [] });
  return [a, b];
}, ROAD, SEJOUR);
check("deux publications créées", !!roadId && !!sejourId);

// ---------- Bob suit Alice et commente ----------
const bob = await newUser(`bob.${Date.now()}@test.fr`);
await makeProfile(bob, "Bob Durand", "bob.pub");
await goHash(bob, "decouvrir");
await bob.waitForSelector(".post-card", { timeout: 10000 }).catch(() => {});
const aliceUid = await bob.$eval(`.post-card a[href^="#personne-"]`, (a) => a.getAttribute("href").slice("#personne-".length)).catch(() => "");
await goHash(bob, "personne-" + aliceUid);
await bob.click('[data-act="follow"]').catch(() => {});
await sleep(1500);
await goHash(bob, "publication-" + roadId);
await bob.waitForSelector("[data-comment-form] textarea", { timeout: 10000 });
await bob.type("[data-comment-form] textarea", "Super itinéraire, merci !");
await bob.click('[data-comment-form] button[type="submit"]');
await sleep(1500);

// ---------- Confidentialité : page, Fil, Découvrir ----------
for (const [label, hash] of [["publication", "publication-" + roadId], ["séjour", "publication-" + sejourId], ["Fil", "fil"], ["Découvrir", "decouvrir"]]) {
  await goHash(bob, hash);
  await sleep(800);
  const html = await bob.$eval("#app", (e) => e.innerHTML);
  const txt = await text(bob);
  check(`${label} : rien de secret (adresse, lien, réservation, billet, note)`, !/SECRET/.test(html));
  check(`${label} : aucune date réelle`, !REAL_DATES.test(txt));
  // Le budget publié montre le coût par destination (autorisé) ; ailleurs, aucun prix d'élément
  const outside = await bob.$eval("#app", (e) => { const c = e.cloneNode(true); c.querySelectorAll(".budget").forEach((b) => b.remove()); return c.innerText; });
  check(`${label} : aucun prix d'élément hors du budget (312, 89, 25, 18)`, !/\b(312|89|25|18)\s?€/.test(outside));
}

// ---------- Captures (avant / après) ----------
async function shots(tag) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const [vp, name] of [[DESK, "ordi"], [PHONE, "tel"]]) {
    for (const [page, hash, file] of [[bob, "fil", "fil"], [bob, "decouvrir", "decouvrir"], [alice, "mes-publications", "mes-publications"],
      [bob, "publication-" + roadId, "road-autre"], [alice, "publication-" + roadId, "road-moi"], [bob, "publication-" + sejourId, "sejour-autre"], [alice, "publication-" + sejourId, "sejour-moi"]]) {
      await page.setViewport(vp);
      await page.goto(SITE + "#" + hash);
      await page.waitForSelector("#app > *", { timeout: 15000 });
      await sleep(1500);
      await sleep(1200);
      await page.screenshot({ path: `${SHOTS}/${tag}-${name}-${file}.png`, fullPage: true });
    }
  }
  for (const p of [alice, bob]) await p.setViewport(DESK);
}
// ---------- Cartes des listes : même gabarit que Mes voyages (auteur, route, points, 3 chiffres) ----------
const cardShape = (page) => page.$$eval(".post-card", (l) => l.filter((c) => c.textContent.includes("@alice.pub")).map((c) => ({
  author: !!c.querySelector(".tc-top .post-author .avatar") && !!c.querySelector(".pa-date"),
  route: !!c.querySelector(".tc-route"), dots: c.querySelectorAll(".tc-dots i").length,
  stats: [...c.querySelectorAll(".tc-stats dt")].map((d) => d.textContent.trim()),
})));
for (const [page, hash, label] of [[bob, "fil", "Fil"], [bob, "decouvrir", "Découvrir"], [alice, "mes-publications", "Mes publications"]]) {
  await goHash(page, hash);
  await page.waitForSelector(".post-card", { timeout: 10000 }).catch(() => {});
  const cards = await cardShape(page);
  check(`${label} : cartes au gabarit de Mes voyages`, cards.length >= 2 && cards.every((c) => c.author && c.route && c.dots >= 1 && c.stats.length === 3));
  check(`${label} : chiffres d'un road trip et d'un séjour`, cards.some((c) => c.stats.join() === "Étapes,Jours,Budget") && cards.some((c) => c.stats.join() === "Séjour,Jours,Budget"));
}
check("Mes publications : statut de visibilité gardé", (await text(alice)).includes("Publié · Tout le monde"));
check("Mes publications : pas de cœur sur ses publications", !(await alice.$('.post-card [data-act="fav-post"]')));
// Mode sélection : même gabarit, avec la case à cocher, sans lien
await alice.click('[data-act="select-start"]').catch(() => {});
await sleep(400);
{ const cards = await cardShape(alice);
  check("sélection : une case par publication, même gabarit, sans lien", (await alice.$$(".post-card .tc-check")).length === 2 && !(await alice.$(".post-card .tc-link")) && cards.every((c) => c.stats.length === 3)); }
await alice.click('[data-act="select-end"]').catch(() => {});

// ---------- Page d'une publication (Bob) : ordre, pastilles, budget, menu « ⋯ », Créer mon voyage ----------
await goHash(bob, "publication-" + roadId);
await bob.waitForSelector(".post .route", { timeout: 10000 });
const order = await bob.$eval(".post", (e) => [...e.children].map((c) => c.className.split(" ").find((k) => ["post-hero", "map-box", "budget", "route", "recos", "comments"].includes(k)) || c.className));
check(`ordre : en-tête, carte, budget, itinéraire, recommandations, commentaires (${order})`, order.join() === "post-hero,map-box,budget,route,recos,comments");
check("en-tête : auteur, date, cœur, « ⋯ »", !!(await bob.$(".post-top .post-author")) && !!(await bob.$(".post-top .post-date")) && !!(await bob.$('.post-top [data-act="fav-post"]')) && !!(await bob.$("#tripMoreBtn")));
check("plus de « Publié le … · lecture seule »", !(await text(bob)).includes("lecture seule"));
check("bouton principal « Créer mon voyage à partir de celui-ci »", (await bob.$eval('.post-hero [data-act="fork-open"]', (b) => b.className + "|" + b.textContent).catch(() => "")) === "btn primary|Créer mon voyage à partir de celui-ci");
check("trajets en une ligne, sans chevron", (await bob.$$(".transport.is-line.is-public")).length === 3 && !(await bob.$(".transport .stop-chevron")));
check("étapes : Jour, nuits ou Arrêt, sans boutons ni « + »", (await text(bob)).includes("JOUR 1") && (await text(bob)).includes("Arrêt") && !(await bob.$('.post [data-act="edit"], .post [data-act="insert-open"]')));
// Pastille Programme : repliée, puis dépliée jour par jour
check("programme replié par défaut", !(await bob.$(".post .program:not([hidden]) .sj-day")));
await bob.click('.post [data-act="program-toggle"][aria-controls="pg-post-1"]');
await sleep(300);
const prog = await bob.$eval("#pg-post-1", (e) => e.innerText).catch(() => "");
check("pastille Programme : jours, heures, activités, comment y aller", prog.includes("Jour 2") && prog.includes("Tram 28") && prog.includes("Ligne 28 depuis Martim Moniz") && !/à réserver|€/.test(prog));
check("pastille Programme : aria-expanded", (await bob.$eval('[aria-controls="pg-post-1"]', (b) => b.getAttribute("aria-expanded"))) === "true");
// Pastille Recommandations de l'étape
await bob.click('.post [data-act="program-toggle"][aria-controls="reco-post-1"]');
await sleep(300);
check("pastille Recommandations : la reco de l'étape", (await bob.$eval("#reco-post-1", (e) => e.innerText).catch(() => "")).includes("Taberna da Rua"));
// Ouvert pour la session : toujours ouvert après un aller-retour
await goHash(bob, "fil");
await goHash(bob, "publication-" + roadId);
await bob.waitForSelector("#pg-post-1", { timeout: 10000 });
check("pastilles : ouvertes pour la session", !(await bob.$eval("#pg-post-1", (e) => e.hidden)));
// Budget replié puis déplié
check("budget replié en une ligne", (await bob.$eval(".post .budget .b-toggle", (b) => b.getAttribute("aria-expanded") + b.textContent.replace(/\s+/g, " "))).startsWith("false Budget · 623"));
await bob.click(".post .budget .b-toggle");
await sleep(300);
const budget = await bob.$eval(".post .budget", (e) => e.innerText);
check("budget déplié : total, répartition, coût par destination", budget.includes("d'hébergement") && budget.includes("Lisbonne") && budget.includes("412"));
check("budget publié : pas de choix de devise", !(await bob.$(".post #tripCurrency")));
// Menu « ⋯ » d'une publication d'un autre : seulement Copier le lien
await bob.click("#tripMoreBtn");
await bob.waitForSelector("#tripMore .more-item", { visible: true });
check("« ⋯ » d'un autre : Copier le lien seulement", (await bob.$$eval("#tripMore .more-item", (l) => l.map((b) => b.dataset.act).join())) === "copy-link");
await bob.keyboard.press("Escape");
await sleep(200);
check("Échap referme le menu, focus sur « ⋯ »", (await bob.$eval("#tripMore", (e) => e.hidden)) && (await bob.evaluate(() => document.activeElement.id)) === "tripMoreBtn");
await bob.click("#tripMoreBtn");
await bob.waitForSelector('#tripMore [data-act="copy-link"]', { visible: true });
await bob.click('#tripMore [data-act="copy-link"]');
await sleep(500);
check("« ⋯ » → Copier le lien : menu refermé, message affiché", (await bob.$eval("#tripMore", (e) => e.hidden)) && /lien|adresse/i.test(await bob.evaluate(() => document.body.innerText)));
// Créer mon voyage à partir de la publication
await bob.click('.post-hero [data-act="fork-open"]');
await bob.waitForSelector("[data-fork-form]");
await bob.$eval('[data-fork-form] [name="start"]', (e) => (e.value = "2027-05-01"));
await bob.click('[data-fork-form] button[type="submit"]');
await sleep(2000);
check("Créer mon voyage : voyage créé, « Inspiré de »", (await bob.evaluate(() => location.hash)).startsWith("#voyage-") && (await text(bob)).includes("@alice.pub"));

await shots("fr"); // avant la suppression de la publication du séjour, plus bas
// ---------- Ma publication (Alice) : « ⋯ » → Visible par…, Supprimer avec confirmation ----------
await goHash(alice, "publication-" + sejourId);
await alice.waitForSelector("#tripMoreBtn", { timeout: 10000 });
check("ma publication : pas de cœur", !(await alice.$('.post-top [data-act="fav-post"]')));
await alice.click("#tripMoreBtn");
await alice.waitForSelector("#tripMore .more-item", { visible: true });
check("« ⋯ » de ma publication : copier, visibilité, supprimer", (await alice.$$eval("#tripMore .more-item", (l) => l.map((b) => b.dataset.act).join())) === "copy-link,post-vis-open,delete-post");
await alice.click('#tripMore [data-act="post-vis-open"]');
await alice.waitForSelector("[data-post-visibility]");
await alice.select("[data-post-visibility]", "followers");
await sleep(1500);
check("Visible par… : visibilité changée", (await alice.$eval("[data-post-visibility]", (e) => e.value)) === "followers");
check("visibilité limitée : plus de « Copier le lien »", await alice.click("#tripMoreBtn").then(() => sleep(200)).then(() => alice.$$eval("#tripMore .more-item", (l) => !l.some((b) => b.dataset.act === "copy-link"))));
await alice.click('#tripMore [data-act="delete-post"]');
await alice.waitForSelector('[data-act="delete-post-yes"]');
check("Supprimer : même confirmation", (await alice.$eval(".post-hero .confirm", (e) => e.innerText)).includes("Supprimer"));
await alice.click('[data-act="cancel-confirm"]');
await sleep(300);
check("confirmation annulée", !(await alice.$('[data-act="delete-post-yes"]')));
await alice.click("#tripMoreBtn");
await alice.waitForSelector('#tripMore [data-act="delete-post"]', { visible: true });
await alice.click('#tripMore [data-act="delete-post"]');
await alice.click('[data-act="delete-post-yes"]');
await sleep(2500);
check("publication supprimée : retour à Mes publications, une carte", (await alice.evaluate(() => location.hash)) === "#mes-publications" && (await alice.$$(".post-card")).length === 1);

// ---------- Téléphone : cartes et page ----------
// Nouvel onglet de Bob (même compte) : setViewport en mode téléphone rechargerait la page ouverte
const tel = await bob.browserContext().newPage();
await tel.setViewport(PHONE);
await tel.goto(SITE + "#publication-" + roadId);
await tel.waitForSelector(".post .budget", { timeout: 15000 });
check("téléphone : pastilles côte à côte ou l'une sous l'autre, sans se tasser", await tel.$$eval(".post .pg-pill", (l) => l.every((b) => b.scrollWidth <= b.clientWidth + 1)));
await sleep(1500); // la page se réaffiche quand les commentaires arrivent
await tel.$eval(".post .budget .b-toggle", (b) => b.click());
await tel.waitForSelector(".post .b-place-btn");
check("téléphone : budget, destination et total seulement", await tel.$$eval(".post .budget-table thead th", (l) => l.filter((th) => getComputedStyle(th).display !== "none").length) === 2);
await tel.$eval(".post .b-place-btn", (b) => b.click());
await sleep(300);
check("téléphone : détail d'une destination au toucher", await tel.$eval(".post .b-detail", (e) => !e.hidden && e.innerText.includes("312")));
check("téléphone : la page ne défile pas en largeur", await tel.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await tel.goto(SITE + "#decouvrir");
await tel.waitForSelector(".post-card", { timeout: 15000 });
check("téléphone : cartes de Découvrir au même gabarit", (await cardShape(tel)).every((c) => c.stats.length === 3));
await tel.close();

// ---------- En anglais, sans compte ----------
const anonCtx = await browser.createBrowserContext();
const anon = await anonCtx.newPage();
await anon.setViewport(DESK);
await anon.goto(SITE + "#parametres");
await anon.waitForSelector('[name="lang"]', { timeout: 15000 });
await anon.$eval('[name="lang"][value="en"]', (e) => e.click()).catch(() => anon.select('[name="lang"]', "en"));
await sleep(500);
await anon.goto(SITE + "#publication-" + roadId);
await anon.waitForSelector(".post .route", { timeout: 15000 });
await sleep(1500); // la page se réaffiche quand les commentaires arrivent
const en = await text(anon);
check("anglais : bouton, chiffres, pastilles", en.includes("Plan my own trip from this one") && en.includes("3 stops") && en.includes("2 activities") && en.includes("1 recommendation"));
check("anglais : rien de secret, aucune date réelle", !/SECRET/.test(await anon.$eval("#app", (e) => e.innerHTML)) && !REAL_DATES.test(en));
await anon.click("#tripMoreBtn");
await anon.waitForSelector("#tripMore .more-item", { visible: true });
check("anglais : « ⋯ » → Copy the share link", (await anon.$eval("#tripMore .more-item", (e) => e.textContent)) === "Copy the share link");
await anon.keyboard.press("Escape");

if (SHOTS) {
  for (const [vp, name] of [[DESK, "ordi"], [PHONE, "tel"]]) {
    await anon.setViewport(vp);
    await anon.goto(SITE + "#publication-" + roadId);
    await anon.waitForSelector(".post .route", { timeout: 15000 });
    await sleep(1500);
    await anon.screenshot({ path: `${SHOTS}/en-${name}-road.png`, fullPage: true });
  }
}

console.log(problems.length ? problems.join("\n") : "");
console.log(`Publications : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko || problems.length ? 1 : 0);
