// Créer son voyage à partir d'un itinéraire publié, contre les émulateurs Firebase :
// sans compte, avec une date de départ, double clic, publication supprimée entre-temps.
// Lancé par « npm run test:e2e ».
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8772;
const SITE = `http://localhost:${PORT}/index.html?emulateur`;
const DB = "http://127.0.0.1:8181/v1/projects/carnet-de-route-23ffc/databases/(default)/documents";
const CHROME = process.env.CHROME_PATH
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  if (file.endsWith(".html")) return res.end(fs.readFileSync(file, "utf8").replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:*"));
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-sandbox"] });
let ok = 0, ko = 0;
const problems = [];
const check = (label, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (page, fn, ...args) => page.evaluate(fn, ...args);
// Clic au moment même : la page se réaffiche quand les commentaires arrivent
const tap = (page, sel) => page.$eval(sel, (b) => b.click());

async function newPage(name) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 760 });
  page.on("pageerror", (e) => problems.push(`[${name}] erreur JS : ${e.message}`));
  // Pas de recherche de lieux sur internet pendant le test
  await page.setRequestInterception(true);
  page.on("request", (r) => (/nominatim|photon|routing\.openstreetmap|tile\.openstreetmap/.test(r.url()) ? r.respond({ status: 200, contentType: "application/json", body: "[]" }) : r.continue()));
  return page;
}

