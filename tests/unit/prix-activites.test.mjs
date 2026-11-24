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
const { readActivityForm, programPanel, programPill } = await import(root + "/js/views/program.js");
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
  // Replié (par défaut) : une ligne avec le total et les prix manquants
  const short = budgetSection(trip);
  assert.match(short, /aria-expanded="false"/);
  assert.match(short, /<b>477,50\s€<\/b> <span class="b-missing">· 1 prix manquant<\/span>/);
  assert.doesNotMatch(short, /budget-table/);
  state.budgetOpen = true;
  const html = budgetSection(trip);
  state.budgetOpen = false;
  assert.match(html, /<th scope="col">Transport<\/th><th scope="col">Activités<\/th><th scope="col">Total<\/th>/);
  assert.match(html, /class="b-place">Autres trajets<\/span>[\s\S]*?<td>–<\/td>\s*<td class="b-total">/, "Autres trajets : pas d'activités");
  assert.match(html, /dont 300\s€ d'hébergement, 110\s€ de transport et 67,50\s€ d'activités/);
  assert.match(html, /1 prix pas encore renseigné : hébergement à Porto\./, "le prix manquant est nommé"); }
// Ce qui manque est nommé, dans l'ordre de l'itinéraire (trajet puis hébergement), noms échappés
{ const b = computeBudget({ items: [{ id: "v", type: "transport", from: "Prague", to: "São Paulo" },
    { id: "s", type: "stop", place: "São Paulo", arrive: "2026-12-18", depart: "2026-12-18" },
    { id: "w", type: "transport", from: "São Paulo", to: "<b>Curitiba</b>", price: 20 },
    { id: "c", type: "stop", place: "<b>Curitiba</b>", arrive: "2026-12-23", depart: "2026-12-25" },
    { id: "z", type: "transport", to: "Rio" }] });
  assert.deepEqual(b.total.missingList, [{ leg: { from: "Prague", to: "São Paulo" } }, { lodging: "<b>Curitiba</b>" }, { leg: { from: "", to: "Rio" } }]);
  state.budgetOpen = true;
  const html = budgetSection({ currency: "EUR", items: [{ id: "v", type: "transport", from: "Prague", to: "São Paulo" },
    { id: "c", type: "stop", place: "<b>Curitiba</b>", arrive: "2026-12-23", depart: "2026-12-25" }] });
  state.budgetOpen = false;
  assert.match(html, /2 prix pas encore renseignés : trajet Prague → São Paulo, hébergement à &lt;b&gt;Curitiba&lt;\/b&gt;\./);
  const { setLang } = await import(root + "/js/i18n.js");
  setLang("en");
  state.budgetOpen = true;
  const en = budgetSection({ currency: "EUR", items: [{ id: "z", type: "transport", to: "Rio" }] });
  state.budgetOpen = false;
  setLang("fr");
  assert.match(en, /1 price still missing: journey From\? → Rio\./); }
// Arrêt (arrivée et départ le même jour) : pas d'hébergement, pas de prix manquant ; un prix saisi est compté.
// Point de départ ou d'arrivée (une seule date) : pas de nuit, rien ne manque.
// Étape sans dates : on ne sait pas, le prix manque toujours.
{ const b = computeBudget({ items: [{ id: "h", type: "stop", place: "Sintra", arrive: "2030-06-03", depart: "2030-06-03" },
    { id: "n", type: "stop", place: "Porto", arrive: "2030-06-03", depart: "2030-06-05" }, { id: "x", type: "stop", place: "Nulle part" },
    { id: "p", type: "stop", place: "Braga", arrive: "2030-06-05", depart: "2030-06-05", price: 20 },
    { id: "d", type: "stop", place: "São Paulo", depart: "2030-06-01" }, { id: "f", type: "stop", place: "São Paulo", arrive: "2030-06-09" }] });
  assert.deepEqual(b.rows.map((r) => r.missing), [0, 1, 1, 0, 0, 0], "arrêt, départ ou arrivée sans prix : rien ne manque");
  assert.equal(b.total.lodging, 20, "prix d'un arrêt compté");
  assert.equal(computeBudget({ items: [{ id: "u", type: "stop" }] }).rows[0].place, "Étape sans nom"); }
{ const { setLang } = await import(root + "/js/i18n.js");
  setLang("en");
  const b = computeBudget({ items: [{ id: "u", type: "stop" }, { id: "t", type: "transport", price: 5 }] });
  assert.deepEqual(b.rows.map((r) => r.place), ["Unnamed stop", "Other journeys"], "libellés du budget en anglais");
  setLang("fr"); }
// Séjour : une ligne pour le lieu, même calcul
{ const s = computeBudget({ kind: "sejour", items: [{ id: "s", type: "stop", place: "Rome", price: 500, todos: [{ id: "x", text: "Colisée", price: 18 }] }] });
  assert.deepEqual([s.rows.length, s.rows[0].activities, s.total.total, s.total.missing], [1, 18, 518, 0]); }

// Programme : prix à droite du texte, total dans le résumé replié
state.currentId = "v"; state.trips = { v: trip };
state.programOpen = new Set(["a"]);
{ const html = programPanel(trip.items[0]);
  assert.match(html, /<span class="sj-text">Musée<\/span>\s*<span class="price sj-price">12,50\s€<\/span>/);
  assert.doesNotMatch(html.slice(html.indexOf("Balade")), /^Balade<\/span>\s*<span class="price/, "sans prix : rien");
  assert.match(html, /<p class="pg-meta">52,50\s€ d'activités<\/p>/, "total des prix en haut du programme (étape sans dates)");
  assert.doesNotMatch(programPill(trip.items[0]), /€/, "pas de prix dans la pastille");
  state.programOpen.add("z");
  assert.doesNotMatch(programPanel({ ...trip.items[0], id: "z", todos: [{ id: "z", text: "Gratuit", book: false }] }), /pg-meta/, "sans prix ni dates : pas de ligne"); }

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
