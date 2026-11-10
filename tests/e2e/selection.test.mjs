// « Mes voyages » : Sélectionner, cocher plusieurs voyages, les supprimer (sans compte)
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8767;
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
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));
await page.goto(`http://localhost:${PORT}/index.html#voyages`, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.setItem("carnet-route-trips", JSON.stringify({
  "v-a": { name: "Lyon et Paris", currency: "EUR", createdAt: 2, items: [{ id: "a", type: "stop", place: "Lyon", arrive: "2030-11-02", depart: "2030-11-04" }] },
  "v-b": { name: "Japon", currency: "JPY", createdAt: 1, items: [] },
  "v-c": { name: "Rome (terminé)", currency: "EUR", createdAt: 0, items: [{ id: "r", type: "stop", place: "Rome", arrive: "2020-05-01", depart: "2020-05-03" }] } })));
await page.reload({ waitUntil: "networkidle0" });
await sleep(800);


const names = () => page.$$eval(".trip-card h2", (l) => l.map((e) => e.textContent.trim()).join(", "));
const barText = () => page.$eval(".select-bar p", (e) => e.textContent.trim());
const stored = () => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("carnet-route-trips"))).sort().join(","));
const tapCard = async (name) => {
  const b = await page.$$eval(".trip-card.is-selectable", (l, name) => {
    const c = l.find((x) => x.querySelector("h2").textContent.trim() === name);
    c.scrollIntoView({ block: "center" }); // la carte peut être sous le bas de l'écran
    const r = c.querySelector(".tc-route").getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, name);
  await page.touchscreen.tap(b.x, b.y);
  await sleep(250);
};

check("bouton Sélectionner présent", !!(await page.$('[data-act="select-start"]')));
await page.click('[data-act="select-start"]');
await sleep(250);
check("mode sélection : une case par voyage, plus de glisser", (await page.$$(".tc-check")).length === 3 && !(await page.$(".swipe")));
check("Supprimer grisé tant que rien n'est coché", await page.$eval('[data-act="select-delete"]', (b) => b.disabled));
check("pas de carte « Nouveau voyage » en mode sélection", !(await page.$(".new-card")));

await tapCard("Lyon et Paris");
await tapCard("Rome (terminé)");
check("toucher une carte la coche sans ouvrir le voyage", (await page.evaluate(() => location.hash)) === "#voyages" && (await page.$$(".trip-card.is-selected")).length === 2);
check("compteur : 2 voyages sélectionnés", (await barText()) === "2 voyages sélectionnés");
await tapCard("Rome (terminé)");
check("toucher à nouveau décoche", (await barText()) === "1 voyage sélectionné");
await page.click('.tc-check[aria-label*="Rome"]'); // click fait défiler jusqu'à la case
await sleep(250);
check("la case elle-même coche aussi", (await barText()) === "2 voyages sélectionnés");

await page.click('[data-act="select-all"]');
await sleep(250);
check("Tout sélectionner", (await barText()) === "3 voyages sélectionnés" && (await page.$eval('[data-act="select-all"]', (b) => b.textContent)) === "Tout désélectionner");
await page.click('[data-act="select-all"]');
await sleep(250);
check("Tout désélectionner", (await barText()) === "Touchez les voyages à supprimer");

await tapCard("Lyon et Paris");
await tapCard("Rome (terminé)");
await page.click('[data-act="select-delete"]');
await sleep(250);
check("confirmation avant suppression", (await barText()).startsWith("Supprimer 2 voyages et tout leur contenu"));
await page.click('[data-act="select-cancel-delete"]');
await sleep(250);
check("Annuler garde les voyages et la sélection", (await stored()) === "v-a,v-b,v-c" && (await barText()) === "2 voyages sélectionnés");

await page.click('[data-act="select-delete"]');
await sleep(200);
await page.click('[data-act="select-delete-yes"]');
await sleep(600);
check("Supprimer efface les voyages cochés, et eux seuls", (await names()) === "Japon" && (await stored()) === "v-b");
check("puis on sort du mode sélection", !(await page.$(".select-bar")) && !!(await page.$('[data-act="select-start"]')) && !!(await page.$(".swipe")));
check("message de confirmation", (await page.$eval("#toast", (t) => t.textContent).catch(() => "")) === "2 voyages supprimés");

await page.click('[data-act="select-start"]');
await sleep(200);
await page.click('[data-act="select-end"]');
await sleep(200);
check("Terminé quitte le mode sélection", !(await page.$(".select-bar")) && !(await page.$(".tc-check")));
await page.click('[data-act="select-start"]');
await sleep(200);
await page.evaluate(() => (location.hash = "#destinations"));
await sleep(300);
await page.evaluate(() => (location.hash = "#voyages"));
await sleep(300);
check("changer de page quitte le mode sélection", !(await page.$(".select-bar")));
// Carte « Nouveau voyage » : la phrase du bas mène aux destinations, le reste de la carte au choix du type
await page.click('.new-card a[href="#destinations"]');
await sleep(300);
check("« inspirez-vous des destinations » mène à Choisir une destination", (await page.evaluate(() => location.hash)) === "#destinations"
  && (await page.$eval("h1", (h) => h.textContent)) === "Choisir une destination");
await page.goBack();
await sleep(300);
{ const r = await page.$eval(".new-card", (c) => { const b = c.getBoundingClientRect(); return { x: b.x + 30, y: b.y + 20 }; }); // coin de la carte, loin du « + »
  await page.mouse.click(r.x, r.y);
  await sleep(400);
  check("le coin de la carte ouvre le choix du type de voyage", (await page.evaluate(() => location.hash)) === "#nouveau-voyage"); }
await page.evaluate(() => (location.hash = "#voyages"));
await sleep(300);
await page.tap(".swipe > .trip-card .tc-link");
await sleep(500);
check("hors sélection, un toucher ouvre toujours le voyage", (await page.evaluate(() => location.hash)).startsWith("#voyage-"));

console.log(`Sélectionner et supprimer : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
