// Notifications quand un voyageur modifie un voyage partagé, contre les émulateurs Firebase :
// message en direct, une ligne par personne et par voyage, jamais ses propres modifications.
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8776;
const SITE = `http://localhost:${PORT}/index.html?emulateur`;
const DB = "http://127.0.0.1:8181/v1/projects/carnet-de-route-23ffc/databases/(default)/documents";
const CHROME = process.env.CHROME_PATH
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  if (file.endsWith(".html")) return res.end(fs.readFileSync(file, "utf8").replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:*"));
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

const browser = forceLang(await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-sandbox"] }), "fr-FR");
let ok = 0, ko = 0;
const problems = [];
const check = (label, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const goHash = async (page, hash) => { await page.evaluate((h) => (location.hash = h), hash); await sleep(1200); };

async function newUser(email) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 375, height: 760 });
  page.on("pageerror", (e) => problems.push(`[${email}] erreur JS : ${e.message}`));
  await page.goto(SITE + "#voyages");
  await page.waitForSelector('#account [data-act="open-auth"]', { timeout: 15000 });
  await page.click('#account [data-act="open-auth"]');
  await page.click('[data-act="auth-mode"][data-mode="signup"]');
  await page.type("#auth-email", email);
  await page.type("#auth-password", "motdepasse123");
  await page.type("#auth-confirm", "motdepasse123");
  await page.click(".auth-submit");
  await page.waitForSelector('[data-act="verify-later"]', { timeout: 15000 });
  await page.click('[data-act="verify-later"]');
  await sleep(800);
  return page;
}
const run = (page, fn, ...args) => page.evaluate(fn, ...args);
const uidOf = (page) => run(page, async () => (await import("/js/store.js")).state.user.uid);
const raw = async (p) => {
  const r = await fetch(`${DB}/${p}`, { headers: { Authorization: "Bearer owner" } });
  return r.status === 404 ? null : r.json();
};
const toastText = (page) => page.$eval("#toast", (t) => (t.hidden ? "" : t.textContent));
// Modifie le voyage comme l'app : changement, enregistrement, envoi immédiat
const change = (page, tripId, op) => run(page, async (tripId, op) => {
  const store = await import("/js/store.js");
  const t = store.state.trips[tripId];
  const last = () => t.items[t.items.length - 1];
  if (op === "étape") t.items.push({ id: "o", type: "stop", place: "Osaka", arrive: "2030-04-03", depart: "2030-04-05", todos: [] });
  if (op === "activité") last().todos.push({ id: "x", text: "Château", book: false });
  if (op === "dates") last().depart = "2030-04-06";
  if (op === "nom") t.name = "Japon 2030";
  store.save();
  await store.flush();
}, tripId, op);
const notifLines = (page) => page.$$eval(".notif", (l) => l.map((e) => e.innerText.replace(/\s+/g, " ").trim()));

// ---------- Ana et Bruno, profils publics ; Ana suit Bruno ----------
const ana = await newUser("ana.notif@test.fr");
await run(ana, async () => (await import("/js/social.js")).saveProfile({ name: "Ana", handle: "ana.notif", bio: "", visibility: "public" }));
const bruno = await newUser("bruno.notif@test.fr");
const brunoUid = await uidOf(bruno);
await run(bruno, async () => (await import("/js/social.js")).saveProfile({ name: "Bruno", handle: "bruno.notif", bio: "", visibility: "public" }));
await run(ana, async (u) => (await import("/js/social.js")).follow({ uid: u, visibility: "public" }), brunoUid);

// ---------- Ana crée un voyage et y invite Bruno, qui le rejoint ----------
const tripId = await run(ana, async (u) => {
  const store = await import("/js/store.js");
  const cloud = await import("/js/cloud.js");
  const id = store.createTrip({ name: "Japon" });
  store.state.trips[id].items.push({ id: "k", type: "stop", place: "Kyoto", arrive: "2030-04-01", depart: "2030-04-03", todos: [] });
  store.save();
  await store.flush();
  await cloud.inviteUid(id, u);
  return id;
}, brunoUid);
await run(bruno, async (id) => {
  const cloud = await import("/js/cloud.js");
  const inv = (await cloud.listInvitations()).find((i) => i.id === id);
  await cloud.joinTrip(id, inv);
}, tripId);
await bruno.reload();
await bruno.waitForFunction((id) => import("/js/store.js").then((s) => !!s.state.trips[id]), { timeout: 15000 }, tripId);
// Ana a le voyage ouvert
await ana.evaluate((id) => (location.hash = "#voyage-" + id), tripId);
await sleep(1500);
check("au départ : aucune trace de modification", !(await raw("trips/" + tripId)).fields.lastEdit);

