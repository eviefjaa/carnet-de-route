// Profils publics, abonnements et publications d'itinéraires (Firestore)
//
//   profiles/{uid}        { name, nameLower, handle, bio, visibility: "public" | "private" }
//   handles/{pseudo}      { uid } : réserve un pseudo unique
//   follows/{abonné_suivi} { follower, followed, status: "accepted" | "pending", createdAt }
//   posts/{id}            { owner, ownerName, ownerHandle, title, visibility, publishedAt, trip, recos }
//   posts/{id}/comments/{id} { author, authorName, authorHandle, text, createdAt }
//
// Les identifiants des publications commencent par un compte à rebours de l'heure :
// Firestore les rend donc de la plus récente à la plus ancienne, sans index à créer.
// Règles de sécurité : firestore.rules (qui voit quoi, qui peut modifier quoi).

import * as cloud from "./cloud.js";
import { state } from "./store.js";
import { uid, safeUrl } from "./utils.js";
import { publicCopy } from "./publish.js";

const F = () => cloud.firestore();
const me = () => (state.user ? state.user.uid : null);

export const HANDLE_RE = /^[a-z0-9_.]{3,20}$/;
// Types de recommandations
export const RECO_KINDS = {
  resto: "Restaurant",
  logement: "Hébergement",
  adresse: "Adresse",
  activite: "Activité",
  autre: "Autre",
};

export const VISIBILITIES = {
  public: "Tout le monde",
  followers: "Mes abonnés",
  private: "Moi seul(e)",
};

// ---------- Données chargées pour les pages (rechargées après chaque changement) ----------
const cache = new Map();
let rerender = () => {};
export const onSocialLoaded = (fn) => (rerender = fn);

// { status: "loading" | "ok" | "error", data } ; la page est réaffichée une fois les données là
export function load(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const entry = { status: "loading", data: null };
  cache.set(key, entry);
  cloud.ready
    .then((ok) => {
      if (!ok) throw new Error("Firebase indisponible");
      return fn();
    })
    .then((data) => Object.assign(entry, { status: "ok", data }))
    .catch((err) => Object.assign(entry, { status: "error", error: err }))
    .finally(() => cache.get(key) === entry && rerender());
  return entry;
}
export const resetSocial = () => cache.clear();
// Données déjà chargées pour cette clé, sans lancer de chargement
export const peek = (key) => cache.get(key) || { status: "none", data: null };

// ---------- Profil ----------
export async function getProfile(id) {
  const { fb, db } = F();
  const snap = await fb.getDoc(fb.doc(db, "profiles", id));
  return snap.exists() ? { uid: id, ...snap.data() } : null;
}

// Mon profil public, gardé dans state.profile (null tant qu'il n'est pas créé)
export async function loadMyProfile() {
  state.profile = me() ? await getProfile(me()).catch(() => null) : null;
  return state.profile;
}

export async function saveProfile({ name, handle, bio, visibility }) {
  const { fb, db } = F();
  const old = state.profile;
  const batch = fb.writeBatch(db);
  if (!old || old.handle !== handle) {
    const taken = await fb.getDoc(fb.doc(db, "handles", handle));
    if (taken.exists() && taken.data().uid !== me()) throw Object.assign(new Error("pris"), { code: "handle-taken" });
    if (!taken.exists()) batch.set(fb.doc(db, "handles", handle), { uid: me() });
    if (old && old.handle) batch.delete(fb.doc(db, "handles", old.handle));
  }
  const profile = { name, nameLower: name.toLowerCase(), handle, bio, visibility };
  batch.set(fb.doc(db, "profiles", me()), profile);
  await batch.commit();
  state.profile = { uid: me(), ...profile };
  resetSocial();
}

// Recherche par début de pseudo ou de nom
export async function searchProfiles(text) {
  const q = text.trim().toLowerCase().replace(/^@/, "");
  if (q.length < 2) return [];
  const { fb, db } = F();
  const col = fb.collection(db, "profiles");
  const run = (field) => fb.getDocs(fb.query(col, fb.orderBy(field), fb.startAt(q), fb.endAt(q + ""), fb.limit(8)));
  const [byHandle, byName] = await Promise.all([run("handle"), run("nameLower")]);
  const found = new Map();
  [...byHandle.docs, ...byName.docs].forEach((d) => found.set(d.id, { uid: d.id, ...d.data() }));
  return [...found.values()].slice(0, 10);
}

// ---------- Abonnements ----------
const followDoc = (follower, followed) => F().fb.doc(F().db, "follows", `${follower}_${followed}`);

// Compte public : abonnement immédiat. Compte privé : demande à accepter.
export async function follow(profile) {
  const status = profile.visibility === "public" ? "accepted" : "pending";
  await F().fb.setDoc(followDoc(me(), profile.uid), { follower: me(), followed: profile.uid, status, createdAt: Date.now() });
  resetSocial();
  return status;
}

