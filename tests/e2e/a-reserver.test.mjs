// Page « À réserver » : la pastille rouge l'ouvre (voyage et Mes voyages), cocher « réservé » sur place,
// « Voir » mène à l'activité dans le programme. Français et anglais, ordinateur et téléphone ;
// voyage dans un compte : une case cochée ailleurs passe en « Réservé » à l'arrivée de la mise à jour.
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8783;
const SITE = `http://localhost:${PORT}/index.html`;
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
const hash = (page) => page.evaluate(() => location.hash);
const DESK = { width: 1366, height: 900 }, PHONE = { width: 390, height: 844, isMobile: true, hasTouch: true };

// Trois activités à réserver : deux à Lisbonne (une datée, une sans date), une à Porto ; plus une déjà
// réservée et une sans réservation, qui ne comptent pas
const TRIP = { name: "Portugal & Galice", currency: "EUR", createdAt: 1, items: [
  { id: "s1", type: "stop", place: "Lisbonne", arrive: "2030-05-10", depart: "2030-05-13", todos: [
    { id: "fado", text: "Fado", book: true },
    { id: "belem", text: "Tour de Belém", date: "2030-05-11", time: "10:00", price: 12, book: true },
    { id: "deja", text: "Déjà réservé", date: "2030-05-10", book: true, done: true },
    { id: "libre", text: "Balade", date: "2030-05-10", book: false }] },
  { id: "t1", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2030-05-13T10:00", arr: "2030-05-13T13:00" },
  { id: "s2", type: "stop", place: "Porto", arrive: "2030-05-13", depart: "2030-05-15", todos: [{ id: "caves", text: "Caves de Gaia", date: "2030-05-14", time: "16:00", book: true }] },
] };

const T = {
  fr: { pill3: "3 choses à réserver", pill2: "2 choses à réserver", card2: "2 à réserver", title: "À réserver", n3: "3 activités", n2: "2 activités", booked: "Réservé",
    all: "Tout est réservé", gone: "Voyage introuvable", g1: "Jour 1 · Lisbonne", g2: "Jour 4 · Porto", aria3: "Voir les 3 activités à réserver", see: "Voir Caves de Gaia dans le programme" },
  en: { pill3: "3 things to book", pill2: "2 things to book", card2: "2 to book", title: "To book", n3: "3 activities", n2: "2 activities", booked: "Booked",
    all: "Everything is booked", gone: "Trip not found", g1: "Day 1 · Lisbonne", g2: "Day 4 · Porto", aria3: "See the 3 activities to book", see: "See Caves de Gaia in the plans" },
};

async function localPage(lang, vp) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`[${lang}] erreur JS : ${e.message}`));
  await page.setViewport(vp);
  await page.goto(SITE + "#voyages");
  await page.evaluate((trip, lang) => {
    localStorage.setItem("carnet-route-trips", JSON.stringify({ "v-pt": trip }));
    localStorage.setItem("carnet-route-prefs", JSON.stringify({ lang }));
  }, TRIP, lang);
  await page.goto(SITE + "#voyage-v-pt");
  await page.reload(); // même adresse, seul le « # » change : on recharge pour relire le voyage enregistré
  await page.waitForSelector(".hero", { timeout: 15000 });
  return page;
}
const tap = (page, sel) => page.$eval(sel, (e) => e.click());

