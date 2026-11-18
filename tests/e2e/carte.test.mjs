// Carte d'un voyage qui commence par un vol depuis une ville qui n'est pas une étape (Prague → Brésil)
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";
import { clickInsert } from "./aides.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8768;
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
const browser = forceLang(await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] }), "fr-FR");
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));
// Nominatim simulé : Prague est trouvée sans dépendre du réseau
const asked = [];
await page.setRequestInterception(true);
page.on("request", (req) => {
  if (req.url().startsWith("https://nominatim.openstreetmap.org/")) {
    const q = new URL(req.url()).searchParams.get("q");
    asked.push(q);
    // « Village perdu » : introuvable (étape sans position, grisée dans le bandeau)
    return req.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(q.includes("Village") ? [] : [{ lat: "50.0755", lon: "14.4378" }]) });
  }
  // Suggestions de lieux simulées : rien qui ressemble à « foz de iguazu », Paraty pour « paraty »
  if (req.url().startsWith("https://photon.komoot.io/")) {
    const q = new URL(req.url()).searchParams.get("q");
    const feature = (name) => ({ type: "Feature", properties: { name, osm_key: "place", osm_value: "town", country: "Brésil", countrycode: "BR" }, geometry: { type: "Point", coordinates: [-44.7, -23.2] } });
    return req.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ type: "FeatureCollection", features: [feature(q.startsWith("paraty") ? "Paraty" : "Terminal de bus Puerto Iguazú")] }) });
  }
  if (req.url().startsWith("https://routing.openstreetmap.de/")) return req.respond({ status: 503, body: "" });
  req.continue();
});
await page.goto(`http://localhost:${PORT}/index.html#voyages`, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.setItem("carnet-route-trips", JSON.stringify({
  "v-br": { name: "Brésil", currency: "EUR", createdAt: 1, items: [
    { id: "t1", type: "transport", mode: "avion", from: "Prague", to: "São Paulo", dep: "2030-03-01T10:00", arr: "2030-03-02T06:00" },
    { id: "s1", type: "stop", place: "São Paulo", arrive: "2030-03-02", depart: "2030-03-05", geo: { q: "São Paulo", lat: -23.55, lng: -46.63 } },
    { id: "t2", type: "transport", mode: "voiture", from: "São Paulo", to: "Paraty" },
    { id: "s2", type: "stop", place: "Paraty", arrive: "2030-03-05", depart: "2030-03-08", geo: { q: "Paraty", lat: -23.22, lng: -44.71 } },
  ] } })));
