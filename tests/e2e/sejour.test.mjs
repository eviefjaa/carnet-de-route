// Séjour : choix du type à la création, lieu, programme jour par jour, aller et retour
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8770;
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
await page.setRequestInterception(true);
page.on("request", (req) => {
  const u = req.url();
  const json = (body) => req.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) });
  if (u.startsWith("https://photon.komoot.io/")) return json({ type: "FeatureCollection", features: [{ type: "Feature",
    properties: { name: "Paris", osm_key: "place", osm_value: "city", country: "France", state: "Île-de-France" }, geometry: { type: "Point", coordinates: [2.35, 48.85] } }] });
  if (u.startsWith("https://nominatim.openstreetmap.org/")) return json([{ lat: "45.76", lon: "4.83" }]);
  if (u.startsWith("https://routing.openstreetmap.de/")) return req.respond({ status: 503, body: "" });
  req.continue();
});
const trips = () => page.evaluate(() => JSON.parse(localStorage.getItem("carnet-route-trips") || "{}"));
const one = async () => Object.values(await trips())[0];
const days = () => page.$$eval(".sj-day", (l) => l.map((d) => d.querySelector("h3").textContent.replace(/\s+/g, " ").trim() + " = " + [...d.querySelectorAll(".sj-act")].map((a) => a.textContent.replace(/\s+/g, " ").trim().slice(0, 20)).join(" / ")));
const click = async (sel) => { await page.waitForSelector(sel); await page.$eval(sel, (el) => el.scrollIntoView({ block: "center" })); await page.click(sel); await sleep(150); };

// 1. Le choix du type de voyage
await page.goto(`http://localhost:${PORT}/index.html#voyages`, { waitUntil: "networkidle0" });
await click('[data-act="new-trip"]');
await page.waitForSelector(".kind-card");
check("page de choix à l'adresse #nouveau-voyage", (await page.evaluate(() => location.hash)) === "#nouveau-voyage");
check("deux choix : road trip et séjour", (await page.$$eval(".kind-card b", (l) => l.map((b) => b.textContent).join(" | "))) === "Road trip | Séjour");
check("rien n'est créé avant le choix", !Object.keys(await trips()).length);
if (SHOTS) await page.screenshot({ path: SHOTS + "/sejour-choix.png" });

