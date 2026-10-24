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

// Publication reçue : nombres entiers seulement, textes coupés, aucun HTML dans la carte affichée
const post = normalizePost("p1", { owner: "u", ownerName: TRAP, ownerHandle: "h", title: TRAP, visibility: "public", publishedAt: 1,
  trip: { days: TRAP, nights: TRAP, items: [null, { type: "stop", place: TRAP, nights: TRAP, day: "2" }] }, recos: "x" });
assert.equal(post.trip.days, null);
assert.equal(post.trip.items[0].nights, null);
assert.deepEqual(post.recos, []);
const html = postCard(post);
assert.doesNotMatch(html, /<iframe|<script/);

console.log("Sécurité : les valeurs piégées sont neutralisées.");
