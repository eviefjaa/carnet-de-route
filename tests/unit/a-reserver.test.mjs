// Page « À réserver » (js/views/to-book.js) : activités à réserver rangées par étape, puis date et heure,
// sans date à la fin ; autant d'activités que la pastille « N à réserver » (tripPending)
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { toBookList, toBookView, toBookLink } = await import(root + "/js/views/to-book.js");
const { tripPending } = await import(root + "/js/views/checklist.js");
const { state } = await import(root + "/js/store.js");

const trip = { name: "Portugal & Galice", currency: "EUR", items: [
  { id: "s1", type: "stop", place: "Lisbonne", arrive: "2030-05-10", depart: "2030-05-13", todos: [
    { id: "a", text: "Sans date", book: true },
    { id: "b", text: "Tour de Belém", date: "2030-05-11", time: "10:00", price: 12 },
    { id: "c", text: "Fado", date: "2030-05-11", time: "21:00", book: true },
    { id: "d", text: "Déjà réservé", date: "2030-05-10", book: true, done: true },
    { id: "e", text: "Libre", date: "2030-05-10", book: false },
    { id: "f", text: "Matin", date: "2030-05-11", book: true },
  ] },
  { id: "t", type: "transport", from: "Lisbonne", to: "Porto" },
  { id: "s2", type: "stop", place: "Porto", arrive: "2030-05-13", depart: "2030-05-15", todos: [{ id: "g", text: "Caves", date: "2030-05-14", book: true }] },
  { id: "s3", type: "stop", place: "Braga", arrive: "2030-05-15", depart: "2030-05-15", todos: [{ id: "h", text: "Rien", book: false }] },
] };

{ const groups = toBookList(trip);
  assert.deepEqual(groups.map((g) => g.title), ["Jour 1 · Lisbonne", "Jour 4 · Porto"], "étapes dans l'ordre, avec leur jour ; sans rien à réserver : absente");
  // Même jour : celles sans heure après celles qui en ont une
  assert.deepEqual(groups[0].list.map((x) => x.id), ["b", "c", "f", "a"], "date puis heure, sans date à la fin");
  assert.equal(groups.reduce((n, g) => n + g.list.length, 0), tripPending(trip), "autant que la pastille"); }

// Séjour : le nom du lieu, sans numéro de jour
{ const s = { kind: "sejour", items: [{ id: "r", type: "stop", place: "Rome", arrive: "2030-09-10", depart: "2030-09-13", todos: [{ id: "x", text: "Colisée", book: true }] }] };
  assert.deepEqual(toBookList(s).map((g) => g.title), ["Rome"]); }

// Page : compteur, case « Réservé : … », lien « Voir … dans le programme », noms échappés
{ state.toBookShown = null;
  const html = toBookView("v1", { ...trip, items: trip.items.map((i) => i.id === "s2" ? { ...i, todos: [{ id: "g", text: "<b>Caves</b>", date: "2030-05-14", book: true }] } : i) });
  assert.match(html, /<h1>À réserver<\/h1>/);
  assert.match(html, /Portugal &amp; Galice · <span id="toBookCount" aria-live="polite">5 activités<\/span>/);
  assert.match(html, /aria-label="Réservé : Tour de Belém"/);
  assert.match(html, /aria-label="Voir Tour de Belém dans le programme"/);
  assert.match(html, /sam\. 11 mai · 10 h 00 · 12\s€/);
  assert.match(html, /Pas encore de jour/);
  assert.doesNotMatch(html, /<b>Caves<\/b>/);
  assert.match(html, /id="toBookDone" hidden/, "« Tout est réservé » caché tant qu'il reste quelque chose"); }

// Cochée sur la page : elle reste, « done », et le compteur descend ; en rouvrant la page, elle n'y est plus
{ state.toBookShown = null;
  const t2 = structuredClone(trip);
  toBookView("v1", t2);
  t2.items[0].todos.find((x) => x.id === "b").done = true;
  const again = toBookView("v1", t2);
  assert.match(again, /class="tb-act done" data-tb="b"/, "toujours affichée, réservée");
  assert.match(again, /4 activités/);
  state.toBookShown = null; // on a quitté la page
  assert.doesNotMatch(toBookView("v1", t2), /data-tb="b"/, "rouverte : plus là"); }

// Tout est réservé
{ state.toBookShown = null;
  const none = toBookView("v1", { name: "X", items: [{ id: "s", type: "stop", place: "A", todos: [{ id: "z", text: "ok", book: true, done: true }] }] });
  assert.match(none, /id="toBookDone">/);
  assert.match(none, /Tout est réservé/); }

// Pastille : lien vers la page, libellé pour les lecteurs d'écran
assert.equal(toBookLink("v1", 8, "8 à réserver"), `<a class="todo-alert is-link" href="#a-reserver-v1" aria-label="Voir les 8 activités à réserver">8 à réserver <span aria-hidden="true">›</span></a>`);

console.log("À réserver : tout passe.");
