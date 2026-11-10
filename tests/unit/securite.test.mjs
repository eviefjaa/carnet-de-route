// Valeurs piégées venues d'un autre compte : neutralisées côté site, même si une règle Firestore manquait
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const TRAP = '<iframe srcdoc="<script src=https://unpkg.com/piege/x.js></script>">';
const { plural } = await import(root + "/js/utils.js");
const { fmtSize } = await import(root + "/js/views/tickets.js");
const { normalizeTrip } = await import(root + "/js/cloud.js");
const { normalizePost } = await import(root + "/js/social.js");
const { postCard } = await import(root + "/js/views/social.js");

// Nombres : toujours de vrais nombres
assert.equal(plural(TRAP, "jour"), "0 jour");
assert.equal(plural(3, "nuit"), "3 nuits");
assert.doesNotMatch(fmtSize(TRAP), /</);

// Voyage reçu : chaque champ au bon type, rien qui fasse planter l'affichage
const trip = normalizeTrip({ name: 5, items: [null, "x", { id: "a", type: "stop", place: 7, arrive: { a: 1 }, nights: TRAP, todos: "x", tickets: [{ id: 1, size: TRAP }],
  route: { key: "k", km: TRAP } }, { id: "b", type: "<b>", place: "ignoré" }] });
assert.equal(trip.name, "Sans titre");
assert.equal(trip.items.length, 1);
assert.equal(trip.items[0].place, "");
assert.equal(trip.items[0].arrive, "");
assert.equal("nights" in trip.items[0], false);
assert.deepEqual(trip.items[0].todos, []);
assert.equal(trip.items[0].tickets[0].size, 0);
// Date d'activité : seule une vraie date AAAA-MM-JJ est gardée
{ const t = normalizeTrip({ items: [{ id: "s", type: "stop", todos: [{ id: "a", text: "ok", date: "2030-03-03" },
    { id: "b", text: "piège", date: '"><img src=x onerror=alert(1)>' }, { id: "c", text: "objet", date: { x: 1 } }] }] });
  assert.deepEqual(t.items[0].todos.map((x) => x.date), ["2030-03-03", "", ""]); }
// Séjour : type, heure et « comment y aller » remis au bon format
{ const t = normalizeTrip({ kind: "<b>", items: [{ id: "s", type: "stop", todos: [{ id: "a", text: "ok", time: "10:30", how: "Métro 1" },
    { id: "b", text: "piège", time: "25:99<script>", how: { x: 1 } }] }] });
  assert.equal("kind" in t, false, "type inconnu : road trip");
  assert.deepEqual(t.items[0].todos.map((x) => [x.time, x.how]), [["10:30", "Métro 1"], ["", ""]]);
  assert.equal(normalizeTrip({ kind: "sejour", items: [] }).kind, "sejour"); }

// Publication reçue : nombres entiers seulement, textes coupés, aucun HTML dans la carte affichée
const post = normalizePost("p1", { owner: "u", ownerName: TRAP, ownerHandle: "h", title: TRAP, visibility: "public", publishedAt: 1,
  trip: { days: TRAP, nights: TRAP, items: [null, { type: "stop", place: TRAP, nights: TRAP, day: "2" }] }, recos: "x" });
assert.equal(post.trip.days, null);
assert.equal(post.trip.items[0].nights, null);
assert.deepEqual(post.recos, []);
const html = postCard(post);
assert.doesNotMatch(html, /<iframe|<script/);

// Liste « Mes voyages » avec un voyage partagé au nom piégé, en mode normal et en mode sélection
const { state } = await import(root + "/js/store.js");
const { tripsListView } = await import(root + "/js/views/trips-list.js");
state.trips = { ['x" onclick="alert(1)']: normalizeTrip({ name: TRAP, owner: "autre", items: [] }) };
state.user = { uid: "moi" };
for (const selecting of [false, true]) {
  state.selecting = selecting;
  state.selected = new Set(Object.keys(state.trips));
  state.confirm = selecting ? "select-delete" : null;
  const list = tripsListView();
  assert.doesNotMatch(list, /<iframe|<script| onclick="/, `liste des voyages (sélection : ${selecting})`);
  if (selecting) assert.match(list, /Quitter 1 voyage partagé \? /, "un voyage d'un autre est quitté, pas supprimé");
}

console.log("Sécurité : les valeurs piégées sont neutralisées.");
