// Parcours complet dans Chrome, contre les émulateurs Firebase (aucune donnée réelle n'est touchée).
// Lancé par « npm run test:e2e » (voir tests/package.json et le README).
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PDF = fileURLToPath(new URL("./billet.pdf", import.meta.url));
const PORT = 8765;
const SITE = `http://localhost:${PORT}/index.html?emulateur`;
const CHROME = process.env.CHROME_PATH
  || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => fs.existsSync(p));

// Petit serveur pour le site (comme GitHub Pages)
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".pdf": "application/pdf", ".xml": "application/xml" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  // Pendant les tests seulement : la politique de sécurité autorise aussi les émulateurs locaux
  if (file.endsWith(".html")) return res.end(fs.readFileSync(file, "utf8").replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:*"));
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-sandbox"] });
let ok = 0, ko = 0;
const problems = [];
const check = (label, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newUser(email, keepVerify = false) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`[${email}] erreur JS : ${e.message}`));
  page.on("console", (m) => { if (/Content Security Policy|Refused to/.test(m.text())) problems.push(`[${email}] CSP : ${m.text().slice(0, 200)}`); });
  page.on("dialog", (d) => d.dismiss());
  await page.goto(SITE + "#voyages");
  await page.waitForSelector('[data-act="open-auth"]', { timeout: 15000 });
  await page.click('#account [data-act="open-auth"]');
  await page.click('[data-act="auth-mode"][data-mode="signup"]');
  await page.type("#auth-email", email);
  await page.type("#auth-password", "motdepasse123");
  await page.type("#auth-confirm", "motdepasse123");
  await page.click(".auth-submit");
  await page.waitForSelector(".sync-badge", { timeout: 15000 });
  // Écran « Confirmez votre adresse » juste après la création du compte
  await page.waitForSelector('[data-act="verify-check"]', { timeout: 15000 });
  if (!keepVerify) await page.click('[data-act="verify-later"]');
  return page;
}
const text = (page) => page.evaluate(() => document.getElementById("app").innerText);
const goHash = async (page, hash) => { await page.evaluate((h) => (location.hash = h), hash); await sleep(1500); };
async function makeProfile(page, name, handle, visibility = "public") {
  await goHash(page, "profil");
  await page.waitForSelector("[data-profile-form]");
  await page.type('[data-profile-form] [name="name"]', name);
  await page.type('[data-profile-form] [name="handle"]', handle);
  await page.click(`[data-profile-form] [name="visibility"][value="${visibility}"]`);
  await page.click('[data-profile-form] button[type="submit"]');
  await sleep(2000);
}

// ---------- Sans compte : un voyage piégé n'exécute rien (XSS) ----------
{
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/index.html#voyages`);
  await page.evaluate(() => {
    const P = (n) => `x"><img src=x onerror="document.title='PIRATE-${n}'">`;
    localStorage.setItem("carnet-route-trips", JSON.stringify({ "v-piege": { name: P("nom"), currency: P("devise"), createdAt: 1, items: [
      { id: P("etape"), type: "stop", place: P("lieu"), arrive: "2026-11-02", depart: "2026-11-04", notes: P("notes"),
        links: [{ id: P("lien"), label: P("lbl"), url: "javascript:alert(1)" }], todos: [{ id: P("todo"), text: P("todo"), done: false }] },
      { id: P("trajet"), type: "transport", mode: P("mode"), from: P("de"), to: P("a"), url: "javascript:alert(2)" } ] } }));
  });
  await page.goto(`http://localhost:${PORT}/index.html#voyage-v-piege`);
  await sleep(2500);
  for (const sel of ['.stop [data-act="toggle-item"]', '.transport [data-act="toggle-item"]']) await page.click(sel).catch(() => {});
  await sleep(800);
  check("voyage piégé : aucun code exécuté", !(await page.title()).startsWith("PIRATE") && !(await page.$("#app img")));
  check("voyage piégé : aucun lien javascript:", !(await page.$('#app a[href^="javascript"]')));
  await ctx.close();
}

// ---------- Alice : voyage, profil, publication ----------
const alice = await newUser("alice@test.fr");
await page_newTrip(alice);
async function page_newTrip(page) {
  await page.waitForSelector('[data-act="new-trip"]', { timeout: 15000 });
  await page.click('[data-act="new-trip"]');
  await page.waitForSelector("#tripName");
  await page.click("#tripName", { clickCount: 3 });
  await page.type("#tripName", "Japon en train");
  await page.click('[data-act="add-stop"][data-pos="0"]');
  await page.waitForSelector('form[data-form="stop"]');
  await page.type('form[data-form="stop"] [name="place"]', "Kyoto");
  await page.$eval('form[data-form="stop"] [name="arrive"]', (el) => (el.value = "2026-11-02"));
  await page.$eval('form[data-form="stop"] [name="depart"]', (el) => (el.value = "2026-11-05"));
  await page.type('form[data-form="stop"] [name="price"]', "999");
  await page.type('form[data-form="stop"] [name="notes"]', "Code porte 4321");
  await page.type('form[data-form="stop"] [name="address"]', "12 rue secrète");
  await page.click('[data-act="add-todo-row"]');
  await page.type('[name="todoText"]', "Temple Kinkaku-ji");
  await page.click('form[data-form="stop"] button[type="submit"]');
  await sleep(2500);
}
const tripHash = await alice.evaluate(() => location.hash);
check("voyage créé", tripHash.startsWith("#voyage-"));
check("voyage enregistré dans le compte", (await alice.$eval(".sync-badge", (e) => e.textContent)).includes("Enregistré"));

