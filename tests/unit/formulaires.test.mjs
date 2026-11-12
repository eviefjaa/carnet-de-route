import assert from "node:assert/strict";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
const { state } = await import(root + "/js/store.js");
const { stopForm, newStop, stopCard } = await import(root + "/js/views/stop.js");
const { transportForm, transportCard } = await import(root + "/js/views/transport.js");
const { checklist } = await import(root + "/js/views/checklist.js");
const { byDate } = await import(root + "/js/utils.js");

// Étape : formulaire de création avec une checklist vide, puis de modification avec ses activités
assert.match(stopForm(newStop("Lyon"), true), /data-act="add-todo-row"/);
const stop = { ...newStop("Lyon"), todos: [{ id: "t1", text: "Musée <Lumière>", done: true, tickets: [{ id: "f1", name: "billet.pdf", type: "application/pdf", size: 1000 }] }] };
const sf = stopForm(stop, false);
assert.match(sf, /data-todo-row="t1"/);
assert.match(sf, /value="Musée &lt;Lumière&gt;"/);
assert.match(sf, /name="todoDone"[^>]* checked/);
assert.match(sf, /1 billet</);

// Sans compte : pas de bouton billet sur les activités
assert.doesNotMatch(checklist(stop), /data-ticket-input/);
state.user = { uid: "u", email: "a@b.c" };
const cl = checklist(stop);
assert.match(cl, /data-ticket-input="[^"]+" data-tk-todo="t1"/);
assert.match(cl, /data-act="ticket-open" data-item="[^"]+" data-tk-todo="t1" data-file="f1"/);

// Trajet : billets dans le formulaire (existants + à envoyer) et sur la carte
const leg = { id: "l1", type: "transport", mode: "train", from: "Paris", to: "Lyon", dep: "", arr: "", tickets: [{ id: "f2", name: "TGV.pdf", type: "application/pdf", size: 200000 }] };
state.formTickets = { pending: [{ name: "photo.jpg", type: "image/jpeg" }], removed: [] };
const tf = transportForm(leg, false);
assert.match(tf, /data-form-tickets="l1"/);
assert.match(tf, /TGV\.pdf/);
assert.match(tf, /photo\.jpg.*à envoyer/s);
state.formTickets = { pending: [], removed: ["f2"] };
assert.doesNotMatch(transportForm(leg, false), /TGV\.pdf/);
// Trajet replié : le nombre de billets ; ouvert : les billets eux-mêmes
assert.match(transportCard(leg, { items: [leg], currency: "EUR" }, 0), /1 billet/);
assert.doesNotMatch(transportCard(leg, { items: [leg], currency: "EUR" }, 0), /TGV\.pdf/);
state.openItems = new Set(["l1"]);
assert.match(transportCard(leg, { items: [leg], currency: "EUR" }, 0), /TGV\.pdf/);
// Lien Google Maps d'une activité : affiché s'il est en http(s), jamais un lien javascript:
const withMaps = { ...newStop("Lyon"), todos: [
  { id: "m1", text: "Bouchon", done: true, maps: "https://maps.app.goo.gl/abc" },
  { id: "m2", text: "Piège", done: false, maps: "javascript:alert(1)" } ] };
const clm = checklist(withMaps);
assert.match(clm, /class="cl-map" href="https:\/\/maps\.app\.goo\.gl\/abc"/);
assert.doesNotMatch(clm, /javascript:/);
assert.match(stopForm(withMaps, false), /name="todoMaps"[^>]*value="https:\/\/maps\.app\.goo\.gl\/abc"/);

// Carte d'étape : les dates manquantes sont signalées en rouge
{ const card = (arrive, depart) => { const it = { ...newStop("Lyon"), arrive, depart }; return stopCard(it, { currency: "EUR", items: [it] }, 0); };
  const red = (html) => [...html.matchAll(/class="to-define">([^<]+)</g)].map((m) => m[1]).join(" | ");
  assert.equal(red(card("", "")), "Dates à définir");
  assert.equal(red(card("2030-03-02", "")), "départ à définir");
  assert.equal(red(card("", "2030-03-05")), "Arrivée à définir");
  assert.equal(red(card("2030-03-02", "2030-03-05")), "", "dates complètes : rien en rouge"); }