// ---------- Dan publie un road trip ----------
const dan = await newPage("dan");
await dan.goto(SITE + "#voyages");
await dan.waitForSelector('#account [data-act="open-auth"]', { timeout: 15000 });
await dan.click('#account [data-act="open-auth"]');
await dan.click('[data-act="auth-mode"][data-mode="signup"]');
await dan.type("#auth-email", "dan.route@test.fr");
await dan.type("#auth-password", "motdepasse123");
await dan.type("#auth-confirm", "motdepasse123");
await dan.click(".auth-submit");
await dan.waitForSelector('[data-act="verify-later"]', { timeout: 15000 });
await dan.click('[data-act="verify-later"]');
await sleep(800);
const publishTrip = (title) => run(dan, async (title) => {
  const s = await import("/js/social.js");
  if (!(await import("/js/store.js")).state.profile) await s.saveProfile({ name: "Dan", handle: "dan.route", bio: "", visibility: "public" });
  return s.publish({ name: title, currency: "EUR", country: "PT", items: [
    { id: "a", type: "stop", place: "Lisbonne", country: "Portugal", arrive: "2026-06-01", depart: "2026-06-03", price: 200, notes: "Code porte 1234", todos: [{ id: "t", text: "Tram 28" }] },
    { id: "b", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2026-06-03T09:00", arr: "2026-06-03T12:00", price: 30 },
    { id: "c", type: "stop", place: "Porto", country: "Portugal", arrive: "2026-06-03", depart: "2026-06-05", todos: [] },
  ] }, { title, visibility: "public", recos: [{ kind: "resto", name: "Chez Jo", where: "Alfama", note: "La morue", url: "https://chezjo.pt", stop: 0 }] });
}, title);
const postId = await publishTrip("Portugal en train");

// ---------- Une visiteuse sans compte ----------
const eve = await newPage("eve");
await eve.goto(SITE + "#publication-" + postId);
await eve.waitForSelector('[data-act="fork-open"]', { timeout: 15000 });
check("bouton visible sans compte", true);
await eve.waitForSelector(".comments", { timeout: 10000 }).catch(() => {});
await sleep(500);
if (process.env.SHOTS) await (await eve.$(".post .hero")).screenshot({ path: process.env.SHOTS + "/creer-voyage-bouton.png" });
await tap(eve, '[data-act="fork-open"]');
await eve.waitForSelector("form[data-fork-form]");
check("nom prérempli avec le titre", (await eve.$eval('form[data-fork-form] [name="name"]', (i) => i.value)) === "Portugal en train");
check("explique où le voyage est enregistré", (await eve.$eval("form[data-fork-form]", (f) => f.innerText)).includes("dans ce navigateur"));
await eve.$eval('form[data-fork-form] [name="start"]', (i) => { i.value = "2027-05-01"; });
if (process.env.SHOTS) await (await eve.$("form[data-fork-form]")).screenshot({ path: process.env.SHOTS + "/creer-voyage-form.png" });
// Annuler referme le formulaire
await tap(eve, '[data-act="fork-close"]');
check("Annuler referme le formulaire", !(await eve.$("form[data-fork-form]")) && !!(await eve.$('[data-act="fork-open"]')));
await tap(eve, '[data-act="fork-open"]');
await eve.waitForSelector("form[data-fork-form]");
await eve.$eval('form[data-fork-form] [name="start"]', (i) => { i.value = "2027-05-01"; });
// Double clic : un seul voyage
await eve.$eval('form[data-fork-form] button[type="submit"]', (b) => { b.click(); b.click(); });
await eve.waitForFunction(() => location.hash.startsWith("#voyage-"), { timeout: 10000 }).catch(() => {});
await sleep(800);
const trips = await eve.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips") || "{}"));
const list = Object.values(trips);
check("un seul voyage créé, enregistré dans le navigateur", list.length === 1);
const t = list[0] || { items: [] };
check("page du voyage", (await eve.evaluate(() => location.hash)) === "#voyage-" + Object.keys(trips)[0]);
check("toast", (await eve.$eval("#toast", (x) => x.textContent)) === "Voyage créé à partir de l'itinéraire de @dan.route : à vous de l'adapter");
const [lis, leg, por] = t.items;
check("étapes et trajet dans l'ordre", t.items.map((i) => i.place || i.mode).join(",") === "Lisbonne,train,Porto");
check("dates recalculées", lis.arrive === "2027-05-01" && lis.depart === "2027-05-03" && leg.dep === "2027-05-03" && por.arrive === "2027-05-03" && por.depart === "2027-05-05");
check("pays et devise", t.country === "PT" && t.currency === "EUR");
check("activité reprise, rien à réserver", lis.todos.length === 1 && lis.todos[0].text === "Tram 28" && lis.todos[0].book === false);
check("recommandation dans les notes de l'étape", lis.notes === "Chez Jo (Restaurant), Alfama : La morue" && lis.links[0].url === "https://chezjo.pt/");
check("ni prix ni notes privées de l'auteur", !JSON.stringify(t).includes("1234") && t.items.every((i) => i.price === null));
check("origine enregistrée", t.source && t.source.postId === postId && t.source.ownerHandle === "dan.route");
const srcLink = await eve.$eval(".trip-source a", (a) => [a.textContent, a.getAttribute("href")]).catch(() => []);
check("ligne « Inspiré de… » avec le lien", srcLink[0] === "@dan.route" && srcLink[1] === "#publication-" + postId);
check("le voyage se modifie : étapes affichées", (await eve.$$(".item.stop")).length === 2);
if (process.env.SHOTS) await eve.screenshot({ path: process.env.SHOTS + "/creer-voyage-resultat.png" });

// La publication d'origine n'a pas changé
const raw = await (await fetch(`${DB}/posts/${postId}`, { headers: { Authorization: "Bearer owner" } })).json();
check("publication intacte", raw.fields.title.stringValue === "Portugal en train" && !JSON.stringify(raw).includes("2027"));

// ---------- Sans date de départ ----------
await eve.evaluate((id) => (location.hash = "#publication-" + id), postId);
await eve.waitForSelector('[data-act="fork-open"]', { timeout: 10000 });
await tap(eve, '[data-act="fork-open"]');
await eve.waitForSelector("form[data-fork-form]");
await tap(eve, 'form[data-fork-form] button[type="submit"]');
await sleep(1500);
const t2 = Object.values(await eve.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips")))).find((x) => x !== undefined && !x.items[0].arrive);
check("sans date : étapes sans dates", !!t2 && t2.items.every((i) => !i.arrive && !i.dep));

// ---------- L'auteur voit aussi le bouton ----------
await dan.evaluate((id) => (location.hash = "#publication-" + id), postId);
await dan.waitForSelector('[data-act="fork-open"]', { timeout: 10000 }).catch(() => {});
check("l'auteur voit le bouton", !!(await dan.$('[data-act="fork-open"]')));

// ---------- Publication supprimée pendant l'affichage ----------
const gone = await publishTrip("Bientôt supprimé");
await eve.evaluate((id) => (location.hash = "#publication-" + id), gone);
await eve.waitForSelector('[data-act="fork-open"]', { timeout: 10000 });
await tap(eve, '[data-act="fork-open"]');
await eve.waitForSelector("form[data-fork-form]");
await run(dan, async (id) => (await import("/js/social.js")).deletePost(id), gone);
const before = Object.keys(await eve.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips")))).length;
await tap(eve, 'form[data-fork-form] button[type="submit"]');
await sleep(1500);
check("publication supprimée : message", (await eve.$eval("#toast", (x) => x.textContent)).includes("plus disponible"));
check("publication supprimée : aucun voyage", Object.keys(await eve.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips")))).length === before);

// ---------- Publication sans étape : pas de bouton ----------
const empty = await run(dan, async () => (await import("/js/social.js")).publish({ name: "Vide", currency: "EUR", items: [] }, { title: "Vide", visibility: "public", recos: [] }));
await eve.evaluate((id) => (location.hash = "#publication-" + id), empty);
await eve.waitForSelector(".post h1", { timeout: 10000 });
await sleep(500);
check("sans étape : pas de bouton", !(await eve.$('[data-act="fork-open"]')));

problems.forEach((p) => check(p, false));
console.log(`Voyage à partir d'un itinéraire : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
