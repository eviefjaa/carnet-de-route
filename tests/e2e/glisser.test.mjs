// Glisser une carte de « Mes voyages » vers la gauche : poubelle, confirmation, suppression (sans compte)
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8766;
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

// hold : le doigt s'arrête avant de se lever (pas d'élan)
async function swipe(i, dx, steps = 8, pause = 15, hold = 0) {
  const b = await page.$$eval(".swipe > .trip-card", (l, i) => { const r = l[i].getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, i);
  const y = b.y + b.h / 2, x = b.x + b.w * 0.7;
  await page.touchscreen.touchStart(x, y);
  for (let k = 1; k <= steps; k++) { await page.touchscreen.touchMove(x + (dx * k) / steps, y + 2); await sleep(pause); }
  if (hold) await sleep(hold);
  await page.touchscreen.touchEnd();
  await sleep(900); // fin du défilement aimanté
}
const names = () => page.$$eval(".swipe > .trip-card h2", (l) => l.map((e) => e.textContent.trim()).join(", "));
const trashVisible = () => page.$$eval(".swipe", (l) => l.filter((b) => b.scrollLeft > 2).length);

check("au repos, aucune poubelle rouge visible (voyage terminé compris)", (await trashVisible()) === 0);
// Geste court : la carte s'aimante sur « ouvert » (l'élan d'un vrai doigt ne se simule pas ici)
await swipe(0, -100, 4, 10);
check("geste court : la poubelle s'aimante ouverte", !!(await page.$(".swipe.open")));
// Toucher la carte ouverte : elle se referme, sans ouvrir le voyage
{ const b = await page.$eval(".swipe.open > .trip-card", (c) => { const r = c.getBoundingClientRect(); return { x: Math.max(r.x, 0) + 40, y: r.y + r.height / 2 }; }); // partie visible de la carte
  await page.touchscreen.tap(b.x, b.y); await sleep(900); }
check("toucher la carte ouverte la referme", !(await page.$(".swipe.open")) && (await page.evaluate(() => location.hash)) === "#voyages");

await swipe(0, -20, 8, 15, 400);
check("petit glissement hésitant : la carte reste fermée", !(await page.$(".swipe.open")) && (await page.evaluate(() => location.hash)) === "#voyages");
await swipe(0, -150);
check("glissement franc : la poubelle apparaît, le voyage ne s'ouvre pas", !!(await page.$(".swipe.open")) && (await page.evaluate(() => location.hash)) === "#voyages");
await page.click(".swipe.open .swipe-action");
await sleep(400);
check("confirmation avant suppression", (await page.$eval(".swipe-confirm p", (e) => e.textContent)).includes("Supprimer « Lyon et Paris »"));
await page.click('[data-act="swipe-cancel"]');
await sleep(400);
check("Annuler garde le voyage", (await names()).startsWith("Lyon et Paris, Japon"));
await swipe(0, -150);
await page.click(".swipe.open .swipe-action");
await sleep(300);
await page.click('[data-act="swipe-delete-yes"]');
await sleep(600);
check("Supprimer efface le voyage", !(await names()).includes("Lyon") && !(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("carnet-route-trips"))))).includes("v-a"));
// ---------- Deux cartes : une seule ouverte, sans saut ni va-et-vient ----------
const lefts = () => page.$$eval(".swipe", (l) => l.map((b) => Math.round(b.scrollLeft)));
const openCount = () => page.$$eval(".swipe", (l) => l.filter((b) => b.scrollLeft > 44).length);
const closeAll = async () => { await page.$$eval(".swipe", (l) => l.forEach((b) => b.scrollTo({ left: 0 }))); await sleep(400); };
const centerOf = (i) => page.$$eval(".swipe > .trip-card", (l, i) => { const r = l[i].getBoundingClientRect(); return { x: r.x + r.width * 0.7, y: r.y + r.height / 2 }; }, i);

await swipe(0, -150);
await swipe(1, -150);
{ const l = await lefts();
  check("ouvrir A puis balayer B : B ouverte, A fermée", l[0] === 0 && l[1] > 44); }
await sleep(1000);
{ const l = await lefts();
  check("B ne se referme pas après l'animation", l[0] === 0 && l[1] > 44); }