await page.goto(`http://localhost:${PORT}/index.html#voyage-v-br`, { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" }); // relit les voyages enregistrés
await page.waitForFunction(() => {
  const t = JSON.parse(localStorage.getItem("carnet-route-trips"))["v-br"];
  return t.items[0].fromGeo;
}, { timeout: 10000 }).catch(() => {});
await sleep(800);

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips"))["v-br"].items[0]);
check("Prague (départ du vol, sans étape avant) placée automatiquement", stored.fromGeo && Math.abs(stored.fromGeo.lat - 50.0755) < 1e-6 && stored.fromGeo.q === "Prague");
check("São Paulo (arrivée du vol, étape juste après) : pas de recherche inutile", !stored.toGeo && !asked.includes("São Paulo"));
const dashed = await page.$$eval(".leaflet-overlay-pane path", (l) => l.filter((p) => p.getAttribute("stroke-dasharray") === "6 9").length);
check("le vol Prague → São Paulo est dessiné (pointillés)", dashed === 1);
const paths = await page.$$eval(".leaflet-overlay-pane path", (l) => l.length);
check("trois tracés : vol, route, point de départ de Prague", paths === 3);
const note = await page.$eval("#geoNote", (e) => e.textContent).catch(() => "");
check("pas de message « introuvable »", !note.includes("Introuvable"));

// Suggestions : un conseil quand aucune ne correspond à ce qui est tapé
await clickInsert(page, "add-stop", 0);
await page.waitForSelector('form[data-form="stop"] [name="place"]');
const typeIn = async (txt) => {
  await page.$eval('form[data-form="stop"] [name="place"]', (el) => (el.value = ""));
  await page.type('form[data-form="stop"] [name="place"]', txt);
  await page.waitForSelector(".ac-list li", { timeout: 5000 }).catch(() => {});
  await sleep(300);
  return page.$$eval(".ac-list li", (l) => l.map((li) => li.textContent.trim()).join(" | "));
};
check("faute de frappe : conseil d'essayer le nom local", (await typeIn("foz de iguazu")).includes("Essayez le nom local"));
check("bon nom : pas de conseil", !(await typeIn("paraty")).includes("Essayez le nom local"));

// Trajet : l'aéroport de São Paulo trouvé par son code GRU
await page.reload({ waitUntil: "networkidle0" });
await clickInsert(page, "add-leg", 0);
await page.waitForSelector('form[data-form="transport"] [name="from"]');
await page.type('form[data-form="transport"] [name="from"]', "GRU");
await page.waitForFunction(() => [...document.querySelectorAll(".ac-list li")].some((li) => li.textContent.includes("(GRU)")), { timeout: 5000 }).catch(() => {});
const sugg = await page.$$eval(".ac-list li", (l) => l.map((li) => li.textContent.replace(/\s+/g, " ").trim()));
check("GRU proposé en premier, comme aéroport", /São Paulo \(GRU\).*Guarulhos.*Aéroport/.test(sugg[0] || ""));
if (process.env.SHOTS) await page.screenshot({ path: process.env.SHOTS + "/gru.png" });
await page.$eval(".ac-list li[data-i='0']", (li) => li.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
check("le champ prend « São Paulo (GRU) »", (await page.$eval('form[data-form="transport"] [name="from"]', (e) => e.value)) === "São Paulo (GRU)");
await page.type('form[data-form="transport"] [name="to"]', "Paraty");
await page.$eval('form[data-form="transport"]', (f) => f.requestSubmit());
await sleep(400);
const leg = await page.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips"))["v-br"].items.find((i) => i.from === "São Paulo (GRU)"));
check("trajet enregistré avec la position de l'aéroport", leg && leg.fromGeo && Math.abs(leg.fromGeo.lat + 23.43) < 0.01);

// ---------- Plein écran et bandeau des étapes ----------
const SHOTS = process.env.SHOTS;
await page.evaluate(() => {
  const all = JSON.parse(localStorage.getItem("carnet-route-trips"));
  const stop = (id, place, arrive, depart, lat, lng) => ({ id, type: "stop", place, arrive, depart, ...(lat ? { geo: { q: place, lat, lng } } : {}), todos: [] });
  const leg = (id, from, to, dep) => ({ id, type: "transport", mode: "train", from, to, dep, arr: "" });
  all["v-pt"] = { name: "Portugal", currency: "EUR", createdAt: 3, items: [
    stop("a", "Lisbonne", "2030-06-01", "2030-06-03", 38.72, -9.14), leg("l1", "Lisbonne", "Sintra", "2030-06-03T09:00"),
    stop("b", "Sintra", "2030-06-03", "2030-06-03", 38.80, -9.38), leg("l2", "Sintra", "Coimbra", "2030-06-03T15:00"),
    stop("c", "Coimbra", "2030-06-03", "2030-06-04", 40.21, -8.43), leg("l3", "Coimbra", "Porto", "2030-06-04T10:00"),
    stop("d", "Porto", "2030-06-04", "2030-06-07", 41.15, -8.61), stop("e", "Village perdu", "", ""),
    stop("f", "Braga", "2030-06-07", "2030-06-08", 41.55, -8.42)] };
  all["v-sj"] = { name: "Rome", kind: "sejour", currency: "EUR", createdAt: 4, items: [stop("r", "Rome", "2030-07-01", "2030-07-04", 41.9, 12.5)] };
  localStorage.setItem("carnet-route-trips", JSON.stringify(all));
});
await page.goto(`http://localhost:${PORT}/index.html#voyage-v-pt`, { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
await sleep(800);
const full = () => page.evaluate(() => !!document.querySelector(".map-wrap.is-full"));
const openFull = async () => { await page.click(".map-full-btn"); await sleep(600); };
// Page défilée, bouton plein écran visible : le défilement doit être retrouvé à la fermeture
await page.evaluate(() => window.scrollTo(0, document.querySelector(".map-box").getBoundingClientRect().top + window.scrollY - 150));
await sleep(200);
const y0 = await page.evaluate(() => window.scrollY);
const hash0 = await page.evaluate(() => location.hash);
check("bouton plein écran sur la carte", (await page.$eval(".map-full-btn", (b) => b.getAttribute("aria-label"))) === "Afficher la carte en plein écran");
check("pas de bandeau hors plein écran", !(await page.$eval(".map-strip-box", (b) => b.offsetHeight)));
await openFull();
{ const r = await page.$eval(".map-stage", (e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.width, b.height]; });
  check("plein écran : la carte fait la taille de la fenêtre", JSON.stringify(r) === JSON.stringify([0, 0, 375, 760]));
  check("plein écran : fenêtre modale, focus sur ✕", (await page.$eval(".map-stage", (e) => e.getAttribute("role") + e.getAttribute("aria-modal"))) === "dialogtrue"
    && (await page.evaluate(() => document.activeElement.getAttribute("aria-label"))) === "Quitter le plein écran");
  check("plein écran : étapes, tracés et bandeau", (await page.$$(".leaflet-marker-icon.pin")).length === 5 && (await page.$$(".leaflet-overlay-pane path")).length >= 3
    && (await page.$$(".map-strip .ms-stop")).length === 6);
  check("bandeau : nom et « Jour · nuits », étape sans position grisée", JSON.stringify(await page.$$eval(".ms-stop", (l) => l.map((b) => b.innerText.replace(/\s+/g, " ").trim())))
    === JSON.stringify(["1 Lisbonne Jour 1 · 2 nuits", "2 Sintra Jour 3 · arrêt", "3 Coimbra Jour 3 · 1 nuit", "4 Porto Jour 4 · 3 nuits", "5 Village perdu", "6 Braga Jour 7 · 1 nuit"])
    && (await page.$eval('.ms-stop[data-n="5"]', (b) => b.disabled)));
  // Molette : la distance entre deux points change (zoom), ce qui n'arrive pas hors plein écran
  const gap = () => page.$$eval(".leaflet-marker-icon.pin", (l) => { const [a, b] = [l[0], l[3]].map((e) => e.getBoundingClientRect()); return Math.round(Math.hypot(a.left - b.left, a.top - b.top)); });
  const g0 = await gap();
  await page.mouse.move(187, 300);
  await page.mouse.wheel({ deltaY: -300 });
  await sleep(700);
  check("zoom à la molette activé", (await gap()) > g0);
  check("page derrière bloquée", await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden"));
  // Page bloquée au doigt : un glissement vertical déplace la carte, pas la page
  await page.touchscreen.touchStart(180, 300); await page.touchscreen.touchMove(180, 200); await page.touchscreen.touchEnd();
  await sleep(300);
  check("glisser sur la carte ne fait pas défiler la page", (await page.evaluate(() => window.scrollY)) === y0);
  // Bandeau défilable au doigt
  const before = await page.$eval(".map-strip", (s) => s.scrollLeft);
  const sb = await page.$eval(".map-strip", (s) => { const r = s.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.touchStart(sb.x + 100, sb.y);
  for (let k = 1; k <= 8; k++) { await page.touchscreen.touchMove(sb.x + 100 - k * 30, sb.y); await sleep(15); }
  await page.touchscreen.touchEnd();
  await sleep(800);
  check("bandeau défilable au doigt", (await page.$eval(".map-strip", (s) => s.scrollLeft)) > before);
  if (SHOTS) await page.screenshot({ path: SHOTS + "/carte-plein-ecran.png" }); }

// Fermer : ✕, Échap, Retour ; même défilement, même adresse
await page.click(".map-full-btn");
await sleep(400);
check("✕ : fermé, même défilement, même adresse", !(await full()) && (await page.evaluate(() => window.scrollY)) === y0 && (await page.evaluate(() => location.hash)) === hash0
  && (await page.evaluate(() => getComputedStyle(document.body).overflow)) !== "hidden");
check("✕ : focus rendu au bouton plein écran", (await page.evaluate(() => document.activeElement.getAttribute("aria-label"))) === "Afficher la carte en plein écran");
check("✕ : pas d'entrée en trop dans l'historique", (await page.evaluate(() => history.state)) === null);
await openFull();
await page.keyboard.press("Escape");
await sleep(400);
check("Échap ferme le plein écran", !(await full()) && (await page.evaluate(() => location.hash)) === hash0);
await openFull();
await page.goBack();
await sleep(600);
check("Retour ferme le plein écran, même page, même défilement", !(await full()) && (await page.evaluate(() => location.hash)) === hash0 && (await page.evaluate(() => window.scrollY)) === y0);

// Carte → bandeau : toucher un point au doigt (vue d'ensemble, juste après l'ouverture) met son étape en surbrillance
await openFull();
const pt = await page.$$eval(".leaflet-marker-icon.pin", (l) => {
  const e = l.find((m) => m.textContent.trim() === "3");
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.touchscreen.tap(pt.x, pt.y);
await sleep(800);
check("toucher un point : son étape en surbrillance dans le bandeau", (await page.$$eval('.ms-stop[aria-current="true"]', (l) => l.map((b) => b.dataset.n).join(","))) === "3");
// Bandeau → carte : la carte se centre sur l'étape et ouvre sa popup
await page.click('.ms-stop[data-n="4"]');
await sleep(1800);
{ const c = await page.evaluate(async () => { const s = (await import("/js/store.js")).state; return [s.mapActiveStop, document.querySelector(".leaflet-popup-content")?.textContent || ""]; });
  check("toucher une étape du bandeau : popup ouverte, étape en surbrillance", c[0] === 4 && c[1].includes("Porto")
    && (await page.$eval('.ms-stop[data-n="4"]', (b) => b.getAttribute("aria-current"))) === "true");
  const center = await page.evaluate(() => { const p = document.querySelector(".leaflet-popup"); const r = p.getBoundingClientRect(); return r.left + r.width / 2; });
  check("la carte se centre dessus", Math.abs(center - 187) < 40); }
// Redessin pendant le plein écran (modification d'une étape) : rien ne bouge
await page.evaluate(async () => {
  const store = await import("/js/store.js");
  store.state.trips["v-pt"].items[2].place = "Sintra (Pena)";
  store.save();
  (await import("/js/views/trip.js")).render();
});
await sleep(600);
check("redessin : plein écran, bandeau et surbrillance en place", (await full()) && (await page.$$eval(".ms-stop", (l) => l[1].innerText)).includes("Sintra (Pena)")
  && (await page.$$eval('.ms-stop[aria-current="true"]', (l) => l.map((b) => b.dataset.n).join(","))) === "4" && !!(await page.$(".leaflet-popup")));
// Fermer la popup retire la surbrillance
await page.click(".leaflet-popup-close-button");
await sleep(300);
check("fermer la popup retire la surbrillance", !(await page.$('.ms-stop[aria-current="true"]')));
// Masquer puis afficher le bandeau
await page.click(".map-strip-btn");
await sleep(300);
check("masquer les étapes", (await page.$eval(".map-strip-box", (b) => b.hidden)) && (await page.$eval(".map-strip-btn", (b) => b.getAttribute("aria-expanded") + b.getAttribute("aria-label"))) === "falseAfficher les étapes");
if (SHOTS) await page.screenshot({ path: SHOTS + "/carte-sans-bandeau.png" });
await page.click(".map-strip-btn");
await sleep(300);
check("afficher les étapes", !(await page.$eval(".map-strip-box", (b) => b.hidden)) && (await page.$eval(".map-strip-btn", (b) => b.getAttribute("aria-expanded"))) === "true");
// Clavier : flèche droite d'une étape à la suivante
await page.focus('.ms-stop[data-n="1"]');
await page.keyboard.press("ArrowRight");
check("flèche droite : étape suivante", (await page.evaluate(() => document.activeElement.dataset.n)) === "2");
// Changer de page ferme le plein écran
await page.evaluate(() => (location.hash = "#voyage-v-sj"));
await sleep(900);
check("changer de page ferme le plein écran", !(await full()) && (await page.evaluate(() => getComputedStyle(document.body).overflow)) !== "hidden");
// Séjour (une seule étape) : plein écran sans bandeau
await openFull();
check("séjour : plein écran sans bandeau", (await full()) && !(await page.$(".map-strip .ms-stop")) && !(await page.$eval(".map-strip-btn", (b) => b.offsetWidth)));
if (SHOTS) await page.screenshot({ path: SHOTS + "/carte-sejour.png" });
await page.keyboard.press("Escape");
await sleep(300);
// Thème sombre, sur ordinateur
await page.setViewport({ width: 1280, height: 800 });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await page.evaluate(() => (location.hash = "#voyage-v-pt"));
await sleep(900);
await openFull();
check("ordinateur : plein écran", JSON.stringify(await page.$eval(".map-stage", (e) => [e.offsetWidth, e.offsetHeight])) === "[1280,800]");
if (SHOTS) await page.screenshot({ path: SHOTS + "/carte-plein-ecran-sombre.png" });
await page.keyboard.press("Escape");

console.log(`Carte : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
