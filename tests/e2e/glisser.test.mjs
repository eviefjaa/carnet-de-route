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
  "v-a": { name: "Lyon et Paris", currency: "EUR", createdAt: 2, items: [{ id: "a", type: "stop", place: "Lyon", arrive: "2026-11-02", depart: "2026-11-04" }] },
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
await page.tap(".swipe > .trip-card .tc-link");
await sleep(600);
check("un simple toucher ouvre toujours le voyage", (await page.evaluate(() => location.hash)).startsWith("#voyage-v-"));

console.log(`Glisser pour supprimer : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
