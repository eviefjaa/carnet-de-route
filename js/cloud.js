// Comptes et synchronisation avec Firebase (Authentication + Firestore)
//
// Chaque utilisateur a ses voyages dans : users/{uid}/trips/{idDuVoyage}

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
  a.onAuthStateChanged(auth, (u) => onUser(u ? { uid: u.uid, email: u.email } : null));
  return true;
}

// ---------- Compte ----------
export const signUp = (email, password) => fb.createUserWithEmailAndPassword(auth, email, password);
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
const tripsCol = (uid) => fb.collection(db, "users", uid, "trips");

export async function loadTrips(uid) {
  const snap = await fb.getDocs(tripsCol(uid));
  const trips = {};
  snap.forEach((d) => (trips[d.id] = d.data()));
  return trips;
}

let currentUid = null;
export function useAccount(uid) {
  currentUid = uid;
}

// Firestore refuse les valeurs undefined : on passe par JSON pour nettoyer
const clean = (t) => JSON.parse(JSON.stringify(t));

export const saveTrip = (id, trip) => fb.setDoc(fb.doc(db, "users", currentUid, "trips", id), clean(trip));
export const deleteTrip = (id) => fb.deleteDoc(fb.doc(db, "users", currentUid, "trips", id));

// Préférences (favoris, devise, thème, nom) : users/{uid}/meta/prefs
export async function loadPrefs(uid) {
  const snap = await fb.getDoc(fb.doc(db, "users", uid, "meta", "prefs"));
  return snap.exists() ? snap.data() : null;
}
export const savePrefs = (p) => fb.setDoc(fb.doc(db, "users", currentUid, "meta", "prefs"), clean(p));

// Écoute les modifications faites depuis un autre appareil
export function watchTrips(uid, onChange) {
  return fb.onSnapshot(tripsCol(uid), (snap) => {
    if (snap.metadata.hasPendingWrites) return; // nos propres modifications
    snap.docChanges().forEach((c) => onChange(c.doc.id, c.type === "removed" ? null : c.doc.data()));
  });
}
