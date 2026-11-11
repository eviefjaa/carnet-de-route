// Dates des activités d'une étape (« À faire et à réserver ») : ajout rapide et formulaire d'étape
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

// Ajout rapide depuis la checklist, avec une date
await page.click('[data-act="toggle-item"][data-id="s1"]');
await page.waitForSelector('[data-act="todo-add"]');
await page.click('[data-act="todo-add"]');
await page.waitForSelector("form[data-todo-form] input[name=date]");
const bounds = await page.$eval("form[data-todo-form] input[name=date]", (e) => e.min + " " + e.max);
check("date bornée par l'étape", bounds === "2030-03-02 2030-03-05");
await page.type("form[data-todo-form] input[name=text]", "Bouchon Daniel et Denise");
await page.$eval("form[data-todo-form] input[name=date]", (e) => { e.value = "2030-03-03"; });
check("case « À réserver » décochée à l'ajout", !(await page.$eval("form[data-todo-form] input[name=book]", (e) => e.checked)));
await page.click("form[data-todo-form] input[name=book]");
await page.$eval("form[data-todo-form]", (f) => f.requestSubmit());
await sleep(300);
let todos = await stored();
check("activité enregistrée avec sa date, à réserver", todos[1] && todos[1].text === "Bouchon Daniel et Denise" && todos[1].date === "2030-03-03" && todos[1].book === true);
check("activité sans date : pas de date inventée", !("date" in todos[0]));
await page.click('[data-act="todo-close"]');
await sleep(200);
const shown = await page.$$eval(".cl-list li", (l) => l.map((li) => (li.querySelector(".cl-date") || {}).textContent || ""));
check("date affichée à côté de l'activité, et seulement là ; l'activité datée passe devant", /3 mars/.test(shown[0]) && shown[1] === "");
if (SHOTS) await (await page.$(".item.stop")).screenshot({ path: SHOTS + "/activites-checklist.png" });

// Formulaire de l'étape : on ajoute une date à l'activité qui n'en avait pas
await page.click('[data-act="edit"][data-id="s1"]');
await page.waitForSelector('form[data-form="stop"] [name="todoDate"]');
check("un champ date par activité dans le formulaire", (await page.$$('form[data-form="stop"] [name="todoDate"]')).length === 2);
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
const byId = (id) => todos.find((x) => x.id === id);
check("date ajoutée depuis le formulaire", byId("a").date === "2030-03-04" && todos.find((x) => x.text.startsWith("Bouchon")).date === "2030-03-03");
// Ordre chronologique : le 3 mars, le 4 mars, puis l'activité sans date
const order = await page.$$eval(".cl-list li label > span:not(.cl-dot)", (l) => l.map((e) => e.textContent.slice(0, 12)).join(" | "));
check("checklist dans l'ordre des dates, sans date à la fin", order === "Bouchon Dani | Musée des Co | Pentes de la");
check("« À réserver » dans l'ordre, sans l'activité qui n'a rien à réserver", (await page.$eval(".to-book", (e) => e.textContent.trim())) === "À réserver : Bouchon Daniel et Denise, Musée des Confluences");
check("activité sans réservation : pas en rouge", (await page.$$eval(".cl-list li", (l) => l.map((li) => li.className).join(","))) === ",,is-free"
  && (await page.$eval(".cl-list li.is-free span", (e) => getComputedStyle(e).color)) !== (await page.$eval(".cl-list li:not(.is-free) span", (e) => getComputedStyle(e).color)));
check("rien à réserver : un point à la place de la case", !!(await page.$(".cl-list li.is-free .cl-dot")) && !(await page.$(".cl-list li.is-free input")));
check("compteur sur les seules activités à réserver", (await page.$eval(".cl-progress", (e) => e.textContent)) === "0/2 réservé");
check("nouvelle ligne du formulaire : rien à réserver", (await stored()).find((x) => x.text.startsWith("Pentes")).book === false);
if (SHOTS) await (await page.$(".item.stop")).screenshot({ path: SHOTS + "/activites-ordre.png" });
await page.click('[data-act="edit"][data-id="s1"]');
await page.waitForSelector('form[data-form="stop"] [name="todoText"]');
// Dans le formulaire, décocher « À réserver » efface la case « réservé » de la ligne
check("formulaire : case « réservé » masquée sans réservation", (await page.$$eval('form[data-form="stop"] [name="todoDone"]', (l) => l.map((e) => getComputedStyle(e).visibility).join(","))) === "visible,visible,hidden");
check("formulaire dans l'ordre des dates", (await page.$$eval('form[data-form="stop"] [name="todoText"]', (l) => l.map((e) => e.value.slice(0, 6)).join(","))) === "Boucho,Musée ,Pentes");

console.log(`Dates des activités : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