// Date d'une activité : affichée dans la checklist, proposée dans les deux formulaires, bornée par l'étape
{ const it = { ...newStop("Lyon", "2030-03-02"), depart: "2030-03-05", todos: [
    { id: "d1", text: "Restaurant", done: false, date: "2030-03-03" }, { id: "d2", text: "Musée", done: false }] };
  state.todoAdding = null;
  const cl = checklist(it);
  assert.match(cl, /<time class="cl-date" datetime="2030-03-03">[^<]*3 mars<\/time>/);
  assert.equal((cl.match(/cl-date/g) || []).length, 1, "pas de date affichée pour l'activité sans date");
  state.todoAdding = it.id;
  assert.match(checklist(it), /type="date" name="date"[^>]* min="2030-03-02" max="2030-03-05"/);
  state.todoAdding = null;
  const sf = stopForm(it, false);
  assert.match(sf, /name="todoDate" id="td-date-d1" value="2030-03-03" min="2030-03-02" max="2030-03-05"/);
  assert.match(sf, /name="todoDate" id="td-date-d2" value=""/); }

// Ordre chronologique : par date puis par heure, sans date à la fin dans l'ordre d'ajout ; la liste d'origine n'est pas modifiée
{ const todos = [{ id: "x", text: "Sans date 1" }, { id: "b", text: "B", date: "2030-03-04" }, { id: "y", text: "Sans date 2", date: "" },
    { id: "a2", text: "A soir", date: "2030-03-03", time: "20:00" }, { id: "a1", text: "A matin", date: "2030-03-03", time: "09:00" }, { id: "a3", text: "A", date: "2030-03-03" }];
  assert.deepEqual(byDate(todos).map((t) => t.id), ["a1", "a2", "a3", "b", "x", "y"]);
  assert.equal(todos[0].id, "x");
  assert.deepEqual(byDate(undefined), []);
  const it = { ...newStop("Lyon"), todos };
  const cl = checklist(it);
  assert.ok(cl.indexOf("A matin") < cl.indexOf(">B<") && cl.indexOf(">B<") < cl.indexOf("Sans date 1"), "checklist dans l'ordre des dates"); }

// À réserver ou non : seules les activités à réserver sont en rouge et comptées ; sans « book », une activité ancienne reste à réserver
{ const { tripPending } = await import(root + "/js/views/checklist.js");
  const it = { ...newStop("Lyon"), todos: [{ id: "r", text: "Resto", done: false, book: true }, { id: "f", text: "Balade", done: false, book: false },
    { id: "o", text: "Ancienne", done: false }, { id: "v", text: "Visite faite", done: true, book: false }] };
  const cl = checklist(it);
  assert.match(cl, /<li class="is-free">[\s\S]*?Balade/);
  assert.match(cl, /<li class="">[\s\S]*?Resto/);
  assert.match(cl, /<li class="is-free">[\s\S]*?Visite faite/, "« réservé » n'a pas de sens sans réservation");
  assert.match(cl, /0\/2 réservé</, "seules les deux activités à réserver sont comptées");
  assert.match(cl, /<li class="is-free">\s*<label>\s*<span class="cl-dot"[^>]*><\/span>\s*<span>Balade/, "rien à réserver : un point, pas de case");
  assert.doesNotMatch(cl, /id="todo-f"/);
  assert.match(cl, /aria-label="Réservé : Resto"/);
  assert.equal(tripPending({ items: [it] }), 2);
  assert.equal(checklist({ ...it, todos: [it.todos[1]] }).includes("cl-progress"), false, "rien à réserver : pas de compteur");
  const card = stopCard({ ...it, id: "s" }, { currency: "EUR", items: [it] }, 0);
  assert.match(card, /À réserver : Resto, Ancienne</);
  const sf = stopForm(it, false);
  assert.match(sf, /name="todoBook" id="td-book-r" checked/);
  assert.match(sf, /name="todoBook" id="td-book-f">/);
  assert.match(sf, /name="todoBook" id="td-book-o" checked/);
  state.todoAdding = it.id;
  assert.match(checklist(it), /name="book" id="todo-book-[^"]+"><span>À réserver<\/span>/, "case décochée à l'ajout");
  state.todoAdding = null; }

console.log("Formulaires et checklist : tous les tests passent.");
