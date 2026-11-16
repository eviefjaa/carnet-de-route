// Programme jour par jour d'une étape de road trip : jours, activités hors dates, heures,
// numéro du jour dans le voyage, arrivée et départ tirés des trajets voisins, repli
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { state } = await import(root + "/js/store.js");
const { stopDays, programDays, stopMoves, programSummary, stopProgram } = await import(root + "/js/views/program.js");
const { stopCard, newStop } = await import(root + "/js/views/stop.js");

// Jours : de l'arrivée au départ ; un seul pour un arrêt ; aucun sans dates
assert.deepEqual(stopDays({ arrive: "2030-03-30", depart: "2030-04-01" }), ["2030-03-30", "2030-03-31", "2030-04-01"], "changement de mois");
assert.deepEqual(stopDays({ arrive: "2030-03-02", depart: "2030-03-02" }), ["2030-03-02"], "arrêt sans nuit");
assert.deepEqual(stopDays({ arrive: "", depart: "" }), []);

const stop = { ...newStop("Porto", "2030-03-12"), id: "s", depart: "2030-03-14", todos: [
  { id: "a", text: "Dîner", date: "2030-03-12", time: "20:00", book: true },
  { id: "b", text: "Livraria", date: "2030-03-12", time: "09:30", book: false },
  { id: "c", text: "Sans heure", date: "2030-03-12", book: false },
  { id: "d", text: "Hors dates", date: "2030-03-20", book: false },
  { id: "e", text: "Sans date", book: true, done: true },
] };
{ const days = programDays(stop, { firstDay: 3 });
  assert.deepEqual(days.map((d) => d.title), ["Jour 3", "Jour 4", "Jour 5", "Pas encore de jour"], "numéro du jour dans le voyage");
  assert.deepEqual(days[0].list.map((x) => x.id), ["b", "a", "c"], "par heure, puis sans heure");
  assert.deepEqual(days[3].list.map((x) => x.id), ["d", "e"], "hors des dates et sans date : à part");
  assert.equal(days[1].list.length, 0); }
assert.deepEqual(programDays({ ...stop, arrive: "", depart: "" }).map((d) => d.title), ["Activités"], "étape sans dates : un seul bloc");
assert.deepEqual(programDays({ ...stop, depart: "2030-03-12" }).map((d) => d.title), ["Jour 1", "Pas encore de jour"], "arrêt : un seul jour");

// Arrivée et départ : heures des trajets voisins, seulement si leur date tombe le premier ou le dernier jour
{ const trip = { items: [
    { id: "t1", type: "transport", dep: "2030-03-12T07:00", arr: "2030-03-12T10:15" }, stop,
    { id: "t2", type: "transport", dep: "2030-03-14T18:40", arr: "" }] };
  const moves = stopMoves(trip, 1);
  assert.deepEqual(moves, { arrive: { date: "2030-03-12", time: "10:15" }, depart: { date: "2030-03-14", time: "18:40" } });
  const days = programDays(stop, { moves });
  assert.deepEqual(days.map((d) => d.moves), [{ arrive: "10:15", depart: "" }, { arrive: "", depart: "" }, { arrive: "", depart: "18:40" }, {}]);
  const late = programDays(stop, { moves: stopMoves({ items: [{ type: "transport", arr: "2030-03-13T10:00" }, stop] }, 1) });
  assert.equal(late[0].moves.arrive, "", "arrivée un autre jour : pas de ligne");
  assert.deepEqual(stopMoves({ items: [{ type: "stop" }, stop] }, 1), { arrive: {}, depart: {} }, "pas de trajet voisin");
  assert.equal(stopMoves({ items: [{ type: "transport", arr: "2030-03-12" }, stop] }, 1).arrive.time, "", "trajet sans heure : pas de ligne"); }

// Replié par défaut : une ligne, avec le nombre d'activités, de jours et ce qui reste à réserver
assert.equal(programSummary(stop), `5 activités sur 3 jours · <span class="pg-pending">1 à réserver</span>`);
assert.equal(programSummary({ ...stop, todos: [stop.todos[1]] }), "1 activité sur 3 jours", "rien à réserver : rien d'affiché");
assert.equal(programSummary({ ...stop, todos: [] }), "rien de prévu");
state.programOpen = new Set();
{ const html = stopProgram(stop);
  assert.match(html, /<button class="pg-toggle" data-act="program-toggle" data-stop="s" type="button" aria-expanded="false" aria-controls="pg-s">/);
  assert.match(html, /<div class="pg-days" id="pg-s" hidden><\/div>/, "replié : jours pas affichés");
  assert.doesNotMatch(html, /data-act="act-add"/, "le « + » est dans les jours");
  assert.match(stopProgram({ ...stop, todos: [] }), /Programme<\/b> · rien de prévu[\s\S]*data-act="act-add" data-stop="s" data-date="2030-03-12"/, "étape vide : bouton + (premier jour)"); }
state.programOpen.add("s");
{ const html = stopProgram(stop, { firstDay: 3 });
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-label="Jour 3 [^"]*12 mars"/);
  assert.equal((html.match(/data-act="act-add"/g) || []).length, 4, "un + par jour, et dans « Pas encore de jour »");
  assert.match(html, /data-act="act-add" data-stop="s" data-date="2030-03-13"/, "le + d'un jour préremplit sa date"); }

// Dans la carte de l'étape : le numéro du jour suit celui du voyage, Arrivée et Départ des trajets
{ const first = { ...newStop("Lisbonne", "2030-03-10"), id: "l", depart: "2030-03-12" };
  const leg = { id: "t", type: "transport", mode: "train", from: "Lisbonne", to: "Porto", dep: "2030-03-12T08:00", arr: "2030-03-12T11:05" };
  const trip = { currency: "EUR", items: [first, leg, stop] };
  state.openItems = new Set(["s"]);
  const card = stopCard(stop, trip, 2);
  assert.match(card, /<span class="day">JOUR 3<\/span>/);
  assert.match(card, /aria-label="Jour 3 [^"]*12 mars"/, "même numéro que le badge JOUR");
  assert.match(card, /<li class="sj-move"><time class="sj-time">11 h 05<\/time><span>Arrivée<\/span><\/li>/);
  assert.doesNotMatch(card, /class="checklist"/, "plus d'ancienne checklist"); }

console.log("Programme des étapes : tout passe.");