await makeProfile(alice, "Alice", "alice.test");
check("profil d'Alice créé", (await text(alice)).includes("@alice.test"));

await goHash(alice, tripHash.slice(1));
await alice.click('[data-act="open-publish"]');
await alice.waitForSelector("[data-publish-form]");
await alice.click('[data-act="add-reco-row"]');
await alice.select('[name="recoKind"]', "resto");
await alice.type('[name="recoName"]', "Chez Jo");
await alice.type('[name="recoWhere"]', "Gion, Kyoto");
await alice.type('[name="recoNote"]', "Les meilleurs ramens du quartier.");
await alice.type('[name="recoUrl"]', "javascript:alert(1)");
await alice.click('[data-publish-form] button[type="submit"]');
await sleep(3000);
const postHash = await alice.evaluate(() => location.hash);
check("publication créée", postHash.startsWith("#publication-"));
const postText = await text(alice);
check("publication : étape et activité", postText.includes("Kyoto") && postText.includes("Temple Kinkaku-ji"));
check("publication : « Jour 1 » au lieu des dates", postText.includes("JOUR 1") && !postText.includes("nov."));
check("recommandation affichée", postText.includes("Chez Jo") && postText.includes("Les meilleurs ramens"));
check("lien javascript: non publié", !(await alice.$('a[href^="javascript"]')));
check("publication : ni prix, ni notes, ni adresse", !postText.includes("999") && !postText.includes("4321") && !postText.includes("secrète"));

// ---------- Alice : trajet avec un billet PDF, ouverture du billet ----------
await goHash(alice, tripHash.slice(1));
await alice.click('[data-act="add-leg"][data-pos="1"]');
await alice.waitForSelector('form[data-form="transport"]');
await alice.select('form[data-form="transport"] [name="mode"]', "train");
await alice.click('form[data-form="transport"] button[type="submit"]');
await sleep(2500);
await alice.click('.transport [data-act="toggle-item"]');
await alice.waitForSelector("input[data-ticket-input]");
const input = await alice.$("input[data-ticket-input]");
await input.uploadFile(PDF);
await alice.waitForSelector(".tk-open", { timeout: 15000 }).catch(() => {});
check("billet ajouté au trajet", (await text(alice)).includes("billet.pdf"));
const newTab = new Promise((r) => browser.once("targetcreated", (t) => r(t)));
await alice.click(".tk-open");
const tab = await newTab;
await sleep(2500);
check("le billet s'ouvre dans un onglet (blob:)", tab.url().startsWith("blob:"));
const tabPage = await tab.page();
if (tabPage) await tabPage.close();

// ---------- Bob : Découvrir, recherche, abonnement, fil ----------
const bob = await newUser("bob@test.fr");
await makeProfile(bob, "Bob", "bob.test");
await goHash(bob, "decouvrir");
await sleep(1500);
check("Découvrir montre la publication d'Alice", (await text(bob)).includes("Japon en train"));
await bob.type("#peopleSearch", "ali");
await bob.waitForSelector("#peopleResults .person", { timeout: 8000 }).catch(() => {});
check("recherche « ali » trouve Alice", (await bob.$eval("#peopleResults", (e) => e.innerText)).includes("@alice.test"));
await bob.click("#peopleResults .person");
await sleep(2000);
await bob.click('[data-act="follow"]');
await sleep(2500);
check("Bob est abonné", (await text(bob)).includes("Se désabonner"));
await goHash(bob, "fil");
await sleep(2000);
check("le fil de Bob montre la publication", (await text(bob)).includes("Japon en train"));

// ---------- Bob commente (texte piégé), Alice supprime le commentaire ----------
await bob.goto(SITE + postHash);
await bob.waitForSelector("[data-comment-form] textarea", { timeout: 10000 });
await bob.type("[data-comment-form] textarea", 'Merci ! <img src=x onerror="document.title=1">');
await bob.click('[data-comment-form] button[type="submit"]');
await sleep(3000);
check("commentaire de Bob affiché", (await text(bob)).includes("Merci !"));
check("commentaire piégé sans effet", !(await bob.$(".comment-text img")) && (await bob.title()) !== "1");
// Notifications d'Alice : abonnement et commentaire de Bob
await alice.evaluate(async () => (await import("/js/social.js")).refreshNotifications());
await sleep(2500);
const badge = await alice.$eval('#sidebar a[href="#notifications"]', (a) => a.innerText);
check("menu : nombre de notifications", /\d/.test(badge));
await goHash(alice, "notifications");
await sleep(2500);
const notifText = await text(alice);
check("notification d'abonnement", notifText.includes("Bob s'est abonné(e) à vous"));
check("notification de commentaire", notifText.includes("Bob a commenté « Japon en train »"));
await goHash(alice, "voyages");
check("notifications marquées comme lues", !/\d/.test(await alice.$eval('#sidebar a[href="#notifications"]', (a) => a.innerText)));
await goHash(alice, "decouvrir");
await goHash(alice, postHash.slice(1));
await alice.waitForSelector('.comment [data-act="delete-comment"]', { timeout: 10000 });
await alice.click('.comment [data-act="delete-comment"]');
await alice.click('[data-act="delete-comment-yes"]');
await sleep(2500);
check("Alice a supprimé le commentaire", (await text(alice)).includes("Aucun commentaire"));