// Se désabonner, annuler sa demande, retirer un abonné ou refuser une demande
export async function unfollow(followed) {
  await F().fb.deleteDoc(followDoc(me(), followed));
  resetSocial();
}
export async function removeFollower(follower) {
  await F().fb.deleteDoc(followDoc(follower, me()));
  resetSocial();
}
export async function acceptFollower(follower) {
  await F().fb.updateDoc(followDoc(follower, me()), { status: "accepted", acceptedAt: F().fb.serverTimestamp() });
  resetSocial();
}

// Mon lien avec une personne : "accepted", "pending" ou null
export async function followStatus(followed) {
  const { fb, db } = F();
  const snap = await fb.getDocs(fb.query(fb.collection(db, "follows"), fb.where("follower", "==", me()), fb.where("followed", "==", followed)));
  return snap.empty ? null : snap.docs[0].data().status;
}

// Mes abonnés, mes demandes reçues et mes abonnements, avec les profils
export async function myNetwork() {
  const { fb, db } = F();
  const col = fb.collection(db, "follows");
  const [mine, theirs] = await Promise.all([
    fb.getDocs(fb.query(col, fb.where("follower", "==", me()))),
    fb.getDocs(fb.query(col, fb.where("followed", "==", me()))),
  ]);
  const withProfile = (list, key) =>
    Promise.all(list.map(async (f) => ({ ...f, profile: (await getProfile(f[key]).catch(() => null)) || { uid: f[key], name: "Compte supprimé", handle: "" } })));
  const following = mine.docs.map((d) => d.data());
  const followers = theirs.docs.map((d) => d.data());
  return {
    following: await withProfile(following, "followed"),
    followers: await withProfile(followers.filter((f) => f.status === "accepted"), "follower"),
    requests: await withProfile(followers.filter((f) => f.status === "pending"), "follower"),
  };
}

// ---------- Publications ----------
const postsCol = () => F().fb.collection(F().db, "posts");
const newPostId = () => `p${String(1e13 - Date.now()).padStart(13, "0")}${uid()}`;
const docs = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const newestFirst = (a, b) => (a.id < b.id ? -1 : 1);

// Recommandations nettoyées : type connu, textes coupés, lien http(s) seulement
const cleanRecos = (recos) => (recos || [])
  .filter((r) => r.name && r.name.trim())
  .slice(0, 50)
  .map((r) => ({
    kind: RECO_KINDS[r.kind] ? r.kind : "autre",
    name: r.name.trim().slice(0, 100),
    where: (r.where || "").trim().slice(0, 120),
    note: (r.note || "").trim().slice(0, 500),
    url: safeUrl(r.url),
    stop: Number.isInteger(r.stop) ? r.stop : null,
  }));

export async function publish(trip, { title, visibility, recos }) {
  const p = state.profile;
  const id = newPostId();
  await F().fb.setDoc(F().fb.doc(F().db, "posts", id), {
    owner: me(), ownerName: p.name, ownerHandle: p.handle,
    title, visibility, publishedAt: Date.now(), trip: publicCopy(trip), recos: cleanRecos(recos),
  });
  resetSocial();
  return id;
}

export async function getPost(id) {
  const snap = await F().fb.getDoc(F().fb.doc(F().db, "posts", id));
  return snap.exists() ? { id, ...snap.data() } : null;
}

export async function setPostVisibility(id, visibility) {
  await F().fb.updateDoc(F().fb.doc(F().db, "posts", id), { visibility });
  resetSocial();
}

// Les commentaires sont supprimés avec la publication
export async function deletePost(id) {
  const { fb, db } = F();
  const comments = await fb.getDocs(fb.collection(db, "posts", id, "comments"));
  await Promise.all(comments.docs.map((d) => fb.deleteDoc(d.ref)));
  await fb.deleteDoc(fb.doc(db, "posts", id));
  resetSocial();
}

// ---------- Commentaires ----------
export async function listComments(postId) {
  const { fb, db } = F();
  const snap = await fb.getDocs(fb.query(fb.collection(db, "posts", postId, "comments"), fb.orderBy("createdAt"), fb.limit(200)));
  return snap.docs.map((d) => {
    const c = d.data();
    return { id: d.id, ...c, createdAt: c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : Date.now() };
  });
}

export async function addComment(postId, text) {
  const { fb, db } = F();
  const p = state.profile;
  await fb.addDoc(fb.collection(db, "posts", postId, "comments"), {
    author: me(), authorName: p.name, authorHandle: p.handle, text, createdAt: fb.serverTimestamp(),
  });
  cache.delete("comments:" + postId);
}

export async function deleteComment(postId, commentId) {
  const { fb, db } = F();
  await fb.deleteDoc(fb.doc(db, "posts", postId, "comments", commentId));
  cache.delete("comments:" + postId);
}

