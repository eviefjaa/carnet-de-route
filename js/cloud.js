// Comptes et synchronisation avec Firebase (Authentication + Firestore)
//
// Voyages : trips/{idDuVoyage}, partagés entre leurs voyageurs
// Préférences et rappels envoyés : users/{uid}/meta/…

import { firebaseConfig } from "./firebase-config.js";

const V = "10.12.2";
const SDK = `https://www.gstatic.com/firebasejs/${V}`;

let auth = null, db = null, fb = null;

export const isEnabled = () => !!firebaseConfig;

// Charge Firebase seulement si le site est configuré
export async function init(onUser) {
  if (!firebaseConfig) return false;
  const [app, a, f] = await Promise.all([
    import(`${SDK}/firebase-app.js`),
    import(`${SDK}/firebase-auth.js`),
    import(`${SDK}/firebase-firestore.js`),
  ]);
  fb = { ...a, ...f };
  const firebaseApp = app.initializeApp(firebaseConfig);
  auth = a.getAuth(firebaseApp);
  auth.languageCode = "fr";
  db = f.getFirestore(firebaseApp);
  a.onAuthStateChanged(auth, (u) => onUser(u ? { uid: u.uid, email: u.email, emailVerified: u.emailVerified } : null));
  return true;
}

// ---------- Compte ----------
// Un e-mail de confirmation est envoyé : les rappels ne partent que vers une adresse confirmée
export async function signUp(email, password) {
  const cred = await fb.createUserWithEmailAndPassword(auth, email, password);
  await fb.sendEmailVerification(cred.user).catch(() => {});
  return cred;
}
export const resendVerification = () => fb.sendEmailVerification(auth.currentUser);

// L'état « adresse confirmée » est gardé en mémoire par Firebase : on le redemande au serveur
export async function refreshEmailVerified() {
  await auth.currentUser.reload();
  // Nouveau jeton : les règles Firestore voient aussi l'adresse comme confirmée
  if (auth.currentUser.emailVerified) await auth.currentUser.getIdToken(true);
  return auth.currentUser.emailVerified;
}

export const signIn = (email, password) => fb.signInWithEmailAndPassword(auth, email, password);
export const signOut = () => fb.signOut(auth);
export const resetPassword = (email) => fb.sendPasswordResetEmail(auth, email);

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
export const SHARING = ["owner", "members", "invites", "emails"];

const tripDoc = (id) => fb.doc(db, "trips", id);
const myTrips = (uid) => fb.query(fb.collection(db, "trips"), fb.where("members", "array-contains", uid));

// Un voyage peut avoir été écrit par un autre voyageur : on garantit sa forme minimale
function normalize(t) {
  if (!Array.isArray(t.items)) t.items = [];
  t.items = t.items.filter((i) => i && typeof i === "object" && typeof i.id === "string");
  t.items.forEach((i) => {
    for (const k of ["todos", "tickets", "links"]) if (k in i && !Array.isArray(i[k])) i[k] = [];
    if (Array.isArray(i.todos)) i.todos = i.todos.filter((x) => x && typeof x === "object");
  });
  if (typeof t.name !== "string") t.name = "Sans titre";
  return t;
}

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

export const saveTrip = (id, trip, isNew) =>
  isNew ? fb.setDoc(tripDoc(id), clean(trip)) : fb.setDoc(tripDoc(id), content(trip), { merge: true });
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
      await fb.updateDoc(d.ref, { members: fb.arrayUnion(me.uid), invites: fb.arrayRemove(email), [`emails.${me.uid}`]: me.email });
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
    if (snap.metadata.hasPendingWrites) return; // nos propres modifications
    snap.docChanges().forEach((c) => onChange(c.doc.id, c.type === "removed" ? null : normalize(c.doc.data())));
  }, onError);
}
