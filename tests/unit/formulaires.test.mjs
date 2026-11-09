import assert from "node:assert/strict";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
const { state } = await import(root + "/js/store.js");
const { stopForm, newStop, stopCard } = await import(root + "/js/views/stop.js");
const { transportForm, transportCard } = await import(root + "/js/views/transport.js");
const { checklist } = await import(root + "/js/views/checklist.js");

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

console.log("Formulaires et checklist : tous les tests passent.");
