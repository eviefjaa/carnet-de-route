// Inviter à un voyage une personne de son réseau, par son nom ou son pseudo, contre les émulateurs
// Firebase : suggestions, invitation, la personne invitée rejoint. Lancé par « npm run test:e2e ».
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8773;
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
// Les modules du site, déjà chargés par la page (même adresse, donc mêmes instances)
const run = (page, fn, ...args) => page.evaluate(fn, ...args);
const uidOf = (page) => run(page, async () => (await import("/js/store.js")).state.user.uid);
const toastText = (page) => page.$eval("#toast", (t) => t.textContent);
const raw = async (p) => {
  const r = await fetch(`${DB}/${p}`, { headers: { Authorization: "Bearer owner" } });
  return r.status === 404 ? null : r.json();
};

// ---------- B : profil public ----------
const bob = await newUser("bob.inv@test.fr");
const bobUid = await uidOf(bob);
await run(bob, async () => (await import("/js/social.js")).saveProfile({ name: "Bérénice Martin", handle: "bere.m", bio: "", visibility: "public" }));

// ---------- A : un voyage, sans profil d'abord ----------
const ali = await newUser("ali.inv@test.fr");
await ali.waitForSelector('[data-act="new-trip"]', { timeout: 15000 });
await ali.click('[data-act="new-trip"]');
await ali.waitForSelector('[data-act="create-trip"][data-kind="road"]');
await ali.click('[data-act="create-trip"][data-kind="road"]');
await sleep(1500);
await ali.$eval("#tripName", (i) => { i.value = "Islande"; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); });
await sleep(1500);
const tripId = await ali.evaluate(() => location.hash.replace("#voyage-", ""));
await ali.click('[data-act="open-invite"]');
await ali.waitForSelector("form[data-invite-form]");
check("sans profil : le texte d'aide le dit", (await ali.$eval(".share", (s) => s.innerText)).includes("Créez votre profil pour inviter les personnes que vous suivez"));
await ali.click('[data-act="close-invite"]');

// A crée son profil et suit B (compte public : abonnement accepté)
await run(ali, async (bobUid) => {
  const s = await import("/js/social.js");
  await s.saveProfile({ name: "Ali", handle: "ali.v", bio: "", visibility: "public" });
  await s.follow({ uid: bobUid, visibility: "public" });
}, bobUid);
await ali.evaluate(() => (location.hash = "#voyages"));
await sleep(500);
await ali.evaluate((id) => (location.hash = "#voyage-" + id), tripId);
await sleep(1200);

// ---------- A invite B par son pseudo ----------
await ali.waitForSelector('[data-act="open-invite"]');
await ali.click('[data-act="open-invite"]');
await ali.waitForSelector("#inviteWho");
check("champ unique : nom, pseudo ou e-mail", (await ali.$eval("#inviteWho", (i) => i.placeholder)) === "Nom, @pseudo ou adresse e-mail");
await sleep(1500); // réseau chargé à l'ouverture
await ali.type("#inviteWho", "bere");
await ali.waitForSelector(".sh-suggest li", { timeout: 5000 }).catch(() => {});
const sugg = await ali.$$eval(".sh-suggest li", (l) => l.map((li) => li.innerText.replace(/\s+/g, " ").trim()));
check("suggestion : avatar, nom et pseudo", sugg.length === 1 && sugg[0].includes("Bérénice Martin") && sugg[0].includes("@bere.m"));
await ali.$eval("#inviteWho", (i) => { i.value = ""; });
await ali.type("#inviteWho", "MARTIN");
check("majuscules et accents ignorés", (await ali.$$(".sh-suggest li")).length === 1);
await ali.type("#inviteWho", "@gm");
check("adresse e-mail en cours : plus de suggestions", !(await ali.$(".sh-suggest")));
await ali.$eval("#inviteWho", (i) => { i.value = ""; });
await ali.type("#inviteWho", "bere");
await ali.waitForSelector(".sh-suggest li");
await ali.keyboard.press("Escape");
check("Échap ferme la liste", !(await ali.$(".sh-suggest")));
await ali.type("#inviteWho", ".");
await ali.waitForSelector(".sh-suggest li");
if (process.env.SHOTS) await (await ali.$(".share")).screenshot({ path: process.env.SHOTS + "/inviter-suggestions.png" });
await ali.keyboard.press("ArrowDown");
check("flèche : personne surlignée", !!(await ali.$(".sh-suggest li.on")));
await ali.keyboard.press("Enter");
await ali.waitForFunction(() => (document.getElementById("toast") || {}).textContent?.includes("Invitation envoyée"), { timeout: 10000 }).catch(() => {});
check("toast", (await toastText(ali)) === "Invitation envoyée à @bere.m : elle la verra dans Mes voyages et ses notifications.");
check("pas de messagerie ouverte", (await ali.evaluate(() => location.href)).startsWith("http"));
check("invitation enregistrée par compte", JSON.stringify((await raw("trips/" + tripId)).fields.inviteUids).includes(bobUid));
await sleep(1500);
const row = await ali.$$eval(".sh-list .sh-pending", (l) => l.map((li) => li.innerText.replace(/\s+/g, " ").trim()));
check("liste des voyageurs : « Nom @pseudo » et Invité(e), sans Renvoyer", row.length === 1 && row[0].includes("Bérénice Martin @bere.m") && row[0].includes("Invité(e)") && !row[0].includes("Renvoyer"));
check("le créateur peut l'annuler", !!(await ali.$('[data-act="cancel-invite-uid"]')));
if (process.env.SHOTS) await (await ali.$(".share")).screenshot({ path: process.env.SHOTS + "/inviter-liste.png" });
// Déjà invitée : grisée dans les suggestions
await ali.click('[data-act="open-invite"]');
await ali.waitForSelector("#inviteWho");
await ali.type("#inviteWho", "bere");
await ali.waitForSelector(".sh-suggest li");
check("déjà invitée : grisée, « Déjà invité(e) »", (await ali.$$eval(".sh-suggest li.is-invited", (l) => l.map((li) => li.innerText))).join("").includes("Déjà invité(e)"));
await ali.keyboard.press("Escape");
await ali.click('[data-act="close-invite"]');

// ---------- B voit l'invitation (adresse non confirmée) et rejoint ----------
await bob.reload();
await bob.waitForSelector(".invitations", { timeout: 15000 }).catch(() => {});
check("B voit l'invitation dans Mes voyages", (await bob.$eval(".invitations", (s) => s.innerText).catch(() => "")).includes("Islande"));
await bob.evaluate(() => (location.hash = "#notifications"));
await sleep(1200);
check("et dans Notifications", (await bob.$eval("#app", (s) => s.innerText)).includes("Islande"));
await bob.evaluate(() => (location.hash = "#voyages"));
await bob.waitForSelector('[data-act="invite-join"]', { timeout: 10000 });
await bob.click('[data-act="invite-join"]');
await bob.waitForFunction((id) => location.hash === "#voyage-" + id, { timeout: 10000 }, tripId).catch(() => {});
await bob.waitForFunction(() => document.getElementById("tripName")?.value === "Islande", { timeout: 15000 }).catch(() => {});
check("le voyage apparaît chez B", (await bob.$eval("#tripName", (i) => i.value).catch(() => "")) === "Islande");
const after = (await raw("trips/" + tripId)).fields;
check("B est voyageur, plus invitée", JSON.stringify(after.members).includes(bobUid) && !JSON.stringify(after.inviteUids || {}).includes(bobUid));

problems.forEach((p) => check(p, false));
console.log(`Inviter par nom ou pseudo : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
