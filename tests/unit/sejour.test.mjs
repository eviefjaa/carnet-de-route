// Séjour : jours du programme, activités rangées par jour et par heure, contenu échappé
import assert from "node:assert/strict";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
const { state } = await import(root + "/js/store.js");
const { sejourView, sejourDays, sejourStats } = await import(root + "/js/views/sejour.js");

// Jours : de l'arrivée au départ inclus, en passant les fins de mois ; rien sans arrivée
assert.deepEqual(sejourDays({ arrive: "2030-04-29", depart: "2030-05-02" }), ["2030-04-29", "2030-04-30", "2030-05-01", "2030-05-02"]);
assert.deepEqual(sejourDays({ arrive: "2030-05-01", depart: "" }), ["2030-05-01"]);
assert.deepEqual(sejourDays({ arrive: "", depart: "2030-05-01" }), []);
assert.equal(sejourDays({ arrive: "2030-01-01", depart: "2031-01-01" }).length, 60, "programme limité à 60 jours");

const stop = { id: "s", type: "stop", place: "Paris", arrive: "2030-05-01", depart: "2030-05-02", todos: [
  { id: "a", text: "Dîner", done: false, date: "2030-05-01", time: "20:00" },
  { id: "b", text: "Musée <img src=x onerror=alert(1)>", done: true, date: "2030-05-01", time: "09:15", how: "Bus \"38\"" },
  { id: "c", text: "Balade", done: false },
  { id: "d", text: "Hors séjour", done: false, date: "2030-06-01" }] };
const trip = { kind: "sejour", currency: "EUR", items: [{ id: "t", type: "transport", mode: "train", from: "Lyon", to: "Paris" }, stop] };
const html = sejourView(trip);
assert.doesNotMatch(html, /<img/);
assert.match(html, /Bus &quot;38&quot;/);
// Jour 1 : le musée (9 h 15) avant le dîner (20 h)
const day1 = html.slice(html.indexOf("Jour 1"), html.indexOf("Jour 2"));
assert.ok(day1.indexOf("Musée") < day1.indexOf("Dîner"));
// Sans jour ou hors des dates : rangées à part
const loose = html.slice(html.indexOf("Pas encore de jour"));
assert.ok(loose.includes("Balade") && loose.includes("Hors séjour"));
assert.deepEqual(sejourStats(trip), { days: 2, activities: 4, place: "Paris" });

// Sans lieu : le formulaire du lieu est ouvert d'office
state.insertAt = null;
assert.match(sejourView({ kind: "sejour", items: [] }), /data-sejour="1"/);
console.log("Séjour : tous les tests passent.");
