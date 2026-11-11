// Suppression du compte, contre les émulateurs Firebase : tout ce qui se rattache au compte disparaît,
// sans toucher aux données des autres. Lancé par « npm run test:e2e ».
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8771;
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

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-sandbox"] });
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

// Lecture directe de l'émulateur, sans règles de sécurité (jeton « owner »)
const raw = async (p) => {
  const r = await fetch(`${DB}/${p}`, { headers: { Authorization: "Bearer owner" } });
  return r.status === 404 ? null : r.json();
};
const list = async (p) => ((await raw(p)) || {}).documents || [];

// ---------- Dan : profil et une publication ----------
const dan = await newUser("dan@test.fr");
const danUid = await uidOf(dan);
const postId = await run(dan, async () => {
  const s = await import("/js/social.js");
  await s.saveProfile({ name: "Dan", handle: "dan.voyage", bio: "", visibility: "public" });
  return s.publish({ name: "Écosse", currency: "EUR", items: [{ id: "a", type: "stop", place: "Édimbourg", todos: [] }] }, { title: "Écosse", visibility: "public", recos: [] });
});

// ---------- Camille : profil, voyage, abonnement, commentaires, favori, publication ----------
const cam = await newUser("camille@test.fr");
const camUid = await uidOf(cam);
await cam.waitForSelector('[data-act="new-trip"]', { timeout: 15000 });
await cam.click('[data-act="new-trip"]');
await cam.waitForSelector('[data-act="create-trip"][data-kind="road"]');
await cam.click('[data-act="create-trip"][data-kind="road"]');
await sleep(2500);
const camPost = await run(cam, async (postId, danUid) => {
  const s = await import("/js/social.js");
  const { prefs, savePrefs } = await import("/js/prefs.js");
  await s.saveProfile({ name: "Camille", handle: "camille.v", bio: "", visibility: "public" });
  await s.follow({ uid: danUid, visibility: "public" });
  await s.addComment(postId, "Superbe itinéraire !");
  await s.likePost(postId);
  prefs.favoritePosts.push(postId);
  prefs.theme = "dark";
  savePrefs();
  return s.publish({ name: "Lisbonne", currency: "EUR", items: [{ id: "b", type: "stop", place: "Lisbonne", todos: [] }] }, { title: "Lisbonne", visibility: "public", recos: [] });
}, postId, danUid);
// Dan commente la publication de Camille et répond au commentaire de Camille
await run(dan, async (camPost, postId) => {
  const s = await import("/js/social.js");
  await s.addComment(camPost, "Merci pour les adresses");
  const c = (await s.listComments(postId)).find((x) => x.text === "Superbe itinéraire !");
  await s.addComment(postId, "Merci Camille", { id: c.id, author: c.author });
  await s.follow({ uid: c.author, visibility: "public" });
}, camPost, postId);
await sleep(1500);

const has = (docs) => JSON.stringify(docs).includes(camUid);
check("avant : Camille a un voyage", has(await list("trips")));
check("avant : profil, pseudo, préférences", !!(await raw(`profiles/${camUid}`)) && !!(await raw("handles/camille.v")) && !!(await raw(`users/${camUid}/meta/prefs`)));
check("avant : abonnements dans les deux sens", (await list("follows")).filter((d) => has(d)).length === 2);
check("avant : commentaire et favori chez Dan", has(await list(`posts/${postId}/comments`)) && !!(await raw(`posts/${postId}/likes/${camUid}`)));
check("avant : compteur de favoris à 1", (await raw(`posts/${postId}`)).fields.favCount.integerValue === "1");

// ---------- Paramètres : le bouton, le formulaire, un mauvais mot de passe ----------
await goHash(cam, "parametres");
await cam.click('[data-act="delete-account-open"]');
await cam.waitForSelector("form[data-delete-account]");
check("formulaire : explique ce qui est supprimé et ce qui reste aux co-voyageurs",
  (await cam.$eval("form[data-delete-account]", (f) => f.innerText)).includes("confié au voyageur suivant"));
if (process.env.SHOTS) await (await cam.$("form[data-delete-account]")).screenshot({ path: process.env.SHOTS + "/supprimer-compte.png" });
await cam.type("#deletePassword", "pas-le-bon");
await cam.click('form[data-delete-account] button[type="submit"]');
await sleep(2500);
check("mauvais mot de passe : message, rien n'est supprimé", (await cam.$eval("#toast", (t) => t.textContent)).includes("incorrect") && !!(await raw(`profiles/${camUid}`)) && has(await list("trips")));
check("le formulaire reste ouvert", !!(await cam.$("form[data-delete-account]")));

// ---------- La vraie suppression ----------
await cam.$eval("#deletePassword", (e) => { e.value = ""; });
await cam.type("#deletePassword", "motdepasse123");
await cam.click('form[data-delete-account] button[type="submit"]');
await cam.waitForFunction(() => (document.getElementById("toast") || {}).textContent?.includes("supprimés"), { timeout: 30000 }).catch(() => {});
check("message de fin", (await cam.$eval("#toast", (t) => t.textContent)) === "Votre compte et toutes ses données ont été supprimés");
check("déconnectée, sans voyage sur l'appareil", !!(await cam.$('#account [data-act="open-auth"]'))
  && (await cam.evaluate(() => localStorage.getItem("carnet-route-trips"))) === null);

check("plus de voyage", !has(await list("trips")));
check("plus de profil ni de pseudo", !(await raw(`profiles/${camUid}`)) && !(await raw("handles/camille.v")));
check("plus de préférences", !(await raw(`users/${camUid}/meta/prefs`)));
check("plus d'abonnement, dans aucun sens", !(await list("follows")).some((d) => has(d)));
check("sa publication est supprimée, avec le commentaire de Dan", !(await raw(`posts/${camPost}`)) && !(await list(`posts/${camPost}/comments`)).length);
const danComments = await list(`posts/${postId}/comments`);
check("son commentaire chez Dan est supprimé", !danComments.some((d) => d.fields.author.stringValue === camUid));
check("la réponse de Dan reste", danComments.some((d) => d.fields.text.stringValue === "Merci Camille"));
check("son favori est retiré et décompté", !(await raw(`posts/${postId}/likes/${camUid}`)) && (await raw(`posts/${postId}`)).fields.favCount.integerValue === "0");
check("la publication de Dan est intacte", (await raw(`posts/${postId}`)).fields.title.stringValue === "Écosse");

// Le compte de connexion n'existe plus
await cam.click('#account [data-act="open-auth"]');
await cam.type("#auth-email", "camille@test.fr");
await cam.type("#auth-password", "motdepasse123");
await cam.click(".auth-submit");
await sleep(2500);
check("impossible de se reconnecter", !(await cam.$(".sync-badge.is-saved")) && /incorrect|Aucun compte/.test(await cam.evaluate(() => document.getElementById("app").innerText + (document.getElementById("toast") || {}).textContent)));

problems.forEach((p) => check(p, false));
console.log(`Suppression du compte : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
