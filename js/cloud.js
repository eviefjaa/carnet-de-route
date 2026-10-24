// Comptes et synchronisation avec Firebase (Authentication + Firestore)
//
// Voyages : trips/{idDuVoyage}, partagés entre leurs voyageurs
// Préférences et rappels envoyés : users/{uid}/meta/…

import { firebaseConfig } from "./firebase-config.js";
import { mergeTrip } from "./merge.js";

const V = "10.12.2";
const SDK = `https://www.gstatic.com/firebasejs/${V}`;

let auth = null, db = null, fb = null;

// Tests en local : http://localhost:…/?emulateur utilise les émulateurs Firebase
// (firebase emulators:start --only auth,firestore) au lieu des vraies données. Sans effet en ligne.
const EMULATOR = typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname) && new URLSearchParams(location.search).has("emulateur");

export const isEnabled = () => !!firebaseConfig;

// Firebase chargé (même sans compte : les publications publiques se lisent sans se connecter)
let markReady;
export const ready = new Promise((r) => (markReady = r));
// Accès direct à Firestore pour les profils et publications (social.js)
export const firestore = () => ({ fb, db, me });

// Charge Firebase seulement si le site est configuré
export async function init(onUser) {
  if (!firebaseConfig) {
    markReady(false);
    return false;
  }
  let app, a, f;
  try {
    [app, a, f] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
  } catch (err) {
    markReady(false); // hors ligne : les pages qui attendent Firebase affichent un message
    throw err;
  }
  fb = { ...a, ...f };
  const firebaseApp = app.initializeApp(firebaseConfig);
  auth = a.getAuth(firebaseApp);
  auth.languageCode = "fr";
  db = f.getFirestore(firebaseApp);
  if (EMULATOR) {
    a.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    f.connectFirestoreEmulator(db, "127.0.0.1", 8181);
  }
  a.onAuthStateChanged(auth, (u) => onUser(u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null));
  markReady(true);
  return true;
}

// ---------- Compte ----------
// Sur une connexion lente, on peut valider le formulaire avant que Firebase soit chargé : on l'attend
async function authReady() {
  if (!(await ready)) throw Object.assign(new Error("Firebase indisponible"), { code: "auth/network-request-failed" });
}

// Un e-mail de confirmation est envoyé : les rappels ne partent que vers une adresse confirmée
export async function signUp(email, password) {
  await authReady();
  const cred = await fb.createUserWithEmailAndPassword(auth, email, password);
  await fb.sendEmailVerification(cred.user).catch(() => {});
  return cred;
}
export const resendVerification = () => fb.sendEmailVerification(auth.currentUser);

// L'état « adresse confirmée » est gardé en mémoire par Firebase : on le redemande au serveur.
// Le jeton présenté aux règles Firestore, lui, n'est renouvelé que toutes les heures : s'il dit
// encore « non confirmée », on en demande un nouveau (sinon une invitation est refusée une heure).
export async function refreshEmailVerified() {
  const u = auth.currentUser;
  await u.reload();
  if (u.emailVerified) {
    const token = await u.getIdTokenResult();
    if (token.claims.email_verified !== true) await u.getIdToken(true);
  }
  return u.emailVerified;
}

export const signIn = (email, password) => authReady().then(() => fb.signInWithEmailAndPassword(auth, email, password));
export const signOut = () => fb.signOut(auth);
export const resetPassword = (email) => authReady().then(() => fb.sendPasswordResetEmail(auth, email));

// Messages d'erreur compréhensibles
export function errorMessage(e) {
  const code = (e && e.code) || "";
  const messages = {
    "auth/invalid-email": "Adresse e-mail invalide.",
    "auth/missing-email": "Indiquez votre adresse e-mail.",
    "auth/missing-password": "Indiquez votre mot de passe.",
    "auth/weak-password": "Mot de passe trop court : 6 caractères minimum.",
    "auth/email-already-in-use": "Un compte existe déjà avec cette adresse. Connectez-vous.",
    "auth/invalid-credential": "E-mail ou mot de passe incorrect.",
    "auth/wrong-password": "E-mail ou mot de passe incorrect.",
    "auth/user-not-found": "Aucun compte avec cette adresse.",
    "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    "auth/network-request-failed": "Pas de connexion internet.",
    "auth/operation-not-allowed": "La connexion par e-mail n'est pas activée dans Firebase.",
  };
  return messages[code] || "Une erreur est survenue. Réessayez.";
}

