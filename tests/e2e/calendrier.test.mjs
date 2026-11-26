// Calendrier et choix de l'heure du site sur ordinateur ; sélecteur du système sur téléphone
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8775;
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
await page.setViewport({ width: 1280, height: 900 });
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));
await page.setRequestInterception(true);
page.on("request", (r) => (r.url().startsWith(`http://localhost:${PORT}/`) ? r.continue() : r.respond({ status: 404, body: "" })));
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: "load" });
await page.evaluate(() => localStorage.setItem("carnet-route-trips", JSON.stringify({ v: { name: "Portugal", currency: "EUR", createdAt: 1, items: [
  { id: "a", type: "stop", place: "Lisbonne", arrive: "2030-06-01", depart: "2030-06-03", address: "", notes: "", links: [], price: null, geo: { q: "Lisbonne", lat: 38.7, lng: -9.1 }, todos: [] },
  { id: "t", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2030-06-03", arr: "", company: "", ref: "", url: "", notes: "", price: null },
  { id: "b", type: "stop", place: "Porto", arrive: "2030-06-03", depart: "2030-06-05", address: "", notes: "", links: [], price: null, geo: { q: "Porto", lat: 41.1, lng: -8.6 }, todos: [] }] } })));
await page.goto(`http://localhost:${PORT}/index.html#voyage-v`, { waitUntil: "load" });
await page.reload({ waitUntil: "load" });
await sleep(600);
const edit = (id) => page.evaluate(async (id) => { const s = (await import("/js/store.js")).state; s.editingId = id; (await import("/js/views/trip.js")).render(); }, id);
const dp = () => page.$(".dp");
const days = () => page.$$eval(".dp-day", (l) => l.map((b) => b.dataset.day));

// ---------- Date : un clic sur le champ ouvre le calendrier du site ----------
await edit("a");
await page.waitForSelector("#f-arr-a");
await page.click("#f-arr-a");
await sleep(200);
check("clic sur une date : calendrier du site", !!(await dp()) && (await page.$eval(".dp", (e) => e.getAttribute("role") + "|" + e.getAttribute("aria-label"))) === "dialog|Choisir une date");
check("mois en français, lundi en premier", (await page.$eval(".dp-head b", (e) => e.textContent)) === "juin 2030"
  && (await page.$$eval(".dp-week span", (l) => l.map((e) => e.textContent).join(" "))) === "lun. mar. mer. jeu. ven. sam. dim.");
check("le 1er juin 2030 (un samedi) est sous « sam. »", (await page.$$eval(".dp-grid > *", (l) => l.findIndex((e) => e.dataset && e.dataset.day === "2030-06-01"))) === 5);
check("la date du champ est sélectionnée", (await page.$eval(".dp-day.is-sel", (e) => e.dataset.day)) === "2030-06-01");
check("chaque jour se lit en entier", (await page.$eval('.dp-day[data-day="2030-06-02"]', (e) => e.getAttribute("aria-label"))) === "dimanche 2 juin 2030");
if (SHOTS) await page.screenshot({ path: SHOTS + "/calendrier-clair.png", clip: await page.$eval(".dp", (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX - 20, y: r.y + scrollY - 70, width: r.width + 40, height: r.height + 90 }; }) });
await page.click('.dp-day[data-day="2030-06-02"]');
await sleep(200);
check("choisir un jour : valeur dans le champ, calendrier fermé", (await page.$eval("#f-arr-a", (e) => e.value)) === "2030-06-02" && !(await dp()));
check("le formulaire réagit (nombre de nuits)", (await page.$eval('form[data-form="stop"] [data-nights]', (e) => e.textContent)).includes("1 nuit"));
// Icône au bout du champ : celle du navigateur est masquée (elle ouvrait son propre calendrier par-dessus)
check("icône du site au bout du champ", (await page.$eval("#f-arr-a", (e) => getComputedStyle(e).backgroundImage)).startsWith('url("data:image/svg+xml'));
{ const r = await page.$eval("#f-arr-a", (e) => { const b = e.getBoundingClientRect(); return { x: b.right - 18, y: b.top + b.height / 2 }; });
  await page.mouse.click(r.x, r.y);
  await sleep(200);
  check("clic sur l'icône : notre calendrier", !!(await dp()));
  if (SHOTS) await page.screenshot({ path: SHOTS + "/calendrier-icone.png", clip: await page.$eval("#f-arr-a", (e) => { const b = e.getBoundingClientRect(); return { x: b.x + scrollX - 10, y: b.y + scrollY - 30, width: b.width + 20, height: 380 }; }) });
  await page.keyboard.press("Escape"); }
