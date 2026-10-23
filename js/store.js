// Données des voyages : chargement, sauvegarde (dans le navigateur) et état de l'interface

import { uid } from "./utils.js";
import { toast } from "./toast.js";

const TRIPS_KEY = "carnet-route-trips";
const CURRENT_KEY = "carnet-route-current";

export const state = {
  trips: {},        // { id: { name, createdAt, items: [...] } }
  currentId: null,  // voyage affiché
  editingId: null,  // élément en cours de modification
  insertAt: null,   // { pos, draft } : nouvel élément en cours de création
  confirm: null,    // id de l'élément à confirmer pour suppression ("trip" pour le voyage)
};

export function load() {
  try {
    state.trips = JSON.parse(localStorage.getItem(TRIPS_KEY) || "{}");
  } catch {
    state.trips = {};
  }
  let saved = null;
  try { saved = localStorage.getItem(CURRENT_KEY); } catch {}
  state.currentId = saved && state.trips[saved] ? saved : Object.keys(state.trips)[0] || null;
}

export function save() {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(state.trips));
    localStorage.setItem(CURRENT_KEY, state.currentId || "");
  } catch {
    toast("Enregistrement impossible : le stockage du navigateur est plein ou bloqué.");
  }
}

export const currentTrip = () => state.trips[state.currentId] || null;

export function resetUi() {
  state.editingId = null;
  state.insertAt = null;
  state.confirm = null;
}

export function selectTrip(id) {
  state.currentId = id;
  resetUi();
  save();
}

export function createTrip() {
  const id = "v-" + uid();
  state.trips[id] = { name: "Nouveau voyage", currency: "EUR", createdAt: Date.now(), items: [] };
  selectTrip(id);
  return id;
}

export function deleteTrip(id) {
  delete state.trips[id];
  state.currentId = Object.keys(state.trips)[0] || null;
  resetUi();
  save();
}

// Première et dernière date du voyage
export function tripStart(t) {
  const ds = [];
  t.items.forEach((i) => {
    if (i.type === "stop" && i.arrive) ds.push(i.arrive);
    if (i.type === "transport" && i.dep) ds.push(i.dep.slice(0, 10));
  });
  return ds.sort()[0] || null;
}

export function tripEnd(t) {
  const ds = [];
  t.items.forEach((i) => {
    if (i.type === "stop") { if (i.depart) ds.push(i.depart); else if (i.arrive) ds.push(i.arrive); }
    if (i.type === "transport" && i.arr) ds.push(i.arr.slice(0, 10));
  });
  ds.sort();
  return ds[ds.length - 1] || null;
}

// Étapes juste avant et juste après une position (pour pré-remplir un trajet)
export function neighbours(t, pos) {
  let prev = null, next = null;
  for (let i = pos - 1; i >= 0; i--) if (t.items[i].type === "stop") { prev = t.items[i]; break; }
  for (let i = pos; i < t.items.length; i++) if (t.items[i].type === "stop") { next = t.items[i]; break; }
  return { prev, next };
}