// ---------- Voyages ----------
// Chaque voyage est dans trips/{id}, avec ses voyageurs :
//   owner    uid du créateur
//   members  uid des voyageurs (le créateur compris)
//   invites  adresses e-mail invitées qui n'ont pas encore rejoint (en minuscules)
//   emails   { uid: adresse e-mail } des voyageurs, pour les afficher
//   joined   { uid: date à laquelle la personne a rejoint le voyage }, pour les notifications
export const SHARING = ["owner", "members", "invites", "emails", "joined"];

const tripDoc = (id) => fb.doc(db, "trips", id);
const myTrips = (uid) => fb.query(fb.collection(db, "trips"), fb.where("members", "array-contains", uid));

// Un voyage peut avoir été écrit par un autre voyageur : chaque champ est remis au bon type
// (texte, nombre, liste), sinon une valeur piégée ferait planter l'affichage chez tous ses membres.
const STR = ["place", "country", "arrive", "depart", "address", "notes", "mode", "from", "to", "dep", "arr", "company", "ref", "url"];
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const str = (x) => (typeof x === "string" ? x : "");

function normalize(t) {
  if (typeof t.name !== "string") t.name = "Sans titre";
  if (typeof t.currency !== "string") t.currency = "EUR";
  t.items = (Array.isArray(t.items) ? t.items : []).filter((i) => isObj(i) && typeof i.id === "string" && (i.type === "stop" || i.type === "transport"));
  t.items.forEach((i) => {
    STR.forEach((k) => { if (k in i) i[k] = str(i[k]); });
    if ("price" in i && !(typeof i.price === "number" && Number.isFinite(i.price))) i.price = null;
    if ("nights" in i) delete i.nights; // calculé à partir des dates, jamais lu tel quel
    if (isObj(i.geo) && !(Number.isFinite(i.geo.lat) && Number.isFinite(i.geo.lng))) delete i.geo;
    if ("route" in i && !(isObj(i.route) && typeof i.route.key === "string")) delete i.route;
    i.todos = (Array.isArray(i.todos) ? i.todos : []).filter(isObj).map((x) => ({ ...x, id: str(x.id), text: str(x.text), done: x.done === true }));
    i.links = (Array.isArray(i.links) ? i.links : []).filter(isObj).map((l) => ({ id: str(l.id), label: str(l.label), url: str(l.url) }));
    const files = (list) => (Array.isArray(list) ? list : []).filter(isObj).map((f) => ({ id: str(f.id), name: str(f.name), type: str(f.type), size: Number(f.size) || 0 }));
    i.tickets = files(i.tickets);
    i.todos.forEach((x) => { if ("tickets" in x) x.tickets = files(x.tickets); });
  });
  return t;
}

export { normalize as normalizeTrip }; // pour les tests

export async function loadTrips(uid) {
  const snap = await fb.getDocs(myTrips(uid));
  const trips = {};
  snap.forEach((d) => (trips[d.id] = normalize(d.data())));
  return trips;
}

let me = null; // { uid, email } du compte connecté
export function useAccount(user) {
  me = user;
}

// Firestore refuse les valeurs undefined : on passe par JSON pour nettoyer
const clean = (t) => JSON.parse(JSON.stringify(t));

// Contenu seul : les voyageurs ne changent qu'avec les fonctions plus bas,
// pour ne pas écraser une invitation faite au même moment par quelqu'un d'autre
function content(trip) {
  const c = clean(trip);
  SHARING.forEach((k) => delete c[k]);
  return c;
}

// Nouveau voyage : on en est le créateur et le seul voyageur
export const newTripSharing = () => ({ owner: me.uid, members: [me.uid], invites: [], emails: { [me.uid]: me.email } });

