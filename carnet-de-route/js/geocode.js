// Placement automatique des étapes sur la carte à partir du lieu ou de l'adresse
// Service utilisé : Nominatim (OpenStreetMap), limité à une recherche par seconde.

import { state, currentTrip, save } from "./store.js";
import { drawMap } from "./map.js";

const queue = new Set();
const notFound = {};
let busy = false;

const queries = (it) => [it.address, it.place].map((s) => (s || "").trim()).filter(Boolean);
const keyOf = (it) => queries(it).join(" | ");
const isPlaced = (it) => it.geo && it.geo.q === keyOf(it);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function scheduleGeo() {
  const t = currentTrip();
  if (!t) return;
  t.items.forEach((it) => {
    if (it.type !== "stop") return;
    const k = keyOf(it);
    if (k && !isPlaced(it) && !notFound[k]) queue.add(state.currentId + "::" + it.id);
  });
  run();
}

async function run() {
  if (busy || !queue.size) return;
  busy = true;
  renderGeoNote();

  for (const key of [...queue]) {
    queue.delete(key);
    const [tripId, itemId] = key.split("::");
    const it = state.trips[tripId] && state.trips[tripId].items.find((x) => x.id === itemId);
    if (!it || isPlaced(it) || !keyOf(it)) continue;

    const k = keyOf(it);
    let found = null;
    // On essaie d'abord l'adresse précise, puis le nom du lieu
    for (const q of queries(it)) {
      found = await search(q);
      await wait(1100);
      if (found) break;
    }
    if (found) {
      it.geo = { q: k, ...found };
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
  const stops = t.items.filter((i) => i.type === "stop" && keyOf(i));
  const missing = stops.filter((i) => notFound[keyOf(i)]).map((i) => i.place || "étape sans nom");
  const pending = stops.some((i) => !isPlaced(i) && !notFound[keyOf(i)]);
  el.textContent = missing.length
    ? `Introuvable sur la carte : ${missing.join(", ")}. Précisez le lieu, par exemple « Morretes, Paraná, Brésil ».`
    : pending ? "Placement des étapes sur la carte…" : "";
}