for (const [lang, vp, tag] of [["fr", DESK, "fr ordi"], ["en", PHONE, "en tél"]]) {
  const L = T[lang], k = `[${tag}]`;
  const page = await localPage(lang, vp);
  // ---------- La pastille du voyage ouvre la page ----------
  const pill = await page.$eval(".hero .todo-alert", (a) => ({ tag: a.tagName, text: a.textContent.replace(/\s+/g, " ").trim(), aria: a.getAttribute("aria-label"), h: a.getBoundingClientRect().height,
    hit: parseFloat(getComputedStyle(a, "::before").top) })).catch(() => ({}));
  check(`${k} pastille du voyage : un lien « ${L.pill3} › »`, pill.tag === "A" && pill.text === `${L.pill3} ›` && pill.aria === L.aria3);
  check(`${k} pastille : zone de toucher d'au moins 44 px`, pill.h - 2 * pill.hit >= 44);
  await tap(page, ".hero .todo-alert");
  await page.waitForSelector(".to-book", { timeout: 5000 }).catch(() => {});
  check(`${k} page ouverte (#a-reserver-v-pt), titre`, (await hash(page)) === "#a-reserver-v-pt" && (await page.$eval(".to-book h1", (h) => h.textContent)) === L.title);
  check(`${k} sous-titre : nom du voyage, nombre d'activités`, (await page.$eval(".to-book .lead", (p) => p.textContent)) === `Portugal & Galice · ${L.n3}`);
  check(`${k} étapes dans l'ordre`, (await page.$$eval(".tb-stop h2", (l) => l.map((h) => h.textContent).join("|"))) === `${L.g1}|${L.g2}`);
  check(`${k} Lisbonne : datée d'abord, sans date à la fin`, (await page.$$eval(".tb-stop:first-of-type .tb-text", (l) => l.map((s) => s.textContent).join("|"))) === "Tour de Belém|Fado");
  check(`${k} autant d'activités que la pastille`, (await page.$$(".tb-act")).length === 3);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/a-reserver-${lang}-${vp.width}.png`, fullPage: true });
  // ---------- Cocher : « Réservé », compteur, toujours visible ----------
  await page.click("#todo-belem"); // un vrai clic : la case reçoit aussi le focus
  await sleep(300);
  check(`${k} cochée : « ${L.booked} », barrée, toujours là`, (await page.$eval('[data-tb="belem"]', (li, booked) => li.classList.contains("done") && getComputedStyle(li.querySelector(".tb-booked")).display !== "none" && li.innerText.includes(booked), L.booked)) && (await page.$$(".tb-act")).length === 3);
  check(`${k} compteur à 2, annoncé`, (await page.$eval("#toBookCount", (s) => s.textContent + "|" + s.getAttribute("aria-live"))) === `${L.n2}|polite`);
  check(`${k} le focus reste sur la case`, await page.evaluate(() => document.activeElement && document.activeElement.id === "todo-belem"));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/a-reserver-coche-${lang}-${vp.width}.png`, fullPage: true });
  // Décocher, puis recocher (erreur corrigée sur place)
  await tap(page, "#todo-belem");
  await sleep(200);
  check(`${k} décochée : compteur à 3`, (await page.$eval("#toBookCount", (s) => s.textContent)) === L.n3);
  await tap(page, "#todo-belem");
  await sleep(200);
  // ---------- Retour au voyage : pastille à 2 ; la page rouverte n'a plus que 2 activités ----------
  await tap(page, ".to-book .trip-back");
  await page.waitForSelector(".hero .todo-alert", { timeout: 5000 });
  check(`${k} retour au voyage : « ${L.pill2} »`, (await page.$eval(".hero .todo-alert", (a) => a.textContent.replace(/\s+/g, " ").trim())) === `${L.pill2} ›`);
  await tap(page, ".hero .todo-alert");
  await page.waitForSelector(".to-book");
  check(`${k} rouverte : 2 activités`, (await page.$$(".tb-act")).length === 2 && !(await page.$('[data-tb="belem"]')));
  // ---------- « Voir » : programme de Porto déplié, activité en évidence, focus ----------
  check(`${k} « Voir » : libellé`, (await page.$eval('[data-tb="caves"] .tb-see', (a) => a.getAttribute("aria-label"))) === L.see);
  await tap(page, '[data-tb="caves"] .tb-see');
  await page.waitForSelector(".sj-act.is-flash", { timeout: 3000 }).catch(() => {});
  check(`${k} « Voir » : voyage ouvert, programme de Porto déplié`, (await hash(page)) === "#voyage-v-pt" && !!(await page.$('[data-act="program-toggle"][data-stop="s2"][aria-expanded="true"]')));
  check(`${k} « Voir » : activité en évidence, focus dessus, visible`, await page.evaluate(() => {
    const li = document.querySelector(".sj-act.is-flash"), box = document.getElementById("todo-caves");
    const r = li && li.getBoundingClientRect();
    return !!li && li.contains(box) && document.activeElement === box && r.top >= 0 && r.bottom <= innerHeight;
  }));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/a-reserver-voir-${lang}-${vp.width}.png` });
  // ---------- Mes voyages : la pastille ouvre la page, pas le voyage ; en mode sélection, pas de lien ----------
  await page.evaluate(() => (location.hash = "voyages"));
  await page.waitForSelector(".trip-card .todo-alert", { timeout: 5000 });
  check(`${k} carte de Mes voyages : pastille « ${L.card2} › »`, (await page.$eval(".trip-card .todo-alert", (a) => a.tagName + a.textContent.replace(/\s+/g, " ").trim())) === `A${L.card2} ›`);
  // Un vrai clic au centre de la pastille (pas un clic JS) : c'est elle qui le reçoit, pas le lien de la carte
  const box = await (await page.$(".trip-card .todo-alert")).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(500);
  check(`${k} toucher la pastille ouvre la page à réserver`, (await hash(page)) === "#a-reserver-v-pt");
  await page.evaluate(() => (location.hash = "voyages"));
  await page.waitForSelector('[data-act="select-start"]');
  await tap(page, '[data-act="select-start"]');
  await sleep(200);
  check(`${k} mode sélection : pastille pas cliquable`, (await page.$eval(".trip-card .todo-alert", (a) => a.tagName)) === "SPAN");
  await tap(page, '[data-act="select-end"]');
  // ---------- Tout cocher : « Tout est réservé » ----------
  await page.evaluate(() => (location.hash = "a-reserver-v-pt"));
  await page.waitForSelector(".to-book");
  for (const id of await page.$$eval(".tb-act input", (l) => l.map((i) => i.id))) { await tap(page, "#" + id); await sleep(150); }
  check(`${k} tout coché : « ${L.all} », lien de retour`, (await page.$eval("#toBookDone", (d, all) => !d.hidden && d.innerText.includes(all) && !!d.querySelector('a[href="#voyage-v-pt"]'), L.all)));
  // ---------- Voyage inexistant ----------
  await page.evaluate(() => (location.hash = "a-reserver-nexistepas"));
  await sleep(400);
  // Le message habituel de la page d'un voyage : sans compte, il propose de se connecter (invitation reçue)
  check(`${k} voyage inexistant : « ${L.gone} », comme la page d'un voyage`, (await page.$eval("#app", (e) => e.innerText)).includes(L.gone) && !!(await page.$('#app a[href="#voyages"], #app [data-act="open-auth"]')) && !(await page.$(".to-book")));
  await page.browserContext().close();
}

