// Résumé des changements d'un voyageur (notifications des voyages partagés) et regroupement en séries
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { describeChanges, mergeEdit, editText, SERIES_MS } = await import(root + "/js/changes.js");
const { publicCopy } = await import(root + "/js/publish.js");
const { tripFromPost } = await import(root + "/js/fork.js");

const lis = { id: "a", type: "stop", place: "Lisbonne", arrive: "2030-06-01", depart: "2030-06-03", price: 200, address: "", notes: "", links: [], geo: { q: "Lisbonne", lat: 38.7, lng: -9.1 },
  todos: [{ id: "t1", text: "Tram 28", done: false, book: true, tickets: [] }] };
const leg = { id: "l", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2030-06-03T09:00", arr: "", price: 30, notes: "", tickets: [], route: { key: "x", line: "abc" } };
const por = { id: "b", type: "stop", place: "Porto", arrive: "2030-06-03", depart: "2030-06-05", price: null, todos: [] };
const base = { name: "Portugal", currency: "EUR", items: [lis, leg, por] };
const clone = (x) => JSON.parse(JSON.stringify(x));
const after = (fn) => { const t = clone(base); fn(t); return describeChanges(base, t); };

assert.deepEqual(describeChanges(base, clone(base)), [], "aucun changement");
assert.deepEqual(after((t) => { t.items[0].geo = { q: "Lisbonne", lat: 1, lng: 2 }; t.items[1].route = { key: "y", line: "zzz", km: 300 }; t.items[1].fromGeo = { lat: 1, lng: 1 }; }), [], "positions et tracés : rien");
assert.deepEqual(after((t) => t.items.push({ id: "c", type: "stop", place: "Braga", todos: [] })), ["ajout de l'étape Braga"]);
assert.deepEqual(after((t) => t.items.splice(2, 1)), ["suppression de l'étape Porto"]);
assert.deepEqual(after((t) => t.items.push({ id: "m", type: "transport", from: "Porto", to: "Braga" })), ["ajout du trajet Porto → Braga"]);
assert.deepEqual(after((t) => t.items.splice(1, 1)), ["suppression du trajet Lisbonne → Porto"]);
assert.deepEqual(after((t) => { t.items[2].depart = "2030-06-06"; }), ["dates de Porto"]);
assert.deepEqual(after((t) => { t.items[2].place = "Osaka"; t.items[2].depart = "2030-06-06"; t.items[2].notes = "x"; }), ["dates d'Osaka", "hébergement d'Osaka", "nom de l'étape Osaka"], "élision devant une voyelle");
assert.deepEqual(after((t) => { t.items[0].arriveTime = "11:00"; }), ["dates de Lisbonne"], "heures comprises");
assert.deepEqual(after((t) => { t.items[0].notes = "Code 1234"; }), ["hébergement de Lisbonne"]);
assert.deepEqual(after((t) => { t.items[0].links = [{ id: "x", url: "https://a.fr" }]; }), ["hébergement de Lisbonne"]);
assert.deepEqual(after((t) => { t.items[1].dep = "2030-06-03T10:00"; }), ["trajet Lisbonne → Porto"]);
assert.deepEqual(after((t) => { t.items[2].todos.push({ id: "x", text: "Cave" }, { id: "y", text: "Livraria" }); }), ["2 activités ajoutées à Porto"]);
assert.deepEqual(after((t) => { t.items[2].todos.push({ id: "x", text: "Cave" }); }), ["1 activité ajoutée à Porto"]);
assert.deepEqual(after((t) => { t.items[0].todos[0].done = true; }), ["activités de Lisbonne"], "cochée");
assert.deepEqual(after((t) => { t.items[0].todos = []; }), ["activités de Lisbonne"], "supprimée");
assert.deepEqual(after((t) => { t.items[0].todos[0].tickets = [{ id: "f" }]; }), ["billets de Lisbonne"]);
assert.deepEqual(after((t) => { t.items[1].tickets = [{ id: "f" }]; }), ["billets de Lisbonne → Porto"]);
assert.deepEqual(after((t) => { t.items.reverse(); }), ["ordre des étapes"]);
assert.deepEqual(after((t) => { t.name = "Portugal 2027"; t.currency = "BRL"; }), ["nom du voyage", "devise du voyage"]);
// Plusieurs changements, dans l'ordre prévu
assert.deepEqual(after((t) => { t.name = "P"; t.items[2].todos.push({ id: "x", text: "Cave" }); t.items[2].depart = "2030-06-06"; t.items.push({ id: "c", type: "stop", place: "Braga", todos: [] }); }),
  ["ajout de l'étape Braga", "dates de Porto", "1 activité ajoutée à Porto", "nom du voyage"]);
// Seulement mes changements : ceux des autres arrivés entre-temps ne comptent pas (comparaison avec la base)
{ const mine = clone(base); mine.items[2].depart = "2030-06-06";
  assert.deepEqual(describeChanges(base, mine), ["dates de Porto"]); }
assert.equal(describeChanges(null, base).length, 0);
assert.ok(after((t) => { t.items.push({ id: "c", type: "stop", place: "x".repeat(300), todos: [] }); })[0].length <= 120, "120 caractères au plus");

// Regroupement : dans l'heure on complète, sans doublon ; au-delà de 5, « more » ; après une heure, nouvelle série
const now = 10 * SERIES_MS;
{ const e = mergeEdit(null, ["a", "b"], now);
  assert.deepEqual(e, { what: ["a", "b"], more: 0, since: null }, "première série");
  const prev = { at: now - 60000, since: now - 600000, what: ["a", "b"], more: 0 };
  assert.deepEqual(mergeEdit(prev, ["b", "c"], now), { what: ["a", "b", "c"], more: 0, since: now - 600000 }, "dans l'heure : complétée, début inchangé");
  assert.deepEqual(mergeEdit({ ...prev, what: ["a", "b", "c", "d"] }, ["e", "f", "g"], now), { what: ["a", "b", "c", "d", "e"], more: 2, since: now - 600000 }, "5 phrases au plus, le reste compté");
  assert.deepEqual(mergeEdit({ ...prev, more: 2 }, ["z"], now).more, 2, "« more » gardé");
  assert.deepEqual(mergeEdit({ ...prev, at: now - SERIES_MS - 1 }, ["z"], now), { what: ["z"], more: 0, since: null }, "plus d'une heure : nouvelle série"); }

// Texte de la notification
assert.equal(editText(["ajout de l'étape Porto", "2 activités ajoutées à Lisbonne"], 3), "ajout de l'étape Porto, 2 activités ajoutées à Lisbonne et 3 autres changements");
assert.equal(editText(["dates de Porto"], 0), "dates de Porto");
assert.equal(editText(["a", "b"], 1), "a, b et 1 autre changement");

// Jamais publié ni repris dans une copie
{ const t = { ...clone(base), lastEdit: { u: { at: 1, since: 1, what: ["secret"], more: 0 } } };
  assert.doesNotMatch(JSON.stringify(publicCopy(t)), /lastEdit|secret/);
  assert.doesNotMatch(JSON.stringify(tripFromPost({ id: "p", title: "x", ownerHandle: "h", trip: publicCopy(t) })), /lastEdit|secret/); }

console.log("Résumé des changements : tout passe.");