// ---------- Bruno ajoute une étape ----------
await change(bruno, tripId, "étape");
await ana.waitForFunction(() => (document.getElementById("toast") || {}).textContent?.includes("vient de modifier"), { timeout: 15000 }).catch(() => {});
check("voyage ouvert chez Ana : message en direct", (await toastText(ana)) === "Bruno vient de modifier le voyage");
const doc1 = (await raw("trips/" + tripId)).fields.lastEdit.mapValue.fields;
check("trace de Bruno enregistrée, seulement la sienne", Object.keys(doc1).join() === brunoUid
  && JSON.stringify(doc1[brunoUid]).includes('"stopAdded"') && JSON.stringify(doc1[brunoUid]).includes("Osaka"));
check("trace enregistrée en codes, sans phrase", !JSON.stringify(doc1[brunoUid]).includes("ajout"));
await sleep(500);
check("compteur du menu", await ana.evaluate(() => [...document.querySelectorAll(".nav-count.is-new")].some((e) => +e.textContent > 0)));
await ana.evaluate(() => (location.hash = "#notifications"));
await ana.waitForSelector(".notif", { timeout: 15000 }).catch(() => {});
let lines = await notifLines(ana);
check("notification : qui, quel voyage, ce qui a changé", lines.some((l) => l.includes("Bruno a modifié « Japon » : ajout de l'étape Osaka.")));
if (process.env.SHOTS) await (await ana.$(".notifs")).screenshot({ path: process.env.SHOTS + "/notif-modification.png" });

// ---------- Bruno continue : toujours une seule ligne, mise à jour ----------
await change(bruno, tripId, "activité");
await change(bruno, tripId, "dates");
await sleep(2500);
lines = (await notifLines(ana)).filter((l) => l.includes("Bruno a modifié"));
check("une seule ligne par personne et par voyage", lines.length === 1);
check("ligne mise à jour", (lines[0] || "").includes("Bruno a modifié « Japon » : ajout de l'étape Osaka, 1 activité ajoutée à Osaka et dates d'Osaka."));

// ---------- La même notification lue en anglais ----------
await goHash(ana, "parametres");
await ana.click("#lang-en");
await goHash(ana, "notifications");
check("notification en anglais", (await notifLines(ana)).some((l) => l.includes("Bruno edited “Japon”: added the stop Osaka, 1 activity added to Osaka and dates for Osaka.")));
await goHash(ana, "parametres");
await ana.click("#lang-fr");
await goHash(ana, "notifications");

// ---------- Ana modifie à son tour : jamais ses propres modifications ----------
await change(ana, tripId, "nom");
await sleep(2500);
lines = await notifLines(ana);
check("Ana ne voit pas ses propres modifications", !lines.some((l) => l.includes("Ana a modifié")));
const doc2 = (await raw("trips/" + tripId)).fields.lastEdit.mapValue.fields;
check("chacun sa trace dans le voyage", Object.keys(doc2).length === 2 && JSON.stringify(doc2[brunoUid]).includes("Osaka"));
await bruno.evaluate(() => (location.hash = "#notifications"));
await bruno.waitForFunction(() => document.body.innerText.includes("Ana a modifié"), { timeout: 15000 }).catch(() => {});
check("Bruno voit la modification d'Ana", (await notifLines(bruno)).some((l) => l.includes("Ana a modifié « Japon 2030 » : nom du voyage.")));
check("Bruno ne voit pas les siennes", !(await notifLines(bruno)).some((l) => l.includes("Bruno a modifié")));

problems.forEach((p) => check(p, false));
console.log(`Notifications des voyages partagés : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