// ---------- Voyage dans un compte : coché dans un autre onglet, il passe en « Réservé » ici ----------
{
  const ctx = await browser.createBrowserContext();
  const a = await ctx.newPage();
  a.on("pageerror", (e) => problems.push(`[compte] erreur JS : ${e.message}`));
  await a.setViewport(DESK);
  await a.goto(SITE + "?emulateur#voyages");
  await a.waitForSelector('#account [data-act="open-auth"]', { timeout: 15000 });
  await a.click('#account [data-act="open-auth"]');
  await a.click('[data-act="auth-mode"][data-mode="signup"]');
  await a.type("#auth-email", `areserver.${Date.now()}@test.fr`);
  await a.type("#auth-password", "motdepasse123");
  await a.type("#auth-confirm", "motdepasse123");
  await a.click(".auth-submit");
  await a.waitForSelector('[data-act="verify-later"]', { timeout: 15000 });
  await sleep(500);
  await a.$eval('[data-act="verify-later"]', (b) => b.click());
  await sleep(1000);
  const id = await a.evaluate(async (trip) => {
    const store = await import("/js/store.js");
    const id = store.createTrip({ name: trip.name, items: trip.items });
    store.save();
    return id;
  }, TRIP);
  await a.waitForFunction(() => document.querySelector(".sync-badge")?.textContent.includes("Enregistré"), { timeout: 15000 }).catch(() => {});
  const b = await ctx.newPage();
  await b.setViewport(DESK);
  await b.goto(SITE + "?emulateur#a-reserver-" + id);
  await b.waitForSelector(".to-book .tb-act", { timeout: 15000 });
  check("[compte] page « À réserver » du voyage du compte : 3 activités", (await b.$$(".tb-act")).length === 3);
  // Onglet A : coché depuis le programme du voyage (modification normale, synchronisée)
  await a.evaluate((id) => (location.hash = "voyage-" + id), id);
  await a.waitForSelector('[data-act="program-toggle"][data-stop="s2"]', { timeout: 10000 });
  await a.$eval('[data-act="program-toggle"][data-stop="s2"]', (x) => x.click());
  await a.waitForSelector("#todo-caves");
  await a.$eval("#todo-caves", (x) => x.click());
  await b.waitForFunction(() => document.querySelector('[data-tb="caves"]')?.classList.contains("done"), { timeout: 15000 }).catch(() => {});
  check("[compte] cochée dans l'autre onglet : « Réservé » ici, toujours affichée, compteur à 2",
    (await b.$eval('[data-tb="caves"]', (li) => li.classList.contains("done")).catch(() => false)) && (await b.$eval("#toBookCount", (s) => s.textContent)) === "2 activités");
  // Et dans l'autre sens : cochée ici, enregistrée dans le compte
  await b.$eval("#todo-belem", (x) => x.click());
  await a.waitForFunction(() => /1 chose à réserver/.test(document.querySelector(".hero .todo-alert")?.textContent || ""), { timeout: 15000 }).catch(() => {});
  check("[compte] cochée ici : la pastille de l'autre onglet passe à 1", /1 chose à réserver/.test(await a.$eval(".hero .todo-alert", (e) => e.textContent).catch(() => "")));
  await ctx.close();
}

console.log(problems.length ? problems.join("\n") : "");
console.log(`À réserver : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko || problems.length ? 1 : 0);
