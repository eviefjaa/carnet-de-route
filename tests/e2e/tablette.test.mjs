// Tablette (iPad) : menu fixe à l'horizontale, menu tiroir à la verticale, rotation, survol collant
import puppeteer, { KnownDevices } from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8774;
const CHROME = process.env.CHROME_PATH
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
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
const browser = forceLang(await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] }), "fr-FR");
const page = await browser.newPage();
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));

const state = () => page.evaluate(() => {
  const sb = document.getElementById("sidebar").getBoundingClientRect();
  const foot = document.querySelector(".side-foot").getBoundingClientRect();
  const center = document.elementFromPoint(innerWidth * 0.75, innerHeight / 2);
  return {
    drawer: getComputedStyle(document.getElementById("menuBtn")).display !== "none",
    menuIn: sb.left >= 0 && sb.right > 0, open: document.getElementById("sidebar").classList.contains("open"),
    scrim: !document.getElementById("scrim").hidden, locked: getComputedStyle(document.body).overflow === "hidden",
    footIn: foot.bottom <= innerHeight + 0.5 && foot.top >= 0, sbHeight: Math.round(sb.height), h: innerHeight,
    pageClickable: !!center && !center.closest("#scrim, #sidebar"),
  };
});
const setDevice = async (name) => { await page.emulate(KnownDevices[name]); await sleep(500); };

for (const dev of ["iPad (gen 7)", "iPad Pro 11", "iPad Mini"]) {
  // ---------- À l'horizontale : menu fixe, entièrement visible ----------
  await setDevice(dev + " landscape");
  await page.goto(`http://localhost:${PORT}/index.html#destinations`, { waitUntil: "networkidle0" });
  await sleep(400);
  let s = await state();
  check(`${dev} paysage : menu fixe, sans ☰`, !s.drawer && s.menuIn);
  check(`${dev} paysage : le bas du menu (compte) est dans la fenêtre`, s.footIn && s.sbHeight === s.h);
  check(`${dev} paysage : survol désactivé (écran tactile)`, await page.evaluate(() => !matchMedia("(hover: hover)").matches));
  check(`${dev} paysage : champs en 16 px (pas de zoom de Safari)`, (await page.$eval("input.search", (e) => getComputedStyle(e).fontSize)) === "16px");
  if (SHOTS && dev === "iPad (gen 7)") await page.screenshot({ path: `${SHOTS}/ipad-paysage.png` });

  // ---------- À la verticale : menu tiroir ----------
  await setDevice(dev);
  s = await state();
  check(`${dev} portrait : bouton ☰, menu caché`, s.drawer && !s.menuIn && !s.scrim);
  await page.tap("#menuBtn");
  await sleep(400);
  s = await state();
  check(`${dev} portrait : menu ouvert par-dessus, page bloquée`, s.open && s.scrim && s.locked && s.footIn);
  // La page derrière ne défile pas (glissement sur le voile)
  const y0 = await page.evaluate(() => scrollY);
  await page.touchscreen.touchStart(700, 700);
  for (let k = 1; k <= 8; k++) { await page.touchscreen.touchMove(700, 700 - k * 50); await sleep(15); }
  await page.touchscreen.touchEnd();
  await sleep(400);
  check(`${dev} portrait : la page derrière ne défile pas`, (await page.evaluate(() => scrollY)) === y0);
  if (SHOTS && dev === "iPad (gen 7)") await page.screenshot({ path: `${SHOTS}/ipad-portrait-menu.png` });

  // ---------- Rotation, menu ouvert : vers l'horizontale ----------
  await setDevice(dev + " landscape");
  s = await state();
  check(`${dev} rotation (menu ouvert) → paysage : ni voile ni blocage`, !s.open && !s.scrim && !s.locked && s.pageClickable && s.menuIn);
  // Et l'inverse : rien d'ouvert en revenant à la verticale
  await setDevice(dev);
  s = await state();
  check(`${dev} rotation → portrait : menu fermé, page utilisable`, !s.open && !s.scrim && !s.locked && !s.menuIn && s.pageClickable);
  // Menu ouvert à la verticale, puis on tourne deux fois : toujours utilisable
  await page.tap("#menuBtn");
  await sleep(300);
  await setDevice(dev + " landscape");
  await setDevice(dev);
  s = await state();
  check(`${dev} aller-retour de rotation : rien de bloqué`, !s.open && !s.scrim && !s.locked && s.pageClickable);

  // ---------- Toucher un lien du menu : il ne reste pas en surbrillance ----------
  await page.tap("#menuBtn");
  await sleep(300);
  await page.tap('.nav-link[href="#favoris"]');
  await sleep(500);
  s = await state();
  check(`${dev} lien touché : le menu se ferme`, !s.open && !s.scrim && !s.locked);
  await page.tap("#menuBtn");
  await sleep(300);
  // L'ancien lien, touché juste avant (« Choisir une destination ») : plus de fond de survol
  const bg = await page.$eval('.nav-link[href="#destinations"]', (e) => getComputedStyle(e).backgroundColor);
  check(`${dev} : aucun lien en surbrillance après un toucher`, bg === "rgba(0, 0, 0, 0)");
  await page.tap("#scrim");
  await sleep(300);
}

// ---------- Ordinateur : rien ne change, le survol fonctionne ----------
await page.emulate({ viewport: { width: 1280, height: 800 }, userAgent: await browser.userAgent() });
await page.goto(`http://localhost:${PORT}/index.html#destinations`, { waitUntil: "networkidle0" });
await page.hover('.nav-link[href="#favoris"]');
await sleep(200);
check("ordinateur : le survol colore le lien", (await page.$eval('.nav-link[href="#favoris"]', (e) => getComputedStyle(e).backgroundColor)) !== "rgba(0, 0, 0, 0)");
check("ordinateur : champs dans leur taille normale", (await page.$eval("input.search", (e) => getComputedStyle(e).fontSize)) !== "16px");

console.log(`Tablette : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
