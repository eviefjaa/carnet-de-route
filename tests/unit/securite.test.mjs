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
const { normalizePost, normalizeComment } = await import(root + "/js/social.js");
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
// « À réserver » : un booléen, et seul false veut dire « rien à réserver »
{ const t = normalizeTrip({ items: [{ id: "s", type: "stop", todos: [{ id: "a", text: "x", book: false }, { id: "b", text: "y", book: "<b>" }, { id: "c", text: "z" }] }] }).items[0].todos;
  assert.deepEqual(t.map((x) => x.book), [false, true, undefined]); }
// Heures d'arrivée et de départ d'un séjour : HH:MM ou vide
{ const s = normalizeTrip({ items: [{ id: "s", type: "stop", arriveTime: "15:00", departTime: "<img onerror>" }, { id: "t", type: "stop", arriveTime: { x: 1 } }] }).items;
  assert.deepEqual([s[0].arriveTime, s[0].departTime, s[1].arriveTime, "departTime" in s[1]], ["15:00", "", "", false]); }

// Commentaire reçu : textes, réponse et j'aime au bon type
{ const c = normalizeComment("c1", { author: 5, text: TRAP, replyTo: { x: 1 }, likedBy: ["a", 3, null, "b"], createdAt: "hier" });
  assert.equal(c.author, "");
  assert.equal(c.replyTo, "");
  assert.deepEqual(c.likedBy, ["a", "b"]);
  assert.ok(Number.isFinite(c.createdAt));
  assert.deepEqual(normalizeComment("c2", {}).likedBy, []); }

// Publication reçue : nombres entiers seulement, textes coupés, aucun HTML dans la carte affichée
const post = normalizePost("p1", { owner: "u", ownerName: TRAP, ownerHandle: "h", title: TRAP, visibility: "public", publishedAt: 1,
  trip: { days: TRAP, nights: TRAP, items: [null, { type: "stop", place: TRAP, nights: TRAP, day: "2" }] }, recos: "x" });
assert.equal(post.trip.days, null);
assert.equal(post.trip.items[0].nights, null);
assert.deepEqual(post.recos, []);
// Programme d'un séjour publié : entiers, heure bien formée, textes coupés
{ const q = normalizePost("p2", { trip: { kind: "sejour", items: [{ type: "stop", program: [null, { text: "ok", day: 2, time: "09:45", how: "Tram" },
    { text: TRAP, day: "2", time: "<b>", how: { x: 1 } }, { text: "", day: 1 }] }] } });
  assert.equal(q.trip.kind, "sejour");
  assert.deepEqual(q.trip.items[0].program.map((a) => [a.day, a.time, a.how]), [[2, "09:45", "Tram"], [null, "", ""]]);
  assert.equal(normalizePost("p3", { trip: { kind: "x" } }).trip.kind, ""); }
// Budget publié : montants positifs, devise en 3 lettres, sinon pas de budget
{ const b = normalizePost("p4", { trip: { budget: { currency: "EUR", lodging: 999, transport: -3, missing: "x", rows: [null, { place: TRAP, lodging: "<b>", transport: 50 }] } } }).trip.budget;
  assert.deepEqual([b.lodging, b.transport, b.missing, b.rows.length, b.rows[0].lodging, b.rows[0].transport], [999, 0, 0, 1, 0, 50]);
  assert.ok(b.rows[0].place.length <= 120);
  assert.equal(normalizePost("p5", { trip: { budget: { currency: "<b>" } } }).trip.budget, null);
  assert.equal(normalizePost("p6", { trip: {} }).trip.budget, null); }
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