// 2. Séjour : le formulaire du lieu est ouvert d'office, sans bouton Annuler
await click('[data-act="create-trip"][data-kind="sejour"]');
await page.waitForSelector('form[data-form="stop"][data-sejour]');
check("voyage créé en séjour", (await one()).kind === "sejour");
check("formulaire du lieu ouvert, sans Annuler ni checklist", !(await page.$('form[data-form="stop"] [data-act="cancel"]')) && !(await page.$('form[data-form="stop"] [data-todos]')));
await page.type('form[data-form="stop"] [name="place"]', "Paris");
await page.waitForSelector(".ac-list li[data-i]", { timeout: 5000 });
await page.$eval(".ac-list li[data-i='0']", (li) => li.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
await page.$eval('form[data-form="stop"] [name="arrive"]', (e) => { e.value = "2030-05-01"; });
await page.$eval('form[data-form="stop"] [name="depart"]', (e) => { e.value = "2030-05-04"; });
await page.$eval('form[data-form="stop"] [name="address"]', (e) => { e.value = "12 rue des Martyrs"; });
await page.$eval('form[data-form="stop"] [name="arriveTime"]', (e) => { e.value = "15:00"; });
await page.$eval('form[data-form="stop"] [name="departTime"]', (e) => { e.value = "11:30"; });
if (SHOTS) await (await page.$('form[data-form="stop"]')).screenshot({ path: SHOTS + "/sejour-heures-form.png" });
await page.$eval('form[data-form="stop"]', (f) => f.requestSubmit());
await sleep(300);
check("le séjour prend le nom du lieu", (await one()).name === "Paris");
check("quatre jours au programme", (await page.$$(".sj-day")).length === 4);
{ const s = (await one()).items.find((i) => i.type === "stop");
  check("heures d'arrivée et de départ enregistrées", s.arriveTime === "15:00" && s.departTime === "11:30"); }
check("carte du lieu : dates avec les heures", /, 15 h 00 → .*, 11 h 30/.test(await page.$eval(".stop .dates", (e) => e.textContent.replace(/\s+/g, " "))));
check("arrivée au jour 1, départ au jour 4", (await page.$$eval(".sj-day", (l) => l.map((d) => [...d.querySelectorAll(".sj-move")].map((m) => m.textContent.replace(/\s+/g, " ").trim()).join("")).join("|"))) === "15 h 00Arrivée|||11 h 30Départ");check("parties aller, lieu, programme, retour", (await page.$$eval(".sj-title", (l) => l.map((h) => h.textContent).join(" | "))) === "Aller | Le lieu | Programme jour par jour | Retour");

// 3. Activités du jour 2, rangées par heure
const addAct = async (day, text, time, how = "", maps = "") => {
  await click(`[data-act="act-add"][data-date="${day}"]`);
  await page.waitForSelector("form[data-act-form] [name=text]");
  check(`jour pré-rempli (${day})`, (await page.$eval("form[data-act-form] [name=date]", (e) => e.value)) === day);
  await page.type("form[data-act-form] [name=text]", text);
  await page.$eval("form[data-act-form] [name=time]", (e, v) => { e.value = v; }, time);
  if (how) await page.type("form[data-act-form] [name=how]", how);
  if (maps) await page.type("form[data-act-form] [name=maps]", maps);
  await page.$eval("form[data-act-form]", (f) => f.requestSubmit());
  await sleep(250);
};
await addAct("2030-05-02", "Musée du Louvre", "10:00", "Métro 1, arrêt Palais-Royal", "https://maps.app.goo.gl/louvre");
await addAct("2030-05-02", "Petit-déjeuner au café", "08:30");
let d = await days();
check("jour 2 : par ordre d'heure", /^Jour 2.*= 08 h 30 Petit-déj.* \/ 10 h 00 Musée du Lo/.test(d[1]));
await addAct("2030-05-04", "Croissants chez Stohrer", "09:00");
await addAct("2030-05-04", "Dernier tour à Montmartre", "13:00");
check("jour 4 : le départ se range entre les activités", (await page.$$eval(".sj-day:nth-of-type(4) .sj-acts > li", (l) => l.map((x) => x.querySelector("time")?.textContent).join(" "))).replace(/\s+/g, "") === "09h0011h3013h00");
if (SHOTS) await (await page.$$(".sj-day"))[3].screenshot({ path: SHOTS + "/sejour-depart.png" });
{ const s = (await one()).items.find((i) => i.type === "stop");
  await page.evaluate(async (ids) => { for (const id of ids) document.querySelector(`[data-act="todo-del"][data-todo="${id}"]`).click(); }, s.todos.filter((x) => x.date === "2030-05-04").map((x) => x.id));
  await sleep(300); }
check("comment y aller affiché", (await page.$eval(".sj-day:nth-of-type(2), .sj-how", (e) => e.textContent)).includes("Métro 1, arrêt Palais-Royal"));
let stop = (await one()).items.find((i) => i.type === "stop");
const louvre = stop.todos.find((x) => x.text === "Musée du Louvre");
check("activité enregistrée complète", louvre.date === "2030-05-02" && louvre.time === "10:00" && louvre.how === "Métro 1, arrêt Palais-Royal" && louvre.maps === "https://maps.app.goo.gl/louvre");
check("pas de champ vide enregistré", !("how" in stop.todos.find((x) => x.text === "Petit-déjeuner au café")));
if (SHOTS) await (await page.$$(".sj-day"))[1].screenshot({ path: SHOTS + "/sejour-jour.png" });

// 4. Modifier : le Louvre passe au jour 3
await click(`[data-act="act-edit"][data-todo="${louvre.id}"]`);
check("formulaire de modification pré-rempli", (await page.$eval("form[data-act-form] [name=how]", (e) => e.value)) === "Métro 1, arrêt Palais-Royal");
await page.$eval("form[data-act-form] [name=date]", (e) => { e.value = "2030-05-03"; });
await page.$eval("form[data-act-form] [name=how]", (e) => { e.value = ""; });
await page.$eval("form[data-act-form]", (f) => f.requestSubmit());
await sleep(250);
d = await days();
check("Louvre déplacé au jour 3", d[2].includes("Musée du Lo") && !d[1].includes("Musée du Lo"));
stop = (await one()).items.find((i) => i.type === "stop");
check("champ vidé : retiré", !("how" in stop.todos.find((x) => x.id === louvre.id)));

// 5. Réservé
await page.$eval(`#todo-${louvre.id}`, (e) => e.click());
await sleep(200);
check("coché = réservé", (await one()).items.find((i) => i.type === "stop").todos.find((x) => x.id === louvre.id).done === true);

// 6. Trajet aller : arrivée pré-remplie avec le lieu, placé avant lui
await click('[data-act="add-leg"][data-pos="0"]');
check("aller : arrivée = Paris", (await page.$eval('form[data-form="transport"] [name="to"]', (e) => e.value)) === "Paris");
await page.type('form[data-form="transport"] [name="from"]', "Lyon");
await page.$eval('form[data-form="transport"]', (f) => f.requestSubmit());
await sleep(300);
// Retour : départ = Paris, le jour du départ
const retourPos = (await one()).items.length;
await click(`[data-act="add-leg"][data-pos="${retourPos}"]`);
const ret = await page.$eval('form[data-form="transport"]', (f) => f.from.value + " " + f.dep.value);
check("retour : départ de Paris le 4 mai", ret === "Paris 2030-05-04T08:00");
await page.type('form[data-form="transport"] [name="to"]', "Lyon");
await page.$eval('form[data-form="transport"]', (f) => f.requestSubmit());
await sleep(300);
check("ordre : aller, lieu, retour", (await one()).items.map((i) => i.type).join(",") === "transport,stop,transport");
check("pas de flèches pour réordonner", !(await page.$('[data-act="up"], [data-act="down"]')));

// 7. Modifier le lieu ne touche pas au programme
await click('[data-act="toggle-item"][data-id="' + stop.id + '"]');
await click('[data-act="edit"][data-id="' + stop.id + '"]');
await page.$eval('form[data-form="stop"] [name="address"]', (e) => { e.value = "14 rue des Martyrs"; });
await page.$eval('form[data-form="stop"]', (f) => f.requestSubmit());
await sleep(300);
stop = (await one()).items.find((i) => i.type === "stop");
check("lieu modifié, activités gardées", stop.address === "14 rue des Martyrs" && stop.todos.length === 2);
if (SHOTS) await page.screenshot({ path: SHOTS + "/sejour-page.png", fullPage: true });

await page.goto(`http://localhost:${PORT}/index.html#voyages`, { waitUntil: "networkidle0" });
check("carte de la liste : activités du séjour", (await page.$eval(".tc-stats", (e) => e.textContent)).includes("2 activités"));
await page.goBack({ waitUntil: "networkidle0" });
await page.waitForSelector(".sj-day");

// 8. Passer en road trip et revenir
await click('[data-act="set-kind"][data-kind="road"]');
check("road trip : étapes et checklist classiques", !(await one()).kind && !!(await page.$(".route .insert [data-act='add-stop']")));
if (!(await page.$(`[data-act="edit"][data-id="${stop.id}"]`))) await click(`[data-act="toggle-item"][data-id="${stop.id}"]`);
await click(`[data-act="edit"][data-id="${stop.id}"]`);
check("étape de road trip : pas de champ d'heure", !(await page.$('form[data-form="stop"] [name="arriveTime"]')));
await page.$eval('form[data-form="stop"]', (f) => f.requestSubmit());
await sleep(300);
{ const s = (await one()).items.find((i) => i.type === "stop");
  check("enregistrée en road trip, l'étape garde ses heures", s.arriveTime === "15:00" && s.departTime === "11:30"); }
await click('[data-act="set-kind"][data-kind="sejour"]');
check("retour en séjour", (await one()).kind === "sejour" && (await page.$$(".sj-day")).length === 4);

// 9. Depuis une destination : le pays est gardé
await page.goto(`http://localhost:${PORT}/index.html#nouveau-voyage-fr`, { waitUntil: "networkidle0" });
check("titre avec le pays", (await page.$eval(".new-trip h1", (e) => e.textContent)).includes("France"));
await click('[data-act="create-trip"][data-kind="road"]');
const fr = Object.values(await trips()).find((t) => t.country === "FR");
check("road trip créé pour la France", fr && !fr.kind && fr.name === "France");

console.log(`Séjour : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
