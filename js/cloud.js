// Comptes et synchronisation avec Firebase (Authentication + Firestore)
//
// Voyages : trips/{idDuVoyage}, partagés entre leurs voyageurs
// Préférences et rappels envoyés : users/{uid}/meta/…

import { firebaseConfig } from "./firebase-config.js";
import { mergeTrip } from "./merge.js";
import { describeChanges, mergeEdit } from "./changes.js";
import { dayOrEmpty, timeOrEmpty } from "./utils.js";
import { t } from "./i18n.js";

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
  // Codes Firebase → clés err.* (« auth/wrong-password » et « auth/invalid-credential » : même message)
  const keys = {
    "auth/invalid-email": "err.invalidEmail",
    "auth/missing-email": "auth.needEmail",
    "auth/missing-password": "auth.needPassword",
    "auth/weak-password": "err.weakPassword",
    "auth/email-already-in-use": "err.emailInUse",
    "auth/invalid-credential": "err.wrongCredentials",
    "auth/wrong-password": "err.wrongCredentials",
    "auth/user-not-found": "err.userNotFound",
    "auth/too-many-requests": "err.tooMany",
    "auth/network-request-failed": "err.offline",
    "auth/operation-not-allowed": "err.emailDisabled",
  };
  return t(keys[code] || "err.generic");
}

// ---------- Voyages ----------
// Chaque voyage est dans trips/{id}, avec ses voyageurs :
//   owner    uid du créateur
//   members  uid des voyageurs (le créateur compris)
//   invites  adresses e-mail invitées qui n'ont pas encore rejoint (en minuscules)
//   inviteUids  comptes invités par leur nom ou pseudo (personnes de mon réseau), pas encore là
//   emails   { uid: adresse e-mail } des voyageurs, pour les afficher
//   joined   { uid: date à laquelle la personne a rejoint le voyage }, pour les notifications
//   lastEdit { uid: { at, since, what, more } } : dernière série de modifications de chaque voyageur
//            (ce qu'il a changé, en 5 phrases au plus), pour prévenir les autres. Chacun n'écrit que la sienne.
export const SHARING = ["owner", "members", "invites", "inviteUids", "emails", "joined", "lastEdit"];

const tripDoc = (id) => fb.doc(db, "trips", id);
const myTrips = (uid) => fb.query(fb.collection(db, "trips"), fb.where("members", "array-contains", uid));

// Un voyage peut avoir été écrit par un autre voyageur : chaque champ est remis au bon type
// (texte, nombre, liste), sinon une valeur piégée ferait planter l'affichage chez tous ses membres.
const STR = ["place", "country", "arrive", "depart", "address", "notes", "mode", "from", "to", "dep", "arr", "company", "ref", "url"];
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const str = (x) => (typeof x === "string" ? x : "");

