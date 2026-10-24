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
  "v-b": { name: "Japon", currency: "JPY", createdAt: 1, items: [] } })));
await page.reload({ waitUntil: "networkidle0" });
await sleep(800);

async function swipe(i, dx) {
  const b = await page.$$eval(".swipe > .trip-card", (l, i) => { const r = l[i].getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, i);
  const y = b.y + b.h / 2, x = b.x + b.w * 0.7;
  await page.touchscreen.touchStart(x, y);
  for (let k = 1; k <= 8; k++) { await page.touchscreen.touchMove(x + (dx * k) / 8, y + 2); await sleep(15); }
  await page.touchscreen.touchEnd();
  await sleep(400);
}
const names = () => page.$$eval(".swipe > .trip-card h2", (l) => l.map((e) => e.textContent.trim()).join(", "));

await swipe(0, -20);
check("petit glissement : rien ne s'ouvre", !(await page.$(".swipe.open")) && (await page.evaluate(() => location.hash)) === "#voyages");
await swipe(0, -150);
check("glissement franc : la poubelle apparaît, le voyage ne s'ouvre pas", !!(await page.$(".swipe.open")) && (await page.evaluate(() => location.hash)) === "#voyages");
await page.tap(".swipe.open .swipe-action");
await sleep(400);
check("confirmation avant suppression", (await page.$eval(".swipe-confirm p", (e) => e.textContent)).includes("Supprimer « Lyon et Paris »"));
await page.tap('[data-act="swipe-cancel"]');
await sleep(400);
check("Annuler garde le voyage", (await names()) === "Lyon et Paris, Japon");
await swipe(0, -150);
await page.tap(".swipe.open .swipe-action");
await sleep(300);
await page.tap('[data-act="swipe-delete-yes"]');
await sleep(600);
check("Supprimer efface le voyage", (await names()) === "Japon" && (await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("carnet-route-trips"))).join(","))) === "v-b");
await page.tap(".swipe > .trip-card .tc-link");
await sleep(600);
check("un simple toucher ouvre toujours le voyage", (await page.evaluate(() => location.hash)) === "#voyage-v-b");

console.log(`Glisser pour supprimer : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