// Navigation entre les mois
await page.click("#f-arr-a");
await page.click('.dp-nav[data-dp="next"]');
check("mois suivant", (await page.$eval(".dp-head b", (e) => e.textContent)) === "juillet 2030");
await page.click('.dp-nav[data-dp="prev"]');
await page.click('.dp-nav[data-dp="prev"]');
check("mois précédent", (await page.$eval(".dp-head b", (e) => e.textContent)) === "mai 2030");
await page.mouse.click(1200, 880); // ailleurs : se referme
await sleep(150);
check("clic ailleurs : fermé", !(await dp()));

// Bornes : le départ ne peut pas être avant l'arrivée
await page.click("#f-dep-a");
// (l'arrivée vient de passer au 2 juin : le départ ne peut pas être le 1er)
check("jours hors bornes désactivés", (await page.$eval('.dp-day[data-day="2030-06-01"]', (e) => e.disabled)) && (await page.$eval('.dp-day[data-day="2030-06-02"]', (e) => e.disabled)) === false);
await page.keyboard.press("Escape");
await sleep(100);
check("Échap ferme et rend le focus au champ", !(await dp()) && (await page.evaluate(() => document.activeElement.id)) === "f-dep-a");

// ---------- Clavier ----------
await page.focus("#f-arr-a");
await page.keyboard.down("Alt"); await page.keyboard.press("ArrowDown"); await page.keyboard.up("Alt");
await sleep(150);
check("Alt + ↓ ouvre, focus sur le jour choisi", (await page.evaluate(() => document.activeElement.dataset.day)) === "2030-06-02");
await page.keyboard.press("ArrowRight");
await page.keyboard.press("ArrowDown");
check("flèches : d'un jour à l'autre, d'une semaine à l'autre", (await page.evaluate(() => document.activeElement.dataset.day)) === "2030-06-10");
await page.keyboard.press("PageDown");
check("Page ↓ : mois suivant", (await page.evaluate(() => document.activeElement.dataset.day)) === "2030-07-10" && (await page.$eval(".dp-head b", (e) => e.textContent)) === "juillet 2030");
await page.keyboard.press("PageUp");
await page.keyboard.press("Enter");
await sleep(150);
check("Entrée choisit le jour", (await page.$eval("#f-arr-a", (e) => e.value)) === "2030-06-10" && !(await dp()));
// Effacer
await page.click("#f-arr-a");
await page.click('[data-dp="clear"]');
check("Effacer vide le champ", (await page.$eval("#f-arr-a", (e) => e.value)) === "");
// Saisie au clavier dans le champ : toujours possible
await page.focus("#f-arr-a");
await page.keyboard.type("01062030");
check("saisie au clavier dans le champ", (await page.$eval("#f-arr-a", (e) => e.value)) === "2030-06-01");
await page.evaluate(async () => { const s = (await import("/js/store.js")).state; s.editingId = null; (await import("/js/views/trip.js")).render(); });