// Publications d'une personne, selon ce que j'ai le droit de voir
export async function postsOf(owner, status) {
  const { fb } = F();
  const where = owner === me()
    ? [fb.where("owner", "==", owner)]
    : status === "accepted"
      ? [fb.where("owner", "==", owner), fb.where("visibility", "in", ["public", "followers"])]
      : [fb.where("owner", "==", owner), fb.where("visibility", "==", "public")];
  return docs(await fb.getDocs(fb.query(postsCol(), ...where, fb.limit(50)))).sort(newestFirst);
}

// Fil : dernières publications des personnes que je suis (abonnement accepté)
export async function feed() {
  const { fb, db } = F();
  const mine = await fb.getDocs(fb.query(fb.collection(db, "follows"), fb.where("follower", "==", me()), fb.where("status", "==", "accepted")));
  const owners = mine.docs.map((d) => d.data().followed).slice(0, 50);
  const lists = await Promise.all(owners.map((o) => postsOf(o, "accepted").catch(() => [])));
  return { following: owners.length, posts: lists.flat().sort(newestFirst).slice(0, 40) };
}

// Découvrir : derniers itinéraires publics de tout le monde
export async function discover() {
  const { fb } = F();
  return docs(await fb.getDocs(fb.query(postsCol(), fb.where("visibility", "==", "public"), fb.limit(30)))).sort(newestFirst);
}

// ---------- Notifications ----------
// Déduites de ce qui existe déjà (abonnements, commentaires) : personne ne peut en fabriquer.
//   comment   quelqu'un a commenté un de mes itinéraires
//   follow    quelqu'un s'est abonné à moi
//   request   quelqu'un demande à s'abonner (compte privé)
//   accepted  quelqu'un a accepté ma demande d'abonnement
//   joined    quelqu'un a rejoint un de mes voyages partagés
const toMs = (v) => (v && v.toMillis ? v.toMillis() : v && typeof v.seconds === "number" ? v.seconds * 1000 : typeof v === "number" ? v : 0);

async function loadNotifications() {
  const { fb, db } = F();
  const col = fb.collection(db, "follows");
  const [toMe, mine, posts] = await Promise.all([
    fb.getDocs(fb.query(col, fb.where("followed", "==", me()))),
    fb.getDocs(fb.query(col, fb.where("follower", "==", me()), fb.where("status", "==", "accepted"))),
    postsOf(me()),
  ]);
  const items = [];
  toMe.docs.forEach((d) => {
    const f = d.data();
    items.push({ type: f.status === "pending" ? "request" : "follow", who: f.follower, at: toMs(f.createdAt) });
  });
  mine.docs.forEach((d) => {
    const f = d.data();
    if (f.acceptedAt) items.push({ type: "accepted", who: f.followed, at: toMs(f.acceptedAt) });
  });
  const comments = await Promise.all(posts.slice(0, 30).map((p) =>
    listComments(p.id)
      .then((list) => list.filter((c) => c.author !== me()).map((c) => ({
        type: "comment", who: c.author, name: c.authorName, handle: c.authorHandle, at: c.createdAt,
        postId: p.id, postTitle: p.title, text: c.text,
      })))
      .catch(() => [])));
  items.push(...comments.flat());

  // Voyageurs qui ont rejoint mes voyages (toujours dans le voyage)
  Object.entries(state.trips).forEach(([tripId, t]) => {
    Object.entries(t.joined || {}).forEach(([u, when]) => {
      if (u === me() || !(t.members || []).includes(u)) return;
      items.push({ type: "joined", who: u, at: toMs(when), tripId, tripName: t.name || "Sans titre", email: (t.emails || {})[u] || "" });
    });
  });

  // Noms des personnes qui se sont abonnées
  const missing = [...new Set(items.filter((i) => !i.name).map((i) => i.who))];
  const profiles = Object.fromEntries(await Promise.all(missing.map(async (u) => [u, await getProfile(u).catch(() => null)])));
  items.forEach((i) => {
    if (i.name) return;
    i.name = profiles[i.who] ? profiles[i.who].name : i.email || "Quelqu'un";
    i.handle = profiles[i.who] ? profiles[i.who].handle : "";
  });
  return items.sort((a, b) => b.at - a.at).slice(0, 60);
}

// Rechargées à la connexion, à l'ouverture de la page, au retour sur l'onglet et toutes les 3 minutes
let notifLoading = false;
export async function refreshNotifications() {
  if (!state.user || notifLoading) return;
  notifLoading = true;
  try {
    if (await cloud.ready) state.notifs = { list: await loadNotifications(), at: Date.now() };
  } catch {
    // hors ligne : on garde la dernière liste
  }
  notifLoading = false;
  rerender();
}
