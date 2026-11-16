// Prix des activités : budget (colonne « Activités »), formulaires, normalisation, budget publié
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { computeBudget } = await import(root + "/js/budget.js");
const { parsePrice } = await import(root + "/js/utils.js");
const { normalizeTrip } = await import(root + "/js/cloud.js");
const { publicBudget } = await import(root + "/js/publish.js");
const { normalizePost } = await import(root + "/js/social.js");
const { budgetSection } = await import(root + "/js/views/budget.js");
const { readActivityForm, stopProgram, programSummary } = await import(root + "/js/views/program.js");
const { readStopForm, todoRow } = await import(root + "/js/views/stop.js");
const { state } = await import(root + "/js/store.js");

assert.equal(parsePrice("12,50"), 12.5);

// Budget : activités avec et sans prix ; une activité sans prix n'est pas un prix manquant
const trip = { currency: "EUR", items: [
  { id: "a", type: "stop", place: "Lisbonne", price: 300, todos: [{ id: "1", text: "Musée", price: 12.5 }, { id: "2", text: "Balade" }, { id: "3", text: "Fado", price: 40 }] },
  { id: "t", type: "transport", price: 30 },
  { id: "b", type: "stop", place: "Porto", price: null, todos: [{ id: "4", text: "Cave", price: 15 }] },
  { id: "u", type: "transport", price: 80 }] };
{ const { rows, total } = computeBudget(trip);
  assert.deepEqual(rows.map((r) => [r.place, r.lodging, r.transport, r.activities, r.total]),
    [["Lisbonne", 300, 0, 52.5, 352.5], ["Porto", 0, 30, 15, 45], ["Autres trajets", 0, 80, 0, 80]]);
  assert.deepEqual([total.lodging, total.transport, total.activities, total.total, total.missing], [300, 110, 67.5, 477.5, 1], "seul le prix de Porto manque");
  const html = budgetSection(trip);
  assert.match(html, /<th scope="col">Transport<\/th><th scope="col">Activités<\/th><th scope="col">Total<\/th>/);
  assert.match(html, /<th scope="row">Autres trajets<\/th>[\s\S]*?<td>–<\/td>\s*<td class="b-total">/, "Autres trajets : pas d'activités");
  assert.match(html, /dont 300\s€ d'hébergement, 110\s€ de transport et 67,50\s€ d'activités/);
  assert.match(html, /1 prix pas encore renseigné\./); }
// Séjour : une ligne pour le lieu, même calcul
{ const s = computeBudget({ kind: "sejour", items: [{ id: "s", type: "stop", place: "Rome", price: 500, todos: [{ id: "x", text: "Colisée", price: 18 }] }] });
  assert.deepEqual([s.rows.length, s.rows[0].activities, s.total.total, s.total.missing], [1, 18, 518, 0]); }

// Programme : prix à droite du texte, total dans le résumé replié
state.currentId = "v"; state.trips = { v: trip };
state.programOpen = new Set(["a"]);
{ const html = stopProgram(trip.items[0]);
  assert.match(html, /<span class="sj-text">Musée<\/span>\s*<span class="price sj-price">12,50\s€<\/span>/);
  assert.doesNotMatch(html.slice(html.indexOf("Balade")), /^Balade<\/span>\s*<span class="price/, "sans prix : rien");
  assert.match(programSummary(trip.items[0]), /^3 activités · <span class="pg-pending">3 à réserver<\/span> · 52,50\s€$/);
  assert.equal(programSummary({ ...trip.items[0], todos: [{ id: "z", text: "Gratuit", book: false }] }), "1 activité", "sans prix : pas de total"); }

// Formulaires : le prix est lu dans le formulaire d'activité et dans celui de l'étape
const field = (value) => ({ value, checked: false });
assert.equal(readActivityForm({ text: field("Musée"), date: field(""), time: field(""), how: field(""), maps: field(""), book: field(""), price: field("12,50") }).price, 12.5);
assert.equal(readActivityForm({ text: field("Musée"), date: field(""), time: field(""), how: field(""), maps: field(""), book: field(""), price: field("") }).price, null);
assert.match(todoRow({ id: "r", text: "Cave", price: 15 }), /name="todoPrice" id="td-price-r" value="15"/);
{ const row = (vals) => ({ dataset: { todoRow: "r" }, querySelector: (sel) => ({ value: vals[sel.match(/name="(\w+)"/)[1]] || "", checked: false }) });
  const f = { dataset: { id: "s" }, place: { ...field("Porto"), dataset: {} }, arrive: field(""), depart: field(""), address: field(""), notes: field(""), price: field(""),
    querySelectorAll: (sel) => (sel === "[data-todo-row]" ? [row({ todoText: "Cave", todoPrice: "15,5" })] : []) };
  assert.equal(readStopForm(f).todos[0].price, 15.5, "enregistrer l'étape garde le prix"); }

// Normalisation : un prix invalide est écarté
{ const t = normalizeTrip({ items: [{ id: "s", type: "stop", todos: [{ id: "a", text: "x", price: -3 }, { id: "b", text: "y", price: "12" }, { id: "c", text: "z", price: 9.9 }, { id: "d", text: "w" }] }] });
  assert.deepEqual(t.items[0].todos.map((x) => x.price), [null, null, 9.9, undefined]); }

// Budget publié : total des activités par ligne, jamais le prix d'une activité ; anciennes publications : 0
{ const b = publicBudget(trip);
  assert.equal(b.activities, 67.5);
  assert.deepEqual(b.rows.map((r) => r.activities), [52.5, 15, 0]);
  assert.doesNotMatch(JSON.stringify(b), /Musée|12\.5/);
  const old = normalizePost("p", { title: "x", visibility: "public", trip: { items: [], budget: { currency: "EUR", lodging: 10, transport: 5, missing: 0, rows: [{ place: "A", lodging: 10, transport: 5 }] } } });
  assert.deepEqual([old.trip.budget.activities, old.trip.budget.rows[0].activities], [0, 0]); }

console.log("Prix des activités : tout passe.");
