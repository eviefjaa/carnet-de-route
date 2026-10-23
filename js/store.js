// Données des voyages : état de l'interface, chargement et sauvegarde
//
// Deux modes de sauvegarde :
//  - sans compte : dans le navigateur (localStorage), propre à cet appareil ;
//  - avec compte : dans le cloud (Firebase), synchronisé entre les appareils.

import { uid } from "./utils.js";
import { toast } from "./toast.js";

const TRIPS_KEY = "carnet-route-trips";
const CURRENT_KEY = "carnet-route-current";

export const state = {
  trips: {},        // { id: { name, currency, createdAt, items: [...] } }
  currentId: null,  // voyage affiché
  editingId: null,  // élément en cours de modification
  insertAt: null,   // { pos, draft } : nouvel élément en cours de création
  confirm: null,    // id de l'élément à confirmer pour suppression ("trip" pour le voyage)
  user: null,       // { uid, email } quand on est connecté
  authOpen: false,  // écran de connexion affiché
  loading: false,   // chargement des voyages du compte en cours
};

// ---------- Sauvegarde ----------
let cloud = null;          // module cloud.js quand on est connecté
let saved = {};            // dernière version enregistrée de chaque voyage (texte JSON)
let saveTimer = null;

const snapshot = (t) => JSON.stringify(t);

export function setCloud(c) {
  cloud = c;
}

// Repartir d'un nouvel ensemble de voyages (au chargement ou à la connexion)
export function replaceTrips(trips) {
  state.trips = trips;
  saved = {};
  Object.entries(trips).forEach(([id, t]) => (saved[id] = snapshot(t)));
  pickCurrent();
}

export function save() {
  rememberCurrent();
  if (!cloud) return saveLocal();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushCloud, 500);
}

function saveLocal() {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(state.trips));
  } catch {
    toast("Enregistrement impossible : le stockage du navigateur est plein ou bloqué.");
  }
}

// N'envoie au cloud que les voyages modifiés, ajoutés ou supprimés
async function flushCloud() {
  const c = cloud;
  if (!c) return;
  const jobs = [];
  Object.entries(state.trips).forEach(([id, t]) => {
    const s = snapshot(t);
    if (saved[id] !== s) { saved[id] = s; jobs.push(c.saveTrip(id, t)); }
  });
  Object.keys(saved).forEach((id) => {
    if (!state.trips[id]) { delete saved[id]; jobs.push(c.deleteTrip(id)); }
  });
  try {
    await Promise.all(jobs);
  } catch {
    toast("Synchronisation impossible pour le moment. Vérifiez votre connexion.");
  }
}

// Un voyage modifié depuis un autre appareil
export function applyRemote(id, trip) {
  if (trip) {
    state.trips[id] = trip;
    saved[id] = snapshot(trip);
  } else {
    delete state.trips[id];
    delete saved[id];
  }
  pickCurrent();
}

// Voyages non enregistrés localement en attente d'envoi
export const hasPendingChanges = (id) => state.trips[id] && saved[id] !== snapshot(state.trips[id]);

export function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(TRIPS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function clearLocal() {
  try { localStorage.removeItem(TRIPS_KEY); } catch {}
}

function rememberCurrent() {
  try { localStorage.setItem(CURRENT_KEY, state.currentId || ""); } catch {}
}

function pickCurrent() {
  if (state.currentId && state.trips[state.currentId]) return;
  let last = null;
  try { last = localStorage.getItem(CURRENT_KEY); } catch {}
  state.currentId = last && state.trips[last] ? last : Object.keys(state.trips)[0] || null;
}

// ---------- Voyages ----------
export const currentTrip = () => state.trips[state.currentId] || null;

export function resetUi() {
  state.editingId = null;
  state.insertAt = null;
  state.confirm = null;
}

export function selectTrip(id) {
  state.currentId = id;
  resetUi();
  rememberCurrent();
}

export function createTrip() {
  const id = "v-" + uid();
  state.trips[id] = { name: "Nouveau voyage", currency: "EUR", createdAt: Date.now(), items: [] };
  selectTrip(id);
  save();
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
