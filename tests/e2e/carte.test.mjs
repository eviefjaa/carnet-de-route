// Carte d'un voyage qui commence par un vol depuis une ville qui n'est pas une étape (Prague → Brésil)
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 375, height: 760, isMobile: true, hasTouch: true });
page.on("pageerror", (e) => check(`erreur JS : ${e.message}`, false));
// Nominatim simulé : Prague est trouvée sans dépendre du réseau
const asked = [];
await page.setRequestInterception(true);
page.on("request", (req) => {
  if (req.url().startsWith("https://nominatim.openstreetmap.org/")) {
    asked.push(new URL(req.url()).searchParams.get("q"));
    return req.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify([{ lat: "50.0755", lon: "14.4378" }]) });
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
await page.click('[data-act="add-stop"]');
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

console.log(`Carte : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
