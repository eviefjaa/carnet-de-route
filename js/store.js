// Données des voyages : état de l'interface, chargement et sauvegarde
//
// Deux modes de sauvegarde :
//  - sans compte : dans le navigateur (localStorage), propre à cet appareil ;
//  - avec compte : dans le cloud (Firebase), synchronisé entre les appareils.

import { uid } from "./utils.js";
import { toast } from "./toast.js";
import { prefs } from "./prefs.js";

const TRIPS_KEY = "carnet-route-trips";
const CURRENT_KEY = "carnet-route-current";

export const state = {
  trips: {},        // { id: { name, currency, createdAt, items: [...] } }
  currentId: null,  // voyage affiché
  editingId: null,  // élément en cours de modification
  insertAt: null,   // { pos, draft } : nouvel élément en cours de création
  confirm: null,    // id de l'élément à confirmer pour suppression ("trip" pour le voyage)
  todoAdding: null, // id de l'étape dont on remplit la checklist
  formTickets: { pending: [], removed: [] }, // billets choisis dans le formulaire d'un trajet
  user: null,       // { uid, email } quand on est connecté
  authOpen: false,  // écran de connexion affiché
  loading: false,   // chargement des voyages du compte en cours
  view: "trips",    // page affichée : trips, explore, country, favorites, profile, settings
  country: null,    // code du pays affiché dans sa fiche
  explore: { q: "", continent: "", tag: "" }, // filtres des destinations
  profile: null,    // mon profil public { uid, name, handle, bio, visibility }, une fois créé
  notifs: null,     // notifications { list, at } (voir social.js)
  publishOpen: false, // panneau « Publier l'itinéraire » ouvert
  inviteOpen: false,  // champ « Inviter une personne » ouvert
  openItems: new Set(), // étapes et trajets dépliés (le détail s'affiche au clic sur leur carte)
  networkTab: null,  // liste affichée depuis Mon profil (#abonnes, #abonnements, #mes-publications, #demandes)
  personId: null,   // personne affichée (#personne-…)
  postId: null,     // publication affichée (#publication-…)
};

// ---------- Sauvegarde ----------
let cloud = null;          // module cloud.js quand on est connecté
let saved = {};            // dernière version enregistrée de chaque voyage (texte JSON)
let saveTimer = null;

const snapshot = (t) => JSON.stringify(t);

// ---------- État de la synchronisation (affiché en haut de la page) ----------
//   local    sans compte : enregistré sur cet appareil
//   saved    tout est enregistré dans le compte
//   pending  des modifications partent vers le compte
//   error    le compte refuse ou ne répond pas (sync.error explique pourquoi)
export const sync = { status: "local", error: "" };
let onSync = () => {};
export const onSyncChange = (fn) => (onSync = fn);

export function setSync(status, error = "") {
  sync.status = status;
  sync.error = error;
  onSync();
}

// Explication lisible d'une erreur Firestore
export function syncError(err) {
  const code = (err && err.code) || "";
  if (code === "permission-denied") return "Firebase refuse l'accès : les règles Firestore ne sont sans doute pas publiées.";
  if (code === "unavailable" || code === "deadline-exceeded") return "Pas de connexion avec Firebase.";
  if (code === "unauthenticated") return "Votre session a expiré : reconnectez-vous.";
  return `Erreur Firebase${code ? ` (${code})` : ""}.`;
}

export function setCloud(c) {
  cloud = c;
  setSync(c ? "saved" : "local");
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
  if (sync.status !== "error") setSync("pending");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushCloud, 500);
}

// Envoie tout de suite les modifications en attente (avant une déconnexion)
export function flush() {
  clearTimeout(saveTimer);
  return flushCloud();
}

function saveLocal() {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(state.trips));
  } catch {
    toast("Enregistrement impossible : le stockage du navigateur est plein ou bloqué.");
  }
}

// N'envoie au cloud que les voyages modifiés, ajoutés ou supprimés.
// Un voyage n'est marqué enregistré qu'une fois l'écriture acceptée : en cas d'échec,
// il sera renvoyé à la prochaine modification ou avec le bouton « Réessayer ».
async function flushCloud() {
  const c = cloud;
  if (!c) return;
  const jobs = [];
  Object.entries(state.trips).forEach(([id, t]) => {
    // Voyage pas encore dans le compte : on en devient le créateur
    const isNew = !(id in saved);
    if (!t.owner) Object.assign(t, c.newTripSharing());
    const s = snapshot(t);
    if (saved[id] !== s) jobs.push(c.saveTrip(id, t, isNew).then(() => (saved[id] = s)));
  });
  Object.keys(saved).forEach((id) => {
    if (!state.trips[id]) jobs.push(c.deleteTrip(id).then(() => delete saved[id]));
  });
  if (!jobs.length) {
    if (sync.status === "pending") setSync("saved");
    return;
  }
  setSync("pending");
  const failed = (await Promise.allSettled(jobs)).find((r) => r.status === "rejected");
  if (cloud !== c) return; // déconnecté entre-temps
  if (failed) {
    setSync("error", syncError(failed.reason));
    toast("Modifications non enregistrées dans le compte. " + sync.error);
  } else {
    setSync(hasUnsaved() ? "pending" : "saved");
  }
}

// Modifications pas encore acceptées par le compte
export const hasUnsaved = () =>
  !!cloud && (Object.keys(state.trips).some(hasPendingChanges) || Object.keys(saved).some((id) => !state.trips[id]));

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

// Voyageurs ou invitations changés directement dans le cloud : on met à jour la copie locale
export function patchTrip(id, fields) {
  const t = state.trips[id];
  if (!t) return;
  const pending = hasPendingChanges(id);
  Object.assign(t, fields);
  if (!pending) saved[id] = snapshot(t);
}

// Voyage quitté : on l'oublie sans le supprimer du compte des autres
export function forgetTrip(id) {
  delete state.trips[id];
  delete saved[id];
  if (state.currentId === id) state.currentId = Object.keys(state.trips)[0] || null;
  resetUi();
}

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

// Créateur du voyage (ou voyage pas encore dans un compte)
export const isOwner = (t) => !t.owner || (!!state.user && t.owner === state.user.uid);

export function resetUi() {
  state.editingId = null;
  state.insertAt = null;
  state.confirm = null;
  state.todoAdding = null;
  state.formTickets = { pending: [], removed: [] };
  state.publishOpen = false;
  state.inviteOpen = false;
  state.openItems = new Set();
}

export function selectTrip(id) {
  state.currentId = id;
  resetUi();
  rememberCurrent();
}

export function createTrip({ name = "Nouveau voyage", currency = prefs.currency || "EUR", country = "" } = {}) {
  const id = "v-" + uid();
  state.trips[id] = { name, currency, country, createdAt: Date.now(), items: [] };
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
  // Sans date de fin (ex. trajet sans heure d'arrivée), le voyage finit le jour où il commence
  return ds[ds.length - 1] || tripStart(t);
}

// Étapes juste avant et juste après une position (pour pré-remplir un trajet)
export function neighbours(t, pos) {
  let prev = null, next = null;
  for (let i = pos - 1; i >= 0; i--) if (t.items[i].type === "stop") { prev = t.items[i]; break; }
  for (let i = pos; i < t.items.length; i++) if (t.items[i].type === "stop") { next = t.items[i]; break; }
  return { prev, next };
}