// ---------- Carla rejoint le voyage d'Alice : notification ----------
const tripId = tripHash.slice("#voyage-".length);
check("invitation de Carla enregistrée", (await alice.evaluate(async (id) => { try { await (await import("/js/cloud.js")).invite(id, "carla@test.fr"); return "ok"; } catch (e) { return "ERREUR " + e.code; } }, tripId)) === "ok");
const carla = await newUser("carla@test.fr", true);
check("écran de confirmation après la création du compte", (await text(carla)).includes("Confirmez votre adresse e-mail") && (await text(carla)).includes("carla@test.fr"));
await carla.click('[data-act="verify-check"]');
await sleep(1500);
check("adresse pas encore confirmée : message", (await carla.$eval("#verify-msg", (e) => !e.hidden && e.textContent)).includes("pas encore confirmée"));
// L'émulateur confirme l'adresse de Carla (comme si elle avait cliqué le lien reçu)
const uidCarla = await carla.evaluate(async () => (await import("/js/store.js")).state.user.uid);
await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/carnet-de-route-23ffc/accounts:update", {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
  body: JSON.stringify({ localId: uidCarla, emailVerified: true }),
});
await carla.click('[data-act="verify-check"]');
await sleep(4000);
check("Carla a rejoint le voyage", (await carla.evaluate(async (id) => !!(await import("/js/store.js")).state.trips[id], tripId)));
// ---------- Modifications simultanées : Alice et Carla ajoutent chacune une étape ----------
await goHash(alice, tripHash.slice(1));
await goHash(carla, tripHash.slice(1));
await alice.click('[data-act="add-stop"][data-pos="1"]');          // Alice commence à saisir…
await alice.waitForSelector('form[data-form="stop"]');
await alice.type('form[data-form="stop"] [name="place"]', "Nara");
await carla.click('[data-act="add-stop"][data-pos="1"]');          // …pendant que Carla ajoute Osaka
await carla.waitForSelector('form[data-form="stop"]');
await carla.type('form[data-form="stop"] [name="place"]', "Osaka");
await carla.click('form[data-form="stop"] button[type="submit"]');
await sleep(3000);
await alice.click('form[data-form="stop"] button[type="submit"]');  // Alice enregistre après Carla
await sleep(5000);
const places = (page) => page.$$eval(".stop .stop-toggle", (l) => l.map((b) => b.textContent.trim()).sort().join(", "));
check("modifications simultanées : Alice a les deux étapes", (await places(alice)) === "Kyoto, Nara, Osaka");
check("modifications simultanées : Carla a les deux étapes", (await places(carla)) === "Kyoto, Nara, Osaka");

await sleep(1500);
await alice.evaluate(async () => (await import("/js/social.js")).refreshNotifications());
await sleep(2000);
await goHash(alice, "notifications");
await sleep(2000);
check("notification : Carla a rejoint le voyage", (await text(alice)).includes("carla@test.fr a rejoint votre voyage « Japon en train »"));

// ---------- Alice voit son abonné, puis passe la publication en « Moi seul » ----------
await goHash(alice, "profil");
await sleep(2500);
check("Mon profil : pas de liste, un lien Abonnés", !(await text(alice)).includes("@bob.test") && !!(await alice.$('a.list-link[href="#abonnes"]')));
await alice.click('a.list-link[href="#abonnes"]');
await sleep(2000);
check("page Abonnés ouverte", (await alice.evaluate(() => location.hash)) === "#abonnes" && (await alice.title()).startsWith("Abonnés"));
check("Alice voit Bob dans ses abonnés", (await text(alice)).includes("@bob.test"));
await goHash(alice, postHash.slice(1));
await alice.waitForSelector("[data-post-visibility]");
await alice.select("[data-post-visibility]", "private");
await sleep(2500);
await bob.reload();
await sleep(4000);
check("Bob ne voit plus la publication « Moi seul »", (await text(bob)).includes("Itinéraire introuvable"));

// ---------- Sans compte ----------
const anonCtx = await browser.createBrowserContext();
const anon = await anonCtx.newPage();
await alice.select("[data-post-visibility]", "public");
await sleep(2000);
await anon.goto(SITE + postHash);
await sleep(5000);
check("sans compte : publication publique lisible", (await text(anon)).includes("Kyoto"));

problems.forEach((p) => { ko++; console.log("ÉCHEC :", p); });
console.log(`Parcours complet : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
