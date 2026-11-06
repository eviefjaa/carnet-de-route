// Placement automatique sur la carte à partir du lieu ou de l'adresse : les étapes, et les lieux
// de départ ou d'arrivée d'un trajet quand il n'y a pas d'étape de ce côté (vol qui part de Prague
// au début du voyage, par exemple).
// Service utilisé : Nominatim (OpenStreetMap), limité à une recherche par seconde.

import { state, currentTrip, save } from "./store.js";
import { drawMap } from "./map.js";

const queue = new Set();
const notFound = {};
let busy = false;

// Champ de position et textes à chercher : étape (adresse, puis lieu) ou bout d'un trajet
const queries = (it, field) => (field === "geo" ? [it.address, it.place] : [it[field.slice(0, -3)]]).map((s) => (s || "").trim()).filter(Boolean);
const keyOf = (it, field = "geo") => queries(it, field).join(" | ");
const isPlaced = (it, field = "geo") => it[field] && it[field].q === keyOf(it, field);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Positions utiles d'un voyage : chaque étape, et le bout d'un trajet sans étape juste à côté
export function geoFields(items) {
  const out = [];
  items.forEach((it, i) => {
    if (it.type === "stop") return out.push([it, "geo"]);
    if (items[i - 1]?.type !== "stop") out.push([it, "fromGeo"]);
    if (items[i + 1]?.type !== "stop") out.push([it, "toGeo"]);
  });
  return out.filter(([it, field]) => keyOf(it, field));
}

export function scheduleGeo() {
  const t = currentTrip();
  if (!t) return;
  geoFields(t.items).forEach(([it, field]) => {
    const k = keyOf(it, field);
    if (!isPlaced(it, field) && !notFound[k]) queue.add(`${state.currentId}::${it.id}::${field}`);
  });
  run();
}

async function run() {
  if (busy || !queue.size) return;
  busy = true;
  renderGeoNote();

  for (const key of [...queue]) {
    queue.delete(key);
    const [tripId, itemId, field] = key.split("::");
    const it = state.trips[tripId] && state.trips[tripId].items.find((x) => x.id === itemId);
    if (!it || isPlaced(it, field) || !keyOf(it, field)) continue;

    const k = keyOf(it, field);
    let found = null;
    // On essaie d'abord l'adresse précise, puis le nom du lieu
    for (const q of queries(it, field)) {
      found = await search(q);
      await wait(1100);
      if (found) break;
    }
    if (found) {
      it[field] = { q: k, ...found };
      save();
    } else {
      notFound[k] = true;
    }
    if (tripId === state.currentId) drawMap();
  }

  busy = false;
  renderGeoNote();
  if (queue.size) run();
}

async function search(q) {
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=fr&q=" + encodeURIComponent(q);
    const res = await fetch(url);
    const data = await res.json();
    return data && data[0] ? { lat: +data[0].lat, lng: +data[0].lon } : null;
  } catch {
    return null;
  }
}

export function renderGeoNote() {
  const el = document.getElementById("geoNote");
  const t = currentTrip();
  if (!el || !t) return;
  const fields = geoFields(t.items);
  const missing = fields.filter(([i, f]) => notFound[keyOf(i, f)]).map(([i, f]) => queries(i, f).pop());
  const pending = fields.some(([i, f]) => !isPlaced(i, f) && !notFound[keyOf(i, f)]);
  el.textContent = missing.length
    ? `Introuvable sur la carte : ${missing.join(", ")}. Précisez le lieu, par exemple « Morretes, Paraná, Brésil ».`
    : pending ? "Placement des lieux sur la carte…" : "";
}