// Enregistre un voyage. Un voyage existant est relu sur le serveur dans une transaction, puis fusionné
// avec ma version (merge.js) : les modifications faites au même moment par les autres voyageurs
// ne sont pas écrasées. Renvoie la version fusionnée (ce qui est maintenant sur le serveur).
export async function saveTrip(id, trip, isNew, base) {
  if (isNew) {
    await fb.setDoc(tripDoc(id), clean(trip));
    return null;
  }
  return fb.runTransaction(db, async (tx) => {
    const snap = await tx.get(tripDoc(id));
    if (!snap.exists()) throw Object.assign(new Error("Voyage supprimé"), { code: "not-found" });
    const server = normalize(snap.data());
    const merged = base ? mergeTrip(base, clean(trip), server, SHARING) : { ...server, ...content(trip) };
    tx.set(tripDoc(id), content(merged), { merge: true });
    return merged;
  });
}
// Les billets (sous-collection files) sont supprimés avec le voyage
export async function deleteTrip(id) {
  const files = await fb.getDocs(fb.collection(db, "trips", id, "files"));
  await Promise.all(files.docs.map((d) => fb.deleteDoc(d.ref)));
  await fb.deleteDoc(tripDoc(id));
}

// ---------- Billets ----------
// Un billet par document : trips/{id}/files/{idDuBillet}, contenu encodé en base64 (1 Mo maximum par document)
const fileDoc = (tripId, fileId) => fb.doc(db, "trips", tripId, "files", fileId);
export const saveFile = (tripId, fileId, file) => fb.setDoc(fileDoc(tripId, fileId), { ...file, addedBy: me.uid, addedAt: Date.now() });
export async function loadFile(tripId, fileId) {
  const snap = await fb.getDoc(fileDoc(tripId, fileId));
  return snap.exists() ? snap.data() : null;
}
export const deleteFile = (tripId, fileId) => fb.deleteDoc(fileDoc(tripId, fileId));

// ---------- Voyageurs ----------
export const invite = (id, email) => fb.updateDoc(tripDoc(id), { invites: fb.arrayUnion(email) });
export const cancelInvite = (id, email) => fb.updateDoc(tripDoc(id), { invites: fb.arrayRemove(email) });

// Retirer un voyageur (le créateur), ou se retirer soi-même (quitter le voyage)
export const removeMember = (id, uid) =>
  fb.updateDoc(tripDoc(id), { members: fb.arrayRemove(uid), [`emails.${uid}`]: fb.deleteField() });

// Rejoint les voyages où notre adresse est invitée (adresse confirmée obligatoire)
// Renvoie les noms des voyages rejoints
export async function acceptInvites() {
  const email = me.email.toLowerCase();
  const snap = await fb.getDocs(fb.query(fb.collection(db, "trips"), fb.where("invites", "array-contains", email)));
  const joined = [];
  for (const d of snap.docs) {
    try {
      await fb.updateDoc(d.ref, {
        members: fb.arrayUnion(me.uid), invites: fb.arrayRemove(email),
        [`emails.${me.uid}`]: me.email, [`joined.${me.uid}`]: fb.serverTimestamp(),
      });
      joined.push(d.data().name || "Sans titre");
    } catch {}
  }
  return joined;
}

// Avant le partage, les voyages étaient dans users/{uid}/trips : on les déplace dans trips
export async function moveOldTrips(uid) {
  const snap = await fb.getDocs(fb.collection(db, "users", uid, "trips"));
  for (const d of snap.docs) {
    try {
      await fb.setDoc(tripDoc(d.id), { ...d.data(), ...newTripSharing() });
      await fb.deleteDoc(d.ref);
    } catch {} // on réessaiera à la prochaine connexion
  }
}

// Préférences (favoris, devise, thème, nom) : users/{uid}/meta/prefs
export async function loadPrefs(uid) {
  const snap = await fb.getDoc(fb.doc(db, "users", uid, "meta", "prefs"));
  return snap.exists() ? snap.data() : null;
}
export const savePrefs = (p) => fb.setDoc(fb.doc(db, "users", me.uid, "meta", "prefs"), clean(p));

// Écoute les modifications faites depuis un autre appareil ou par les autres voyageurs
export function watchTrips(uid, onChange, onError) {
  return fb.onSnapshot(myTrips(uid), (snap) => {
    snap.docChanges().forEach((c) => {
      if (c.doc.metadata.hasPendingWrites) return; // ma propre modification, pas encore confirmée
      onChange(c.doc.id, c.type === "removed" ? null : normalize(c.doc.data()));
    });
  }, onError);
}
