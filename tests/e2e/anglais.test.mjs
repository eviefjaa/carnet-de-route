// Navigateur en anglais : l'interface s'affiche en anglais (aucun mot témoin français),
// puis passage au français dans les paramètres, sans rechargement, et choix gardé (sans compte)
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8771;
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
const browser = forceLang(await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] }), "en-GB");
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));
const warnings = [];
page.on("console", (m) => { if (/Traduction manquante/.test(m.text())) warnings.push(m.text()); });

// Mots qui trahissent un texte resté en français (les données du voyage n'en contiennent aucun)
const FRENCH = /(^|[^\p{L}])(voyages?|étapes?|ajouter|supprimer|modifier|paramètres|jours?|nuits?|réserver|hébergement|trajets?|activités?|enregistrer|annuler|connexion|connectez|mes|vos|votre|pour|avec|sans|aucune?|les?|la|des|du|et|à|où|chargement)(?=$|[^\p{L}])/iu;
// Texte visible (sans les accroches des pays, traduites avec les fiches pays), et aussi libellés lus par les lecteurs d'écran, infobulles et exemples des champs
const pageText = () => page.evaluate(() => [
  document.body.innerText.split("\n").filter((l) => ![...document.querySelectorAll(".cc-tagline")].some((e) => e.innerText.trim() === l.trim())).join("\n"),
  ...[...document.querySelectorAll("[aria-label], [title], [placeholder]")].map((e) => [e.getAttribute("aria-label"), e.getAttribute("title"), e.getAttribute("placeholder")].filter(Boolean).join(" ")),
  document.title,
].join("\n"));
const noFrench = async (label) => {
  const text = await pageText();
  const line = text.split("\n").find((l) => FRENCH.test(l));
  check(`${label} : aucun mot français${line ? ` (« ${line.trim().slice(0, 90)} »)` : ""}`, !line);
};
const open = async (hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await sleep(500);
};

await page.goto(`http://localhost:${PORT}/index.html#voyages`, { waitUntil: "networkidle0" });
check("premier lancement, navigateur en anglais : interface en anglais", await page.evaluate(() => document.documentElement.lang) === "en");
check("accroche du menu en anglais", (await page.$eval("#sidebar", (e) => e.textContent)).includes("Catch the right wind"));
await page.evaluate(() => localStorage.setItem("carnet-route-trips", JSON.stringify({
  "v-a": { name: "Portugal 2030", currency: "EUR", createdAt: 2, items: [
    { id: "a", type: "stop", place: "Lisbon", country: "Portugal", countryCode: "PT", arrive: "2030-06-01", depart: "2030-06-03", price: 240,
      todos: [{ id: "t1", text: "Tram 28", date: "2030-06-02", time: "10:00", price: 3, book: true, done: false, tickets: [] }] },
    { id: "l", type: "transport", mode: "train", from: "Lisbon", to: "Porto", dep: "2030-06-03T09:00", arr: "2030-06-03T12:05", price: 30, tickets: [] },
    { id: "b", type: "stop", place: "Porto", country: "Portugal", countryCode: "PT", arrive: "2030-06-03", depart: "2030-06-05", todos: [] }] },
  "v-b": { name: "Kyoto", kind: "sejour", currency: "JPY", createdAt: 1, items: [{ id: "k", type: "stop", place: "Kyoto", country: "Japon", arrive: "2030-09-01", depart: "2030-09-08", todos: [] }] } })));
await page.reload({ waitUntil: "networkidle0" });
await sleep(800);

await noFrench("Mes voyages");
check("dates au format britannique (jour avant le mois)", /\b1 Jun\b/.test(await page.evaluate(() => document.body.innerText)));
await open("nouveau-voyage");
await noFrench("Nouveau voyage");

await open("voyage-v-a");
await sleep(500);
await noFrench("Page d'un road trip");
check("montant au format britannique", (await page.evaluate(() => document.body.innerText)).includes("€273"));
for (const id of ["a", "l"]) {
  await page.click(`[data-act="toggle-item"][data-id="${id}"]`);
  await sleep(300);
}
await noFrench("Étape et trajet ouverts");
check("heure en 24 h sans « h »", /09:00/.test(await page.evaluate(() => document.body.innerText)));
check("durée en anglais", (await page.evaluate(() => document.body.innerText)).includes("3h 05"));
await page.click('[data-act="edit"][data-id="a"]').catch(() => {});
await sleep(400);
await noFrench("Formulaire d'étape");

await open("voyage-v-b");
await noFrench("Séjour");
check("pays d'une ancienne étape (enregistré en français) affiché en anglais", await page.$eval(".stop-country", (e) => e.textContent.trim()) === "Japan");

for (const [hash, label] of [["destinations", "Destinations"], ["favoris", "Favoris"], ["profil", "Profil"], ["parametres", "Paramètres"],
  ["fil", "Fil"], ["decouvrir", "Découvrir"], ["notifications", "Notifications"], ["mes-publications", "Mes publications"]]) {
  await open(hash);
  await noFrench(label);
}
await open("destinations");
check("noms des pays en anglais", (await page.evaluate(() => document.body.innerText)).includes("Brazil"));

// Fenêtre de connexion
await open("profil");
const auth = await page.$('[data-act="open-auth"]');
if (auth) {
  await auth.click();
  await sleep(300);
  await noFrench("Connexion");
  await page.keyboard.press("Escape");
}

check("aucune traduction manquante signalée", !warnings.length);
if (warnings.length) console.log([...new Set(warnings)].join("\n"));

// Passage au français : sans rechargement (un repère posé dans la page reste), tout est redessiné
await open("parametres");
await page.evaluate(() => { window.__sameLoad = true; });
await page.click("#lang-fr");
await sleep(400);
check("français appliqué sans rechargement", await page.evaluate(() => window.__sameLoad === true && document.documentElement.lang === "fr"));
check("page redessinée en français", await page.$eval("h1", (e) => e.textContent.trim()) === "Paramètres");
check("accroche du menu en français", (await page.$eval("#sidebar", (e) => e.textContent)).includes("Prenez le bon vent"));
check("titre de l'onglet en français", (await page.title()).startsWith("Paramètres"));
check("choix enregistré", await page.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-prefs")).lang) === "fr");
await page.reload({ waitUntil: "networkidle0" });
await sleep(500);
check("choix gardé au rechargement malgré le navigateur en anglais", await page.evaluate(() => document.documentElement.lang) === "fr"
  && await page.$eval("h1", (e) => e.textContent.trim()) === "Paramètres");
await page.click("#lang-en");
await sleep(400);
check("retour à l'anglais", await page.$eval("h1", (e) => e.textContent.trim()) === "Settings");

console.log(`Anglais : ${ok} réussis, ${ko} échoués.`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