// Deux doigts presque en même temps. Chrome (émulation) ne fait défiler que la première carte,
// le second doigt comptant comme un pincement : on vérifie qu'il n'en reste qu'une, immobile.
await closeAll();
{ const a = await centerOf(0), b = await centerOf(1);
  const fa = await page.touchscreen.touchStart(a.x, a.y);
  await sleep(30);
  const fb = await page.touchscreen.touchStart(b.x, b.y);
  for (let k = 1; k <= 8; k++) {
    await fa.move(a.x - (150 * k) / 8, a.y + 2);
    await fb.move(b.x - (150 * k) / 8, b.y + 2);
    await sleep(15);
  }
  await fa.end();
  await fb.end();
  await sleep(1000);
  const l1 = await lefts();
  await sleep(1000);
  const l2 = await lefts();
  check("deux doigts : une seule carte ouverte", l2.filter((x) => x > 44).length === 1);
  check("deux doigts : plus aucun mouvement après 1 s", JSON.stringify(l1) === JSON.stringify(l2)); }

// Sur un vrai téléphone, les deux cartes peuvent défiler ensemble : doigts posés sur A puis B,
// et les deux bandeaux défilent en même temps (comme le défilement natif, événement par événement)
await closeAll();
{ const a = await centerOf(0), b = await centerOf(1);
  const fa = await page.touchscreen.touchStart(a.x, a.y);
  await sleep(30);
  const fb = await page.touchscreen.touchStart(b.x, b.y);
  await page.$$eval(".swipe", (l) => l.forEach((x) => (x.style.scrollSnapType = "none")));
  for (let k = 1; k <= 11; k++) {
    await page.$$eval(".swipe", (l, k) => { l[0].scrollLeft = k * 8; l[1].scrollLeft = k * 8; }, k);
    await sleep(20);
  }
  await page.$$eval(".swipe", (l) => l.forEach((x) => (x.style.scrollSnapType = "")));
  const during = await lefts();
  await fa.end();
  await fb.end();
  await sleep(1000);
  const l1 = await lefts();
  await sleep(1000);
  const l2 = await lefts();
  check("deux cartes qui défilent ensemble : aucune refermée sous le doigt", during[0] > 44 && during[1] > 44);
  check("doigts levés : seule la dernière touchée (B) reste ouverte", l2[0] === 0 && l2[1] > 44);
  check("aucune oscillation après 1 s", JSON.stringify(l1) === JSON.stringify(l2)); }

// Confirmation sur A, balayage de B : la confirmation est annulée, rien n'est supprimé
await closeAll();
await swipe(0, -150);
await page.click(".swipe.open .swipe-action");
await sleep(400);
check("confirmation affichée sur A", !!(await page.$(".swipe-confirm")));
const before = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("carnet-route-trips"))).length);
await swipe(1, -150);
await sleep(500);
check("balayer B annule la confirmation", !(await page.$(".swipe-confirm")) && (await page.$$(".swipe")).length === 2);
check("aucun voyage supprimé", (await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("carnet-route-trips"))).length)) === before);
check("B reste ouverte, A fermée", JSON.stringify((await lefts()).map((x) => x > 44)) === "[false,true]");
await closeAll();

// À la souris : glisser A puis B, seule B reste ouverte
async function drag(i) {
  const c = await centerOf(i);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (let k = 1; k <= 8; k++) { await page.mouse.move(c.x - (120 * k) / 8, c.y); await sleep(15); }
  await page.mouse.up();
  await sleep(900);
}
// (écran d'ordinateur, sans tactile : en émulation téléphone la souris devient un doigt)
await page.setViewport({ width: 375, height: 760 });
await sleep(500);
await drag(0);
check("souris : la carte glissée reste ouverte", JSON.stringify((await lefts()).map((x) => x > 44)) === "[true,false]");
await drag(1);
await sleep(1000);
check("souris : B ouverte, A refermée", JSON.stringify((await lefts()).map((x) => x > 44)) === "[false,true]");
await closeAll();
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
await sleep(500);

await page.tap(".swipe > .trip-card .tc-link");
await sleep(600);
check("un simple toucher ouvre toujours le voyage", (await page.evaluate(() => location.hash)).startsWith("#voyage-v-"));

console.log(`Glisser pour supprimer : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