// ---------- Date et heure (trajet) : il demande l'heure sans l'inventer ----------
await edit("t");
await page.waitForSelector("#t-dep-t");
await page.click("#t-dep-t");
check("date sans heure (voyage tiré d'un itinéraire) : la date est reprise", (await page.$eval(".dp-day.is-sel", (e) => e.dataset.day).catch(() => "")) === "2030-06-03");
check("date et heure : calendrier, case de l'heure, heures et minutes", !!(await page.$(".dp-cal")) && !!(await page.$(".dp-time-input")) && (await page.$eval(".dp-time[data-hour]", (e) => e.textContent)) === "00");
check("24 heures, minutes de 5 en 5", (await page.$$eval(".dp-time[data-hour]", (l) => l.length)) === 24 && (await page.$$eval(".dp-time[data-min]", (l) => l.map((e) => e.dataset.min).join(","))) === "00,05,10,15,20,25,30,35,40,45,50,55");
await page.click('.dp-day[data-day="2030-06-04"]');
await sleep(100);
check("jour choisi sans heure : on demande l'heure, rien d'inventé", !!(await dp()) && (await page.$eval(".dp-times-title", (e) => e.textContent)) === "Choisissez l'heure" && (await page.$eval("#t-dep-t", (e) => e.value)) === "");
check("la case de l'heure est prête à taper", await page.$eval(".dp-time-input", (e) => document.activeElement === e));
if (SHOTS) await page.screenshot({ path: SHOTS + "/calendrier-heure.png", clip: await page.$eval(".dp", (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX - 20, y: r.y + scrollY - 70, width: r.width + 40, height: r.height + 90 }; }) });
await page.click('.dp-time[data-hour="09"]');
await sleep(100);
check("l'heure choisie : valeur déjà écrite (minutes 00), calendrier encore ouvert", (await page.$eval("#t-dep-t", (e) => e.value)) === "2030-06-04T09:00" && !!(await dp()));
await page.click('.dp-time[data-min="30"]');
await sleep(150);
check("puis les minutes : valeur complète, calendrier fermé", (await page.$eval("#t-dep-t", (e) => e.value)) === "2030-06-04T09:30" && !(await dp()));
// Une minute hors liste apparaît dans sa colonne
await page.$eval("#t-dep-t", (e) => { e.value = "2030-06-03T09:07"; });
await page.click("#t-dep-t");
check("minute hors liste : ajoutée et sélectionnée", (await page.$eval(".dp-time.is-sel[data-min]", (e) => e.dataset.min)) === "07" && (await page.$eval(".dp-time.is-sel[data-hour]", (e) => e.dataset.hour)) === "09");
// Heure tapée dans la case : « 25h » refusée, « 555 » donne 05:55
await page.click(".dp-time-input", { clickCount: 3 });
await page.keyboard.type("25h");
await page.keyboard.press("Enter");
await sleep(100);
check("heure impossible : signalée, rien d'écrit", (await page.$eval(".dp-times-title", (e) => e.textContent)) === "Heure non reconnue" && (await page.$eval("#t-dep-t", (e) => e.value)) === "2030-06-03T09:07");
await page.click(".dp-time-input", { clickCount: 3 });
await page.keyboard.type("555");
await page.keyboard.press("Enter");
await sleep(150);
check("heure tapée « 555 » : 05:55, calendrier fermé", (await page.$eval("#t-dep-t", (e) => e.value)) === "2030-06-03T05:55" && !(await dp()));
await page.evaluate(async () => { const s = (await import("/js/store.js")).state; s.editingId = null; (await import("/js/views/trip.js")).render(); });

// ---------- Heure seule (activité) ----------
await page.evaluate(async () => { const s = (await import("/js/store.js")).state; s.openItems = new Set(["a"]); s.actForm = { stop: "a", date: "2030-06-01" }; s.programOpen.add("a"); (await import("/js/views/trip.js")).render(); });
await page.waitForSelector("#act-time-new");
await page.click("#act-time-new");
check("heure seule : case et colonnes, sans calendrier", !(await page.$(".dp-cal")) && !!(await page.$(".dp-cols")) && (await page.$eval(".dp", (e) => e.getAttribute("aria-label"))) === "Choisir une heure");
check("heure seule : la case a le focus", await page.$eval(".dp-time-input", (e) => document.activeElement === e));
await page.click('.dp-time[data-hour="14"]');
await page.click('.dp-time[data-min="30"]');
check("heure choisie", (await page.$eval("#act-time-new", (e) => e.value)) === "14:30");

// ---------- Thème sombre ----------
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await page.click("#act-date-new");
await sleep(150);
check("thème sombre : couleurs du site", (await page.$eval(".dp", (e) => getComputedStyle(e).backgroundColor)) === "rgb(21, 35, 31)");
if (SHOTS) await page.screenshot({ path: SHOTS + "/calendrier-sombre.png", clip: await page.$eval(".dp", (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX - 20, y: r.y + scrollY - 70, width: r.width + 40, height: r.height + 90 }; }) });
await page.keyboard.press("Escape");

// ---------- Téléphone : le sélecteur du système ----------
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true }); // recharge la page
await sleep(800);
await page.evaluate(async () => { const s = (await import("/js/store.js")).state; s.openItems = new Set(["a"]); s.actForm = { stop: "a", date: "2030-06-01" }; s.programOpen.add("a"); (await import("/js/views/trip.js")).render(); });
await page.waitForSelector("#act-date-new");
await page.tap("#act-date-new");
await sleep(200);
check("téléphone : pas de calendrier du site", !(await dp()));

console.log(`Calendrier : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