function normalize(trip) {
  if (typeof trip.name !== "string") trip.name = t("trip.untitled");
  if (typeof trip.currency !== "string") trip.currency = "EUR";
  if ("kind" in trip && trip.kind !== "sejour") delete trip.kind; // road trip par défaut
  if ("inviteUids" in trip) trip.inviteUids = (Array.isArray(trip.inviteUids) ? trip.inviteUids : []).filter((u) => typeof u === "string");
  // Modifications des voyageurs : dates en millisecondes, phrases courtes, rien d'autre
  if ("lastEdit" in trip) {
    const ms = (v) => (v && v.toMillis ? v.toMillis() : Number.isFinite(v) ? v : 0);
    trip.lastEdit = Object.fromEntries(Object.entries(isObj(trip.lastEdit) ? trip.lastEdit : {}).filter(([, e]) => isObj(e)).map(([u, e]) => [u, {
      at: ms(e.at), since: ms(e.since),
      what: (Array.isArray(e.what) ? e.what : []).filter((w) => typeof w === "string").slice(0, 5).map((w) => w.slice(0, 120)),
      more: Number.isInteger(e.more) && e.more > 0 ? e.more : 0,
    }]));
  }
  // Itinéraire publié dont le voyage est tiré : id de la publication et pseudo de l'auteur
  if ("source" in trip && !(isObj(trip.source) && /^[A-Za-z0-9_-]{1,64}$/.test(trip.source.postId) && typeof trip.source.ownerHandle === "string")) delete trip.source;
  trip.items = (Array.isArray(trip.items) ? trip.items : []).filter((i) => isObj(i) && typeof i.id === "string" && (i.type === "stop" || i.type === "transport"));
  trip.items.forEach((i) => {
    STR.forEach((k) => { if (k in i) i[k] = str(i[k]); });
    if ("price" in i && !(typeof i.price === "number" && Number.isFinite(i.price))) i.price = null;
    if ("nights" in i) delete i.nights; // calculé à partir des dates, jamais lu tel quel
    ["arriveTime", "departTime"].forEach((k) => { if (k in i) i[k] = timeOrEmpty(i[k]); });
    if ("countryCode" in i && !/^[A-Z]{2}$/.test(i.countryCode)) delete i.countryCode;
    ["geo", "fromGeo", "toGeo"].forEach((k) => { if (k in i && !(isObj(i[k]) && Number.isFinite(i[k].lat) && Number.isFinite(i[k].lng))) delete i[k]; });
    if ("route" in i && !(isObj(i.route) && typeof i.route.key === "string")) delete i.route;
    i.todos = (Array.isArray(i.todos) ? i.todos : []).filter(isObj).map((x) => ({ ...x, id: str(x.id), text: str(x.text), done: x.done === true, ...("book" in x ? { book: x.book !== false } : {}), ...("maps" in x ? { maps: str(x.maps) } : {}), ...("date" in x ? { date: dayOrEmpty(x.date) } : {}),
      ...("time" in x ? { time: /^([01]\d|2[0-3]):[0-5]\d$/.test(x.time) ? x.time : "" } : {}), ...("how" in x ? { how: str(x.how) } : {}),
      ...("price" in x ? { price: typeof x.price === "number" && Number.isFinite(x.price) && x.price >= 0 ? x.price : null } : {}) }));
    i.links = (Array.isArray(i.links) ? i.links : []).filter(isObj).map((l) => ({ id: str(l.id), label: str(l.label), url: str(l.url) }));
    const files = (list) => (Array.isArray(list) ? list : []).filter(isObj).map((f) => ({ id: str(f.id), name: str(f.name), type: str(f.type), size: Number(f.size) || 0 }));
    i.tickets = files(i.tickets);
    i.todos.forEach((x) => { if ("tickets" in x) x.tickets = files(x.tickets); });
  });
  return trip;
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
const clean = (trip) => JSON.parse(JSON.stringify(trip));

// Contenu seul : les voyageurs ne changent qu'avec les fonctions plus bas,
// pour ne pas écraser une invitation faite au même moment par quelqu'un d'autre
function content(trip) {
  const c = clean(trip);
  SHARING.forEach((k) => delete c[k]);
  return c;
}

// Nouveau voyage : on en est le créateur et le seul voyageur
export const newTripSharing = () => ({ owner: me.uid, members: [me.uid], invites: [], inviteUids: [], emails: { [me.uid]: me.email } });

// Enregistre un voyage. Un voyage existant est relu sur le serveur dans une transaction, puis fusionné
// avec ma version (merge.js) : les modifications faites au même moment par les autres voyageurs
// ne sont pas écrasées. Renvoie la version fusionnée (ce qui est maintenant sur le serveur).
export async function saveTrip(id, trip, isNew, base) {
  if (isNew) {
    const c = clean(trip);
    delete c.lastEdit; // un voyage nouveau n'a pas de modifications à signaler
    await fb.setDoc(tripDoc(id), c);
    return null;
  }
  return fb.runTransaction(db, async (tx) => {
    const snap = await tx.get(tripDoc(id));
    if (!snap.exists()) throw Object.assign(new Error("Voyage supprimé"), { code: "not-found" });
    const server = normalize(snap.data());
    const mine = clean(trip);
    const merged = base ? mergeTrip(base, mine, server, SHARING) : { ...server, ...content(trip) };
    const data = content(merged);
    // Ce que j'ai changé depuis la dernière version synchronisée : seulement ma trace, regroupée dans l'heure
    const what = base ? describeChanges(base, mine) : [];
    if (what.length) {
      const prev = (server.lastEdit || {})[me.uid];
      const e = mergeEdit(prev, what, Date.now());
      const at = fb.serverTimestamp();
      data.lastEdit = { [me.uid]: { at, since: e.since ? fb.Timestamp.fromMillis(e.since) : at, what: e.what, more: e.more } };
      merged.lastEdit = { ...(server.lastEdit || {}), [me.uid]: { at: Date.now(), since: e.since || Date.now(), what: e.what, more: e.more } };
    }
    tx.set(tripDoc(id), data, { merge: true }); // lastEdit fusionné clé par clé : celles des autres restent
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
// Invitation d'un compte de mon réseau (abonnement accepté, vérifié par les règles)
export const inviteUid = (id, uid) => fb.updateDoc(tripDoc(id), { inviteUids: fb.arrayUnion(uid) });
export const cancelInviteUid = (id, uid) => fb.updateDoc(tripDoc(id), { inviteUids: fb.arrayRemove(uid) });

// Retirer un voyageur (le créateur), ou se retirer soi-même (quitter le voyage)
export const removeMember = (id, uid) =>
  fb.updateDoc(tripDoc(id), { members: fb.arrayRemove(uid), [`emails.${uid}`]: fb.deleteField(), [`lastEdit.${uid}`]: fb.deleteField() });

// Invitations en attente : rien n'est rejoint sans mon accord, on choisit « Rejoindre » ou « Refuser ».
// Deux sortes : par mon adresse (adresse confirmée obligatoire) et par mon compte (inviteUids).
// Un même voyage peut m'inviter des deux façons : il n'apparaît qu'une fois.
export function mergeInvitations(byEmail, byUid) {
  const out = new Map();
  for (const [list, key] of [[byEmail, "byEmail"], [byUid, "byUid"]]) {
    for (const i of list) out.set(i.id, { ...(out.get(i.id) || { byEmail: false, byUid: false }), ...i, [key]: true });
  }
  return [...out.values()];
}

const invitation = (d) => {
  const trip = d.data();
  const from = trip.emails && typeof trip.emails[trip.owner] === "string" ? trip.emails[trip.owner] : "";
  return { id: d.id, name: typeof trip.name === "string" && trip.name ? trip.name.slice(0, 200) : t("trip.untitled"), from };
};

export async function listInvitations() {
  const trips = fb.collection(db, "trips");
  const [byEmail, byUid] = await Promise.all([
    me.emailVerified ? fb.getDocs(fb.query(trips, fb.where("invites", "array-contains", me.email.toLowerCase()))) : null,
    fb.getDocs(fb.query(trips, fb.where("inviteUids", "array-contains", me.uid))),
  ]);
  return mergeInvitations(byEmail ? byEmail.docs.map(invitation) : [], byUid.docs.map(invitation));
}

// Mes invitations retirées du voyage : seulement celles qui existent (un champ absent ne doit pas apparaître)
const myInvites = (inv) => ({
  ...(inv.byEmail ? { invites: fb.arrayRemove(me.email.toLowerCase()) } : {}),
  ...(inv.byUid ? { inviteUids: fb.arrayRemove(me.uid) } : {}),
});

// inv : l'invitation telle que listInvitations la renvoie
export const joinTrip = (id, inv = { byEmail: true }) => fb.updateDoc(tripDoc(id), {
  members: fb.arrayUnion(me.uid), ...myInvites(inv),
  [`emails.${me.uid}`]: me.email, [`joined.${me.uid}`]: fb.serverTimestamp(),
});

export const declineInvite = (id, inv = { byEmail: true }) => fb.updateDoc(tripDoc(id), myInvites(inv));

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

// ---------- Suppression du compte ----------
// Firebase demande une connexion récente pour supprimer un compte : on redemande le mot de passe
export async function reauthenticate(password) {
  const u = auth.currentUser;
  await fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, password));
}

// Mes voyages : supprimés (avec leurs billets) si j'y suis seul(e) ; sinon je m'en retire,
// et un voyage que j'ai créé est confié au voyageur suivant, pour ne rien effacer aux autres
export async function releaseMyTrips() {
  const snap = await fb.getDocs(myTrips(me.uid));
  for (const d of snap.docs) {
    const trip = d.data();
    const others = (Array.isArray(trip.members) ? trip.members : []).filter((u) => u !== me.uid);
    const out = {
      members: fb.arrayRemove(me.uid),
      [`emails.${me.uid}`]: fb.deleteField(),
      ...(trip.joined && me.uid in trip.joined ? { [`joined.${me.uid}`]: fb.deleteField() } : {}),
      ...(trip.lastEdit && me.uid in trip.lastEdit ? { [`lastEdit.${me.uid}`]: fb.deleteField() } : {}),
    };
    if (trip.owner !== me.uid) await fb.updateDoc(d.ref, out);
    else if (others.length) await fb.updateDoc(d.ref, { ...out, owner: others[0] });
    else await deleteTrip(d.id);
  }
  // Invitations reçues (par adresse confirmée ou par compte) : refusées, pour que mon adresse
  // et mon compte disparaissent des voyages des autres
  for (const i of await listInvitations()) await declineInvite(i.id, i);
}

// Préférences, rappels déjà envoyés et anciens voyages (users/{uid}/…)
export async function deleteMyPrivateData() {
  const old = await fb.getDocs(fb.collection(db, "users", me.uid, "trips"));
  await Promise.all([
    ...old.docs.map((d) => fb.deleteDoc(d.ref)),
    fb.deleteDoc(fb.doc(db, "users", me.uid, "meta", "prefs")),
    fb.deleteDoc(fb.doc(db, "users", me.uid, "meta", "reminders")),
  ]);
}

export const deleteAuthUser = () => fb.deleteUser(auth.currentUser);

// Écoute les modifications faites depuis un autre appareil ou par les autres voyageurs
export function watchTrips(uid, onChange, onError) {
  return fb.onSnapshot(myTrips(uid), (snap) => {
    snap.docChanges().forEach((c) => {
      if (c.doc.metadata.hasPendingWrites) return; // ma propre modification, pas encore confirmée
      onChange(c.doc.id, c.type === "removed" ? null : normalize(c.doc.data()));
    });
  }, onError);
}
