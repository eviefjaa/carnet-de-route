// Voyage créé à partir d'un itinéraire publié : étapes, dates, programme, recommandations
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { tripFromPost, addDays } = await import(root + "/js/fork.js");
const { normalizeTrip } = await import(root + "/js/cloud.js");
const { mergeTrip } = await import(root + "/js/merge.js");
const { publicCopy } = await import(root + "/js/publish.js");
const { RECO_KINDS } = await import(root + "/js/social.js");

assert.equal(addDays("2027-03-27", 1), "2027-03-28", "passage à l'heure d'été");
assert.equal(addDays("2027-12-31", 1), "2028-01-01", "changement d'année");

// Road trip publié : Lisbonne (2 nuits), trajet, Porto (arrêt sans nuit), trajet, Saint-Jacques
const road = {
  id: "post123", title: "Portugal en train", ownerHandle: "dan.voyage",
  trip: { country: "PT", days: 4, nights: 3, budget: { currency: "EUR", lodging: 300, transport: 40, missing: 0, rows: [] }, items: [
    { type: "stop", place: "Lisbonne", country: "Portugal", day: 1, nights: 2, geo: { lat: 38.72, lng: -9.14 }, todos: ["Tram 28", "Belém"] },
    { type: "transport", mode: "train", from: "Lisbonne", to: "Porto", day: 3, duration: "3 h", fromGeo: { lat: 38.7, lng: -9.1 }, line: "abc", km: 300 },
    { type: "stop", place: "Porto", country: "Portugal", day: 3, nights: 0, geo: { lat: 41.14, lng: -8.62 }, todos: [] },
    { type: "transport", mode: "bus", from: "Porto", to: "Saint-Jacques", day: 3 },
    { type: "stop", place: "Saint-Jacques", country: "Espagne", day: 3, nights: 1, todos: [] },
  ] },
  recos: [
    { kind: "resto", name: "Chez Jo", where: "Alfama", note: "La morue,\n à midi", url: "https://chezjo.pt", stop: 0 },
    { kind: "adresse", name: "Librairie Lello", where: "", note: "", url: "javascript:alert(1)", stop: 2 },
    { kind: "autre", name: "Carte Viva", where: "", note: "Pour le métro", url: "", stop: null },
    { kind: "resto", name: "Perdue", stop: 1 }, // index d'un trajet : rangée avec les recos générales
  ],
};

{ const t = tripFromPost(road, { name: "Mon Portugal", start: "2027-05-01" }, RECO_KINDS);
  const [lis, leg, por, leg2, sj] = t.items;
  assert.equal(t.name, "Mon Portugal");
  assert.equal(t.country, "PT");
  assert.equal(t.kind, "");
  assert.deepEqual(t.source, { postId: "post123", ownerHandle: "dan.voyage" });
  assert.deepEqual([lis.arrive, lis.depart], ["2027-05-01", "2027-05-03"], "Lisbonne : jour 1, 2 nuits");
  assert.deepEqual([por.arrive, por.depart], ["2027-05-03", "2027-05-03"], "Porto : arrêt sans nuit");
  assert.deepEqual([sj.arrive, sj.depart], ["2027-05-03", "2027-05-04"]);
  assert.equal(leg.dep, "2027-05-03", "trajet : date du jour, sans heure");
  assert.deepEqual([leg.mode, leg.from, leg.to, leg.arr, leg.price], ["train", "Lisbonne", "Porto", "", null]);
  assert.deepEqual(lis.todos.map((x) => [x.text, x.done, x.book]), [["Tram 28", false, false], ["Belém", false, false]]);
  // Recommandations : notes et liens de leur étape, générales dans la première
  assert.equal(lis.notes, "Chez Jo (Restaurant), Alfama : La morue, à midi\nCarte Viva (Autre) : Pour le métro\nPerdue (Restaurant)");
  assert.deepEqual(lis.links.map((l) => [l.label, l.url]), [["Chez Jo", "https://chezjo.pt/"]]);
  assert.equal(por.notes, "Librairie Lello (Adresse)");
  assert.deepEqual(por.links, [], "lien dangereux écarté");
  assert.ok(!t.notes && !leg.notes);
  // Jamais repris : positions, tracés, budget, prix
  const json = JSON.stringify(t);
  for (const k of ['"geo"', "fromGeo", "toGeo", '"line"', '"route"', "budget", '"km"', "duration"]) assert.ok(!json.includes(k), `pas de ${k}`);
  assert.ok(t.items.every((i) => i.price === null), "pas de prix");
  assert.ok(!/—/.test(json), "pas de tiret cadratin dans les notes");
  // Nouveaux id, tous différents
  const ids = [...t.items.map((i) => i.id), ...t.items.flatMap((i) => (i.todos || []).map((x) => x.id)), ...lis.links.map((l) => l.id)];
  assert.equal(new Set(ids).size, ids.length, "id uniques");
  // La publication d'origine n'est pas touchée
  assert.equal(road.trip.items[0].todos.length, 2);
  assert.equal(road.trip.items[0].notes, undefined); }

// Sans date de départ : aucune date ; nom vide : titre de la publication
{ const t = tripFromPost(road, { name: "", start: "" }, RECO_KINDS);
  assert.equal(t.name, "Portugal en train");
  assert.ok(t.items.every((i) => (i.type === "stop" ? !i.arrive && !i.depart : !i.dep)), "pas de dates");
  // Date invalide : ignorée
  assert.ok(tripFromPost(road, { start: "2027-13-45" }).items.every((i) => !i.arrive && !i.dep)); }

// Séjour avec programme : jour, heure, comment y aller
{ const sejour = { id: "s1", title: "Rome", ownerHandle: "cam", trip: { kind: "sejour", country: "IT", items: [
    { type: "stop", place: "Rome", country: "Italie", day: 1, nights: 3, todos: ["Colisée", "Vatican"], program: [
      { text: "Colisée", day: 2, time: "09:30", how: "Métro B" },
      { text: "Vatican", day: null, time: "", how: "" },
      { text: "", day: 1, time: "", how: "" }] }] } };
  const t = tripFromPost(sejour, { name: "Rome", start: "2027-04-10" });
  assert.equal(t.kind, "sejour");
  const [rome] = t.items;
  assert.deepEqual([rome.arrive, rome.depart], ["2027-04-10", "2027-04-13"]);
  assert.deepEqual(rome.todos.map(({ text, date, time, how, done, book }) => ({ text, date, time, how, done, book })), [
    { text: "Colisée", date: "2027-04-11", time: "09:30", how: "Métro B", done: false, book: false },
    { text: "Vatican", date: "", time: "", how: "", done: false, book: false }], "programme repris, activité vide ignorée"); }

// Origine : gardée par normalize et la fusion, jamais copiée dans une nouvelle publication
{ const t = tripFromPost(road, { name: "X" });
  const trip = { name: "X", currency: "EUR", ...t };
  assert.deepEqual(normalizeTrip(JSON.parse(JSON.stringify(trip))).source, t.source, "normalize garde source");
  assert.equal("source" in normalizeTrip({ items: [], source: { postId: "<b>", ownerHandle: "x" } }), false, "source piégée retirée");
  assert.equal("source" in normalizeTrip({ items: [], source: "texte" }), false);
  const base = { ...trip, items: [] };
  assert.deepEqual(mergeTrip(base, { ...trip, items: [] }, { ...base, name: "Y" }).source, t.source, "fusion : source gardée");
  assert.ok(!JSON.stringify(publicCopy(trip)).includes("post123"), "pas de source dans une publication"); }

console.log("Voyage à partir d'un itinéraire : tout passe.");
