// Page d'un voyage allégée et menu en groupes, en français et en anglais, sur téléphone et ordinateur :
// ordre des sections, budget replié puis déplié (détail d'une ligne sur téléphone), menu « ⋯ »
// (supprimer avec confirmation, publier), « + » entre deux éléments, trajet en une ligne,
// panneau des voyageurs depuis l'en-tête, menu de gauche en groupes avec le compteur de notifications.
// Contre les émulateurs Firebase (comptes pour « Publier » et les voyageurs).
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { forceLang } from "./langue.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PORT = 8778;
const SITE = `http://localhost:${PORT}/index.html?emulateur`;
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

let ok = 0, ko = 0;
const check = (label, cond) => { if (cond) ok++; else { ko++; console.log("ÉCHEC :", label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = forceLang(await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run", "--no-sandbox"] }), "fr-FR");

const TEXT = {
  fr: { missing: "3 prix manquants", lodging: "Hébergement", groups: "Voyages,Communauté", explore: "Destinations", del: "Supprimer ce voyage", publish: "Publier l'itinéraire", you: "vous", mode: "Train" },
  en: { missing: "3 prices missing", lodging: "Accommodation", groups: "Trips,Community", explore: "Destinations", del: "Delete this trip", publish: "Publish the itinerary", you: "you", mode: "Train" },
};
const stop = (id, place, arrive, depart, extra = {}) => ({ id, type: "stop", place, country: "Portugal", arrive, depart, address: "", notes: "", links: [], price: null, todos: [], ...extra });
const TRIPS = {
  "v-pt": { name: "Portugal", currency: "EUR", createdAt: 2, items: [
    stop("a", "Lisbonne", "2030-06-01", "2030-06-03", { price: 240, todos: [{ id: "t1", text: "Tram 28", date: "2030-06-01", time: "10:00", book: false }] }),
    { id: "l1", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2030-06-03T09:00", arr: "2030-06-03T12:05", company: "CP", ref: "AB12", url: "", notes: "Voiture 4", price: 30, tickets: [] },
    stop("b", "Porto", "2030-06-03", "2030-06-06"),
    { id: "l2", type: "transport", mode: "bus", from: "Porto", to: "Braga", dep: "2030-06-06T10:00", arr: "", company: "", ref: "", url: "", notes: "", price: null, tickets: [] },
    stop("c", "Braga", "2030-06-06", "2030-06-06")] },
  "v-del": { name: "À supprimer", currency: "EUR", createdAt: 1, items: [stop("d", "Nice", "2030-08-01", "2030-08-02")] },
};

async function openPage(lang, width) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const phone = width < 600;
  await page.setViewport({ width, height: phone ? 844 : 900, isMobile: phone, hasTouch: phone });
  page.on("pageerror", (e) => check(`[${lang} ${width}] erreur JS : ${e.message}`, false));
  await page.goto(SITE + "#voyages");
  await page.evaluate((trips, lang) => {
    localStorage.setItem("carnet-route-trips", JSON.stringify(trips));
    localStorage.setItem("carnet-route-prefs", JSON.stringify({ lang }));
  }, TRIPS, lang);
  await page.reload();
  await sleep(800);
  return page;
}
const go = async (page, hash) => { await page.evaluate((h) => (location.hash = h), hash); await sleep(500); };
const visible = (page, sel) => page.$eval(sel, (e) => !!(e.offsetWidth || e.offsetHeight) && getComputedStyle(e).visibility !== "hidden").catch(() => false);
const focused = (page) => page.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.dataset.act || a.className) : ""; });

// ---------- Sans compte : les quatre combinaisons ----------
for (const [lang, width] of [["fr", 390], ["fr", 1366], ["en", 390], ["en", 1366]]) {
  const L = TEXT[lang], tag = `[${lang} ${width}]`, phone = width < 600;
  const page = await openPage(lang, width);
  await go(page, "voyage-v-pt");

  // Ordre : en-tête, carte, budget, itinéraire ; plus de grand cadre « Voyageurs »
  const order = await page.evaluate(() => [...document.querySelectorAll("#app > section")].map((s) => s.classList[0]).join(","));
  check(`${tag} ordre des sections (${order})`, order === "hero,map-box,budget,route");
  check(`${tag} pas de cadre Voyageurs ouvert d'office`, !(await page.$("#sharePanel")));

  // Budget replié : une ligne, puis déplié avec la devise et le tableau
  const line = await page.$eval(".trip-budget .b-toggle", (b) => b.textContent.replace(/\s+/g, " ").trim());
  check(`${tag} budget replié en une ligne (${line})`, /270/.test(line) && line.includes(L.missing) && !(await page.$(".budget-table")));
  check(`${tag} budget replié : aria-expanded`, await page.$eval(".b-toggle", (b) => b.getAttribute("aria-expanded") === "false" && b.getAttribute("aria-controls") === "budgetBody"));
  await page.click(".b-toggle");
  await sleep(300);
  check(`${tag} budget déplié : devise, total, tableau`, !!(await page.$("#tripCurrency")) && !!(await page.$(".budget-table")) && await page.$eval(".b-toggle", (b) => b.getAttribute("aria-expanded") === "true"));
  if (phone) {
    const cols = await page.$$eval(".budget-table thead th", (l) => l.filter((e) => e.offsetWidth).length);
    check(`${tag} téléphone : Destination et Total seulement (${cols} colonnes)`, cols === 2);
    check(`${tag} téléphone : pas de défilement horizontal`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.click('.b-place-btn[data-row="v-pt:0"]');
    await sleep(300);
    const detail = await page.$eval("#b-row-0", (e) => (e.hidden ? "" : e.innerText));
    check(`${tag} toucher une ligne : son détail dessous (${detail.replace(/\s+/g, " ")})`, detail.includes(L.lodging) && /240/.test(detail));
    check(`${tag} ligne « Total du voyage » gardée`, await visible(page, ".budget-table tfoot th"));
  } else {
    const cols = await page.$$eval(".budget-table thead th", (l) => l.filter((e) => e.offsetWidth).length);
    check(`${tag} ordinateur : tableau complet (${cols} colonnes)`, cols === 5 && !(await visible(page, ".b-place-btn")));
  }
  // Ouvert pour la session : toujours déplié en revenant sur le voyage
  await go(page, "voyages");
  await go(page, "voyage-v-pt");
  check(`${tag} budget toujours déplié pendant la session`, !!(await page.$(".budget-table")));

  // « + » entre deux éléments : affiche « + Étape » et « + Trajet » à cet endroit
  check(`${tag} « + » entre deux éléments, boutons cachés`, !!(await page.$('[data-act="insert-open"][data-pos="1"]')) && !(await visible(page, "#ins-1")));
  check(`${tag} « + » : nom accessible et aria-expanded`, await page.$eval('[data-act="insert-open"][data-pos="1"]', (b) => !!b.getAttribute("aria-label") && b.getAttribute("aria-expanded") === "false"));
  check(`${tag} « + » : 44 px à toucher`, await page.$eval('[data-act="insert-open"][data-pos="1"]', (b) => b.offsetWidth >= 44 && b.offsetHeight >= 44));
  check(`${tag} fin de l'itinéraire : les deux boutons en entier`, await page.$$eval(".route > .insert", (l) => !l[l.length - 1].classList.contains("is-compact") && !!l[l.length - 1].querySelector('[data-act="add-leg"]')));
  await page.click('[data-act="insert-open"][data-pos="1"]');
  await sleep(300);
  check(`${tag} « + » ouvert : « + Étape » et « + Trajet », focus sur le premier`, await visible(page, '#ins-1 [data-act="add-stop"]') && await visible(page, '#ins-1 [data-act="add-leg"]') && (await focused(page)) === "add-stop");
  await page.keyboard.press("Escape");
  await sleep(300);
  check(`${tag} Échap referme, focus rendu au « + »`, !(await visible(page, "#ins-1")) && (await focused(page)) === "insert-open");
  await page.click('[data-act="insert-open"][data-pos="1"]');
  await sleep(200);
  await page.click("h1");
  await sleep(300);
  check(`${tag} un toucher ailleurs referme`, !(await visible(page, "#ins-1")));
  await page.click('[data-act="insert-open"][data-pos="1"]');
  await sleep(200);
  await page.click('#ins-1 [data-act="add-stop"]');
  await sleep(400);
  const formAt = await page.evaluate(() => {
    const kids = [...document.querySelector(".route").children].filter((e) => e.matches(".item, form"));
    return kids.findIndex((e) => e.matches('form[data-form="stop"][data-new="1"]'));
  });
  check(`${tag} « + Étape » : formulaire juste après la première étape (${formAt})`, formAt === 1);
  await page.click('form[data-form="stop"] [data-act="cancel"]');
  await sleep(300);

  // Trajet replié : une ligne fine (icône, lieux, départ, durée), le mode lu par les lecteurs d'écran
  const leg = await page.$eval(".transport.is-line", (e) => ({ h: e.getBoundingClientRect().height, icon: !!e.querySelector(".leg-icon"), sr: e.querySelector(".sr-only").textContent,
    text: e.querySelector(".leg-summary").innerText.replace(/\s+/g, " "), bg: getComputedStyle(e).backgroundColor, detail: !!e.querySelector(".leg-detail"), label: !!e.querySelector(".mode") }));
  check(`${tag} trajet replié en une ligne (${Math.round(leg.h)} px : ${leg.text})`, leg.h < 75 && leg.icon && !leg.detail && !leg.label && /3\s?h\s?05/.test(leg.text));
  check(`${tag} trajet : mode pour les lecteurs d'écran`, leg.sr.includes(L.mode));
  check(`${tag} trajet replié sans fond`, /rgba\(0, 0, 0, 0\)|transparent/.test(leg.bg));
  await page.click('.transport [data-act="toggle-item"][data-id="l1"]');
  await sleep(300);
  const open = await page.$eval(".transport.open .leg-detail", (e) => e.innerText);
  check(`${tag} trajet ouvert : tout le détail`, /12:05/.test(open) && open.includes("CP") && open.includes("AB12") && open.includes("Voiture 4") && /30/.test(open)
    && (await page.$$('.transport.open .row-actions [data-act]')).length >= 3);

  // Nuits en texte simple, plus de pastille
  check(`${tag} nuits en texte simple`, await page.$eval(".nights-text", (e) => getComputedStyle(e).backgroundColor === "rgba(0, 0, 0, 0)" && e.textContent.trim().startsWith("·")));

  // Panneau des voyageurs depuis l'en-tête (sans compte : se connecter)
  await page.click(".sh-invite");
  await sleep(300);
  check(`${tag} « + Inviter » sans compte : panneau avec « Se connecter »`, await visible(page, '#sharePanel [data-act="open-auth"]') && await page.$eval(".sh-invite", (b) => b.getAttribute("aria-expanded") === "true"));
  await page.click("#sharePanel .sh-close");
  await sleep(300);
  check(`${tag} panneau des voyageurs refermé`, !(await page.$("#sharePanel")));

  // Menu « ⋯ » : clavier, Échap, toucher ailleurs ; supprimer avec la même confirmation
  await go(page, "voyage-v-del");
  check(`${tag} « ⋯ » : nom accessible`, await page.$eval("#tripMoreBtn", (b) => !!b.getAttribute("aria-label") && b.getAttribute("aria-haspopup") === "menu"));
  await page.click("#tripMoreBtn");
  await sleep(300);
  check(`${tag} « ⋯ » ouvert, focus sur le premier choix`, await visible(page, "#tripMore") && await page.evaluate(() => document.activeElement.classList.contains("more-item")));
  const items = await page.$$eval("#tripMore .more-item", (l) => l.map((e) => e.textContent.trim()));
  check(`${tag} « ⋯ » : passer en séjour et supprimer (${items.join(" | ")})`, items.length === 2 && items[1] === L.del);
  await page.keyboard.press("ArrowDown");
  check(`${tag} flèche bas : choix suivant`, await page.evaluate(() => document.activeElement.dataset.act === "del-trip"));
  await page.keyboard.press("Escape");
  await sleep(300);
  check(`${tag} Échap referme, focus rendu au bouton « ⋯ »`, !(await visible(page, "#tripMore")) && (await focused(page)) === "tripMoreBtn");
  await page.click("#tripMoreBtn");
  await sleep(200);
  await page.click(".stats");
  await sleep(300);
  check(`${tag} un toucher ailleurs referme « ⋯ »`, !(await visible(page, "#tripMore")));
  await page.click("#tripMoreBtn");
  await sleep(200);
  await page.click('#tripMore [data-act="del-trip"]');
  await sleep(300);
  check(`${tag} confirmation sous l'en-tête`, await visible(page, '.hero .confirm [data-act="del-trip-yes"]') && !(await visible(page, "#tripMore")));
  await page.click('.hero .confirm [data-act="cancel-confirm"]');
  await sleep(300);
  check(`${tag} annuler : voyage gardé`, !(await page.$(".hero .confirm")) && await page.evaluate(() => !!JSON.parse(localStorage.getItem("carnet-route-trips"))["v-del"]));
  await page.click("#tripMoreBtn");
  await sleep(200);
  await page.click('#tripMore [data-act="del-trip"]');
  await sleep(200);
  await page.click('.hero .confirm [data-act="del-trip-yes"]');
  await sleep(600);
  check(`${tag} supprimé : retour à Mes voyages`, await page.evaluate(() => location.hash === "#voyages" && !JSON.parse(localStorage.getItem("carnet-route-trips"))["v-del"]));

  // Menu de gauche en groupes
  const groups = await page.$$eval(".side-group-title", (l) => l.map((e) => e.textContent.trim()).join(","));
  check(`${tag} menu en groupes (${groups})`, groups === L.groups);
  const links = await page.$$eval(".side-nav .nav-link", (l) => l.map((a) => a.getAttribute("href")).join(" "));
  check(`${tag} ordre du menu (${links})`, links === "#voyages #destinations #favoris #fil #decouvrir #mes-publications #notifications #profil #parametres");
  check(`${tag} libellé court « Destinations »`, await page.$eval('.nav-link[href="#destinations"]', (a, label) => a.textContent.trim() === label, L.explore));
  check(`${tag} page active`, await page.$eval('.nav-link[aria-current="page"]', (a) => a.getAttribute("href")) === "#voyages");
  await page.browserContext().close();
}

// ---------- Avec un compte : voyageurs, « Publier », compteur de notifications ----------
async function newUser(email, lang, width) {
  const page = await openPage(lang, width);
  // Écran de connexion : on attend qu'il soit affiché (les comptes se branchent juste après le chargement)
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('#account [data-act="open-auth"]', { visible: true, timeout: 15000 });
    await page.click('#account [data-act="open-auth"]');
    if (await page.waitForSelector('[data-act="auth-mode"][data-mode="signup"]', { visible: true, timeout: 4000 }).catch(() => null)) break;
  }
  await page.click('[data-act="auth-mode"][data-mode="signup"]');
  await page.type("#auth-email", email);
  await page.type("#auth-password", "motdepasse123");
  await page.type("#auth-confirm", "motdepasse123");
  await page.click(".auth-submit");
  await page.waitForSelector('[data-act="verify-later"]', { timeout: 15000 });
  await page.click('[data-act="verify-later"]');
  await sleep(1500);
  return page;
}
for (const [lang, width] of [["fr", 390], ["en", 1366]]) {
  const L = TEXT[lang], tag = `[compte ${lang} ${width}]`;
  const email = `allege.${lang}.${Date.now()}@test.fr`; // unique : le parcours peut être relancé contre les mêmes émulateurs
  const page = await newUser(email, lang, width);
  await go(page, "voyage-v-pt");
  await page.waitForSelector(".sh-dots", { timeout: 10000 }).catch(() => {});
  check(`${tag} ronds des voyageurs dans l'en-tête`, (await page.$$(".sh-dots .sh-dot")).length === 1);
  await page.click(".sh-dots");
  await sleep(400);
  const panel = await page.$eval("#sharePanel", (e) => e.innerText).catch(() => "");
  check(`${tag} panneau des voyageurs : moi, créateur`, panel.includes(email) && panel.includes(L.you));
  await page.click(".sh-invite");
  await sleep(400);
  check(`${tag} « + Inviter » : champ d'invitation prêt`, (await page.evaluate(() => document.activeElement.id)) === "inviteWho");
  await page.click("#sharePanel .sh-close");
  await sleep(300);

  await page.click("#tripMoreBtn");
  await sleep(300);
  const items = await page.$$eval("#tripMore .more-item", (l) => l.map((e) => e.textContent.trim()));
  check(`${tag} « ⋯ » : Publier en premier (${items.join(" | ")})`, items[0] === L.publish);
  await page.click('#tripMore [data-act="open-publish"]');
  await sleep(400);
  check(`${tag} « ⋯ » → Publier : panneau de publication`, await visible(page, ".hero .publish") && !(await visible(page, "#tripMore")));

  // Compteur de notifications dans le groupe du bas
  await page.evaluate(async () => {
    const { state } = await import("/js/store.js");
    state.invitations = [{ id: "x", name: "Test", from: "" }];
    (await import("/js/views/sidebar.js")).renderSidebar();
  });
  check(`${tag} compteur de notifications dans le menu`, await page.$eval('.side-bottom .nav-link[href="#notifications"] .nav-count', (e) => e.textContent.trim() === "1").catch(() => false));
  await page.browserContext().close();
}

console.log(`Allègement : ${ok} vérifications réussies, ${ko} échec(s).`);
await browser.close();
server.close();
process.exit(ko ? 1 : 0);
