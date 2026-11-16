// Programme jour par jour d'une étape de road trip : replié, déplié, ajout un jour donné avec une heure, réservé, formulaire d'étape
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8769;
const CHROME = process.env.CHROME_PATH
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

let ok = 0, ko = 0;
const check = (label, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = process.env.SHOTS;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));
await page.goto(`http://localhost:${PORT}/index.html#voyages`, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.setItem("carnet-route-trips", JSON.stringify({
  "v-ly": { name: "Lyon", currency: "EUR", createdAt: 1, items: [
    { id: "s1", type: "stop", place: "Lyon", arrive: "2030-03-02", depart: "2030-03-05", geo: { q: "Lyon", lat: 45.76, lng: 4.83 },
      todos: [{ id: "a", text: "Musée des Confluences", done: false }] } ] } })));
await page.goto(`http://localhost:${PORT}/index.html#voyage-v-ly`, { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips"))["v-ly"].items[0].todos);

// Programme de l'étape : replié par défaut, sur une ligne
// La pastille est visible sans ouvrir l'étape ; elle ouvre le programme, pas les infos de l'étape
await page.waitForSelector('[data-act="program-toggle"][data-stop="s1"]');
const toggle = '[data-act="program-toggle"][data-stop="s1"]';
const summary = () => page.$eval(toggle, (e) => e.textContent.replace(/\s+/g, " ").trim());
// Les infos de l'étape (où sont « Modifier » et « Supprimer ») : ouvertes au besoin
const openInfos = async () => { if (!(await page.$(".stop-detail"))) { await page.click('[data-act="toggle-item"][data-id="s1"]'); await sleep(200); } };
const stopOpen = () => page.$eval('[data-act="toggle-item"][data-id="s1"]', (e) => e.getAttribute("aria-expanded") === "true");
check("étape repliée : pastille visible, programme fermé", !(await stopOpen()) && (await page.$eval(toggle, (e) => e.getAttribute("aria-expanded"))) === "false"
  && (await summary()) === "Programme · 1 activité · 1 à réserver" && !(await page.$(".program .sj-day")));
check("plus de ligne « À réserver : … »", !(await page.$(".to-book")));
check("« 1 à réserver » en rouge", (await page.$eval(".pg-pending", (e) => getComputedStyle(e).color)) === "rgb(179, 38, 30)");
check("libellé complet de la pastille", (await page.$eval(toggle, (e) => e.getAttribute("aria-label"))) === "Programme de Lyon : 1 activité, 1 à réserver");
check("pastille ajustée au contenu, sur une ligne", await page.$eval(toggle, (e) => { const r = e.getBoundingClientRect(), c = e.closest(".stop").getBoundingClientRect(); return r.width < c.width - 36 && r.height <= 40; }));
if (SHOTS) await (await page.$(".item.stop")).screenshot({ path: SHOTS + "/pastille-repliee.png" });
if (SHOTS) await (await page.$(".item.stop")).screenshot({ path: SHOTS + "/programme-replie.png" });
await page.click(toggle);
await page.waitForSelector(".program .sj-day");
check("pastille : programme ouvert, infos de l'étape toujours fermées", !(await stopOpen()) && !(await page.$(".stop-detail")));
check("focus resté sur la pastille", (await page.evaluate(() => document.activeElement.dataset.act)) === "program-toggle");
check("jours en haut du programme", (await page.$eval(".pg-meta", (e) => e.textContent)) === "Sur 4 jours");
// Les infos de l'étape s'ouvrent aussi, sous le programme
await page.click('[data-act="toggle-item"][data-id="s1"]');
await sleep(200);
check("les deux ouverts : résumé, programme, puis infos de l'étape", await page.$eval(".item.stop", (s) => {
  const a = s.querySelector(".stop-summary"), b = s.querySelector(".program"), c = s.querySelector(".stop-detail");
  return !!(a && b && c) && (a.compareDocumentPosition(b) & 4) && (b.compareDocumentPosition(c) & 4) && !!c.querySelector('[data-act="edit"]');
}));
if (SHOTS) await (await page.$(".item.stop")).screenshot({ path: SHOTS + "/pastille-deux-ouverts.png" });
await page.click('[data-act="toggle-item"][data-id="s1"]');
await sleep(200);
check("refermer les infos : le programme reste", !(await page.$(".stop-detail")) && !!(await page.$(".program .sj-day")));
const titles = () => page.$$eval(".program .sj-day h3", (l) => l.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
check("déplié : un bloc par jour, puis les activités sans jour", (await page.$eval(toggle, (e) => e.getAttribute("aria-expanded"))) === "true"
  && JSON.stringify((await titles()).map((t) => t.slice(0, 6))) === JSON.stringify(["Jour 1", "Jour 2", "Jour 3", "Jour 4", "Pas en"]));

// Ajout un jour donné, avec une heure : le « + » du jour préremplit la date
await page.click('.program [data-act="act-add"][data-date="2030-03-03"]');
await page.waitForSelector("form[data-act-form] input[name=text]");
check("date du jour préremplie, bornée par l'étape", (await page.$eval("form[data-act-form] input[name=date]", (e) => [e.value, e.min, e.max].join(" "))) === "2030-03-03 2030-03-02 2030-03-05");
check("case « À réserver » décochée à l'ajout", !(await page.$eval("form[data-act-form] input[name=book]", (e) => e.checked)));
await page.type("form[data-act-form] input[name=text]", "Bouchon Daniel et Denise");
await page.$eval("form[data-act-form] input[name=time]", (e) => { e.value = "12:30"; });
await page.type("form[data-act-form] input[name=how]", "Métro D");
await page.click("form[data-act-form] input[name=book]");
if (SHOTS) await (await page.$("form[data-act-form]")).screenshot({ path: SHOTS + "/programme-formulaire.png" });
await page.$eval("form[data-act-form]", (f) => f.requestSubmit());
await sleep(300);
let todos = await stored();
check("activité enregistrée avec sa date et son heure, à réserver", todos[1] && todos[1].text === "Bouchon Daniel et Denise" && todos[1].date === "2030-03-03" && todos[1].time === "12:30" && todos[1].how === "Métro D" && todos[1].book === true);
check("activité sans date : pas de date inventée", !("date" in todos[0]));
const dayOf = (text) => page.$$eval(".program .sj-day", (l, text) => (l.find((d) => d.innerText.includes(text)) || {}).ariaLabel || "", text);
check("retrouvée à sa place : Jour 2, avec son heure", (await dayOf("Bouchon")).startsWith("Jour 2") && (await page.$eval(".program .sj-act:not(.is-free) .sj-time", (e) => e.textContent).catch(() => "")) === "12 h 30");
check("le programme reste ouvert après l'ajout", (await page.$eval(toggle, (e) => e.getAttribute("aria-expanded"))) === "true");
// Cocher « réservé »
await page.$$eval(".program .sj-act", (l) => l.find((li) => li.innerText.includes("Bouchon")).querySelector("input[type=checkbox]").click());
await sleep(300);
check("cocher réservé", (await stored()).find((x) => x.text.startsWith("Bouchon")).done === true
  && (await page.$$eval(".program .sj-act.done", (l) => l.map((e) => e.innerText).join(""))).includes("Bouchon"));
if (SHOTS) await (await page.$(".item.stop")).screenshot({ path: SHOTS + "/programme-deplie.png" });
// Replier, au clavier
await page.focus(toggle);
await page.keyboard.press("Enter");
await sleep(200);
check("replier au clavier", (await page.$eval(toggle, (e) => e.getAttribute("aria-expanded"))) === "false" && !(await page.$(".program .sj-day"))
  && (await summary()) === "Programme · 2 activités · 1 à réserver");
await page.focus(toggle);
await page.keyboard.press("Enter");
await sleep(200);

// Formulaire de l'étape : on ajoute une date à l'activité qui n'en avait pas ; heure et « comment y aller » gardés
await openInfos();
await page.click('[data-act="edit"][data-id="s1"]');
await page.waitForSelector('form[data-form="stop"] [name="todoDate"]');
check("un champ date et un champ heure par activité dans le formulaire", (await page.$$('form[data-form="stop"] [name="todoDate"]')).length === 2 && (await page.$$('form[data-form="stop"] [name="todoTime"]')).length === 2);
await page.$eval('#td-date-a', (e) => { e.value = "2030-03-04"; });
// Nouvelle ligne : bornée elle aussi
await page.click('[data-act="add-todo-row"]');
const rowBounds = await page.$$eval('form[data-form="stop"] [name="todoDate"]', (l) => l[2].min + " " + l[2].max);
check("nouvelle ligne bornée par l'étape", rowBounds === "2030-03-02 2030-03-05");
await page.$$eval('form[data-form="stop"] [name="todoText"]', (l) => { l[2].value = "Pentes de la Croix-Rousse"; });
if (SHOTS) await (await page.$('form[data-form="stop"] .todos-edit')).screenshot({ path: SHOTS + "/activites-formulaire.png" });
await page.$eval('form[data-form="stop"]', (f) => f.requestSubmit());
await sleep(300);
todos = await stored();
const bouchon = todos.find((x) => x.text.startsWith("Bouchon"));
check("date ajoutée depuis le formulaire", todos.find((x) => x.id === "a").date === "2030-03-04" && bouchon.date === "2030-03-03");
check("l'heure et « comment y aller » ne sont pas perdus", bouchon.time === "12:30" && bouchon.how === "Métro D" && bouchon.done === true);
// Chaque activité dans son jour
check("programme : chaque activité dans son jour", (await dayOf("Bouchon")).startsWith("Jour 2") && (await dayOf("Musée")).startsWith("Jour 3") && (await dayOf("Pentes")).startsWith("Pas encore"));
check("pastille : ce qui reste à réserver", (await summary()) === "Programme · 3 activités · 1 à réserver");
check("activité sans réservation : pas en rouge", (await page.$eval(".program .sj-act.is-free .sj-text", (e) => getComputedStyle(e).color)) !== (await page.$eval(".program .sj-act:not(.is-free):not(.done) .sj-text", (e) => getComputedStyle(e).color)));
check("rien à réserver : un point à la place de la case", !!(await page.$(".program .sj-act.is-free .cl-dot")) && !(await page.$(".program .sj-act.is-free input")));
check("nouvelle ligne du formulaire : rien à réserver", (await stored()).find((x) => x.text.startsWith("Pentes")).book === false);
await openInfos();
await page.click('[data-act="edit"][data-id="s1"]');
await page.waitForSelector('form[data-form="stop"] [name="todoText"]');
// Dans le formulaire, décocher « À réserver » efface la case « réservé » de la ligne
check("formulaire : case « réservé » masquée sans réservation", (await page.$$eval('form[data-form="stop"] [name="todoDone"]', (l) => l.map((e) => getComputedStyle(e).visibility).join(","))) === "visible,visible,hidden");
check("formulaire dans l'ordre des dates", (await page.$$eval('form[data-form="stop"] [name="todoText"]', (l) => l.map((e) => e.value.slice(0, 6)).join(","))) === "Boucho,Musée ,Pentes");

// Prix d'une activité : dans le programme et dans la colonne « Activités » du budget
await page.click('form[data-form="stop"] [data-act="cancel"]');
await sleep(200);
if (!(await page.$('.program [data-act="act-add"][data-date="2030-03-02"]'))) await page.click(toggle);
await page.click('.program [data-act="act-add"][data-date="2030-03-02"]');
await page.waitForSelector("form[data-act-form] input[name=price]");
check("champ prix : clavier décimal, exemple", (await page.$eval("form[data-act-form] input[name=price]", (e) => e.inputMode + " " + e.placeholder)) === "decimal Ex. 25");
await page.type("form[data-act-form] input[name=text]", "Croisière sur la Saône");
await page.type("form[data-act-form] input[name=price]", "25");
if (SHOTS) await (await page.$("form[data-act-form]")).screenshot({ path: SHOTS + "/prix-formulaire.png" });
await page.$eval("form[data-act-form]", (f) => f.requestSubmit());
await sleep(300);
const priced = () => stored().then((l) => l.find((x) => x.text.startsWith("Croisière")));
check("prix enregistré", (await priced()).price === 25);
const nb = (s) => s.replace(/\s/g, " ");
check("prix affiché dans le programme", nb(await page.$$eval(".program .sj-act", (l) => (l.find((li) => li.innerText.includes("Croisière")).querySelector(".sj-price") || {}).textContent || "")) === "25 €");
check("total des prix en haut du programme, pas dans la pastille", nb(await page.$eval(".pg-meta", (e) => e.textContent)) === "Sur 4 jours · 25 € d'activités" && !(await summary()).includes("€"));
const budgetRow = () => page.$$eval(".budget-table tbody tr", (l) => l.map((tr) => [...tr.children].map((c) => c.textContent.trim())));
const row = (await budgetRow())[0];
check("colonne « Activités » du budget", JSON.stringify((await page.$$eval(".budget-table thead th", (l) => l.map((e) => e.textContent)))) === JSON.stringify(["Destination", "Hébergement", "Transport", "Activités", "Total"])
  && nb(row[3]) === "25 €" && nb(row[4]) === "25 €");
if (SHOTS) await (await page.$(".budget")).screenshot({ path: SHOTS + "/prix-budget.png" });
await openInfos();
await page.click('[data-act="edit"][data-id="s1"]');
await page.waitForSelector('form[data-form="stop"] [name="todoPrice"]');
await page.$eval('form[data-form="stop"]', (f) => f.requestSubmit());
await sleep(300);
check("modifier l'étape ne perd pas le prix", (await priced()).price === 25 && nb((await budgetRow())[0][3]) === "25 €");

// « + Programme » sur une étape vide : le formulaire d'ajout s'ouvre au premier jour
await page.evaluate(async () => {
  const store = await import("/js/store.js");
  store.state.trips["v-ly"].items.push({ id: "s2", type: "stop", place: "Annecy", arrive: "2030-03-05", depart: "2030-03-07", todos: [] });
  store.state.editingId = null;
  store.save();
  (await import("/js/views/trip.js")).render();
});
await page.waitForSelector('.pg-pill.is-empty[data-stop="s2"]');
check("étape vide : « + Programme », discret", (await page.$eval('.pg-pill[data-stop="s2"]', (e) => e.textContent.replace(/\s+/g, " ").trim())) === "+ Programme"
  && (await page.$eval('.pg-pill[data-stop="s2"]', (e) => getComputedStyle(e).backgroundColor)) === "rgba(0, 0, 0, 0)");
await page.click('.pg-pill[data-stop="s2"]');
await page.waitForSelector('form[data-act-form="s2"]');
check("« + Programme » : formulaire d'ajout ouvert au premier jour", (await page.$eval('form[data-act-form="s2"] [name="date"]', (e) => e.value)) === "2030-03-05"
  && (await page.evaluate(() => document.activeElement.name)) === "text");
// Téléphone : aucune pastille ne déborde de sa carte
check("téléphone : pastilles dans leur carte", await page.$$eval(".pg-pill", (l) => l.every((e) => e.getBoundingClientRect().right <= e.closest(".stop").getBoundingClientRect().right - 8)));

console.log(`Programme des étapes : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
