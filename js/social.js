// Profils publics, abonnements et publications d'itinéraires (Firestore)
//
//   profiles/{uid}        { name, nameLower, handle, bio, visibility: "public" | "private" }
//   handles/{pseudo}      { uid } : réserve un pseudo unique
//   follows/{abonné_suivi} { follower, followed, status: "accepted" | "pending", createdAt }
//   posts/{id}            { owner, ownerName, ownerHandle, title, visibility, publishedAt, trip, recos }
//                         (trip.budget : seulement si l'auteur a choisi de montrer le budget)
//   posts/{id}/comments/{id} { author, authorName, authorHandle, text, createdAt,
//                              replyTo, replyToAuthor (réponse à un commentaire), likedBy (qui l'aime) }
//   posts/{id}/likes/{uid}   { name, handle, at } : mis en favori (visible par l'auteur seulement)
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
  await F().fb.setDoc(followDoc(me(), profile.uid), { follower: me(), followed: profile.uid, status, createdAt: F().fb.serverTimestamp() });
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
// Date Firestore (Timestamp) ou nombre de millisecondes → millisecondes
const toMs = (v) => (v && v.toMillis ? v.toMillis() : v && typeof v.seconds === "number" ? v.seconds * 1000 : typeof v === "number" ? v : 0);
const postsCol = () => F().fb.collection(F().db, "posts");
const newPostId = () => `p${String(1e13 - Date.now()).padStart(13, "0")}${uid()}`;
// Une publication a pu être écrite directement dans Firebase, sans passer par le site :
// chaque champ est remis au bon type avant affichage
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const text = (x, max = 500) => (typeof x === "string" ? x.slice(0, max) : "");
const intOrNull = (x) => (Number.isInteger(x) && x >= 0 ? x : null);
const geoOrNull = (g) => (isObj(g) && Number.isFinite(g.lat) && Number.isFinite(g.lng) ? { lat: g.lat, lng: g.lng } : null);
// Budget publié (facultatif) : montants positifs, devise en 3 lettres, sinon pas de budget
const amount = (n) => (typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 1e9 ? n : 0);
function normalizeBudget(b) {
  if (!isObj(b) || !/^[A-Z]{3}$/.test(b.currency)) return null;
  return {
    currency: b.currency, lodging: amount(b.lodging), transport: amount(b.transport),
    missing: Number.isInteger(b.missing) && b.missing > 0 ? b.missing : 0,
    rows: (Array.isArray(b.rows) ? b.rows : []).filter(isObj).slice(0, 60).map((r) => ({ place: text(r.place, 120), lodging: amount(r.lodging), transport: amount(r.transport) })),
  };
}

function normalizePost(id, p) {
  const trip = isObj(p.trip) ? p.trip : {};
  const items = (Array.isArray(trip.items) ? trip.items : []).filter(isObj).map((i) => i.type === "transport"
    ? { type: "transport", mode: text(i.mode, 20), from: text(i.from, 120), to: text(i.to, 120), day: intOrNull(i.day), duration: text(i.duration, 20),
        // Tracé de la route (format polyline : caractères 63 à 126 seulement)
        fromGeo: geoOrNull(i.fromGeo), toGeo: geoOrNull(i.toGeo),
        line: typeof i.line === "string" && i.line.length <= 20000 && /^[\x3f-\x7e]*$/.test(i.line) ? i.line : "", km: intOrNull(i.km) }
    : { type: "stop", place: text(i.place, 120), country: text(i.country, 60), day: intOrNull(i.day), nights: intOrNull(i.nights),
        geo: geoOrNull(i.geo),
        todos: (Array.isArray(i.todos) ? i.todos : []).map((t) => text(t, 120)).filter(Boolean),
        // Programme d'un séjour : jour (entier), heure (HH:MM), activité, comment y aller
        program: (Array.isArray(i.program) ? i.program : []).filter(isObj).slice(0, 60).map((a) => ({
          text: text(a.text, 120), day: intOrNull(a.day), time: /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time) ? a.time : "", how: text(a.how, 200),
        })).filter((a) => a.text) });
  return {
    id, owner: text(p.owner, 128), ownerName: text(p.ownerName, 40), ownerHandle: text(p.ownerHandle, 20),
    title: text(p.title, 200) || "Sans titre",
    visibility: VISIBILITIES[p.visibility] ? p.visibility : "private",
    publishedAt: toMs(p.publishedAt),
    favCount: Number.isInteger(p.favCount) && p.favCount > 0 ? p.favCount : 0, // nombre de mises en favori (public)
    trip: { kind: trip.kind === "sejour" ? "sejour" : "", country: text(trip.country, 2), countries: (Array.isArray(trip.countries) ? trip.countries : []).filter((c) => /^[A-Z]{2}$/.test(c)).slice(0, 10), days: intOrNull(trip.days), nights: intOrNull(trip.nights), items,
      budget: normalizeBudget(trip.budget) },
    recos: (Array.isArray(p.recos) ? p.recos : []).filter(isObj).slice(0, 50).map((r) => ({
      kind: RECO_KINDS[r.kind] ? r.kind : "autre", name: text(r.name, 100), where: text(r.where, 120),
      note: text(r.note, 500), url: text(r.url, 500), stop: Number.isInteger(r.stop) ? r.stop : null,
    })).filter((r) => r.name),
  };
}
const docs = (snap) => snap.docs.map((d) => normalizePost(d.id, d.data()));
export { normalizePost }; // pour les tests
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

export async function publish(trip, { title, visibility, recos, budget = false }) {
  const p = state.profile;
  const id = newPostId();
  await F().fb.setDoc(F().fb.doc(F().db, "posts", id), {
    owner: me(), ownerName: p.name, ownerHandle: p.handle,
    title, visibility, publishedAt: F().fb.serverTimestamp(), trip: publicCopy(trip, { budget }), recos: cleanRecos(recos),
  });
  resetSocial();
  return id;
}

export async function getPost(id) {
  const snap = await F().fb.getDoc(F().fb.doc(F().db, "posts", id));
  return snap.exists() ? normalizePost(id, snap.data()) : null;
}

export async function setPostVisibility(id, visibility) {
  await F().fb.updateDoc(F().fb.doc(F().db, "posts", id), { visibility });
  resetSocial();
}

// Les commentaires et les mises en favori sont supprimés avec la publication
export async function deletePost(id) {
  const { fb, db } = F();
  const [comments, likes] = await Promise.all([
    fb.getDocs(fb.collection(db, "posts", id, "comments")),
    fb.getDocs(fb.collection(db, "posts", id, "likes")),
  ]);
  await Promise.all([...comments.docs, ...likes.docs].map((d) => fb.deleteDoc(d.ref)));
  await fb.deleteDoc(fb.doc(db, "posts", id));
  resetSocial();
}

// Suppression du compte : tout ce que j'ai publié ou écrit. Mes publications (avec leurs commentaires
// et favoris), mes commentaires et réponses chez les autres, mes favoris, mes abonnements dans
// les deux sens, mon profil et mon pseudo. favoritePosts : les itinéraires que j'ai mis en favori.
export async function deleteMySocialData(favoritePosts = []) {
  const { fb, db } = F();
  const mine = await fb.getDocs(fb.query(postsCol(), fb.where("owner", "==", me())));
  for (const d of mine.docs) await deletePost(d.id);
  const comments = await fb.getDocs(fb.query(fb.collectionGroup(db, "comments"), fb.where("author", "==", me())));
  await Promise.all(comments.docs.map((d) => fb.deleteDoc(d.ref)));
  // Un favori sur un itinéraire supprimé depuis, ou d'avant mon profil, n'a rien à retirer
  for (const id of favoritePosts) await unlikePost(id).catch(() => {});
  const follows = fb.collection(db, "follows");
  const [a, b] = await Promise.all([
    fb.getDocs(fb.query(follows, fb.where("follower", "==", me()))),
    fb.getDocs(fb.query(follows, fb.where("followed", "==", me()))),
  ]);
  await Promise.all([...a.docs, ...b.docs].map((d) => fb.deleteDoc(d.ref)));
  const profile = await getProfile(me());
  const batch = fb.writeBatch(db);
  if (profile && HANDLE_RE.test(profile.handle || "")) batch.delete(fb.doc(db, "handles", profile.handle));
  batch.delete(fb.doc(db, "profiles", me()));
  await batch.commit();
  state.profile = null;
  resetSocial();
}

// ---------- Mises en favori (pour prévenir l'auteur, et classer les itinéraires) ----------
// Sans profil, le favori reste seulement dans mes préférences : l'auteur n'est pas prévenu et rien n'est compté.
// Le compteur public favCount change dans la même écriture que mon favori : les règles vérifient
// qu'il ne bouge que de 1, et seulement quand mon favori apparaît ou disparaît.
export async function likePost(id) {
  if (!state.user || !state.profile) return;
  const { fb, db } = F();
  const batch = fb.writeBatch(db);
  batch.set(fb.doc(db, "posts", id, "likes", me()), { name: state.profile.name, handle: state.profile.handle, at: fb.serverTimestamp() });
  batch.update(fb.doc(db, "posts", id), { favCount: fb.increment(1) });
  await batch.commit();
}
export async function unlikePost(id) {
  if (!state.user) return;
  const { fb, db } = F();
  const like = fb.doc(db, "posts", id, "likes", me());
  const batch = fb.writeBatch(db);
  batch.delete(like);
  batch.update(fb.doc(db, "posts", id), { favCount: fb.increment(-1) });
  // Favori d'avant le compteur (il n'a pas été compté) : on le retire sans décompter
  await batch.commit().catch(() => fb.deleteDoc(like));
}

// ---------- Commentaires ----------
export async function listComments(postId) {
  const { fb, db } = F();
  const snap = await fb.getDocs(fb.query(fb.collection(db, "posts", postId, "comments"), fb.orderBy("createdAt"), fb.limit(200)));
  return snap.docs.map((d) => normalizeComment(d.id, d.data()));
}

// Chaque champ remis au bon type (un commentaire a pu être écrit sans passer par le site)
function normalizeComment(id, c) {
  return {
    id, author: text(c.author, 128), authorName: text(c.authorName, 40), authorHandle: text(c.authorHandle, 20),
    text: text(c.text, 1000), createdAt: toMs(c.createdAt) || Date.now(),
    replyTo: text(c.replyTo, 128), replyToAuthor: text(c.replyToAuthor, 128),
    likedBy: (Array.isArray(c.likedBy) ? c.likedBy : []).filter((u) => typeof u === "string"),
  };
}
export { normalizeComment }; // pour les tests

// reply : { id, author } du commentaire auquel on répond (les réponses restent sur un seul niveau)
export async function addComment(postId, body, reply = null) {
  const { fb, db } = F();
  const p = state.profile;
  await fb.addDoc(fb.collection(db, "posts", postId, "comments"), {
    author: me(), authorName: p.name, authorHandle: p.handle, text: body, createdAt: fb.serverTimestamp(),
    ...(reply ? { replyTo: reply.id, replyToAuthor: reply.author } : {}),
  });
  cache.delete("comments:" + postId);
}

// J'aime / je n'aime plus un commentaire : les règles vérifient que seul mon identifiant bouge
export async function likeComment(postId, commentId, on) {
  const { fb, db } = F();
  await fb.updateDoc(fb.doc(db, "posts", postId, "comments", commentId), { likedBy: on ? fb.arrayUnion(me()) : fb.arrayRemove(me()) });
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

// Fiche pays : les itinéraires publics du pays les plus mis en favori (à égalité, le plus récent)
// Deux recherches : par pays traversé (trip.countries), et par pays du voyage (trip.country, seul
// renseigné sur les publications plus anciennes). L'une peut échouer sans priver de l'autre.
export async function topPostsIn(country, max = 4) {
  const { fb } = F();
  const get = (filter) => fb.getDocs(fb.query(postsCol(), fb.where("visibility", "==", "public"), filter, fb.limit(50))).then(docs).catch(() => null);
  const [crossed, main] = await Promise.all([get(fb.where("trip.countries", "array-contains", country)), get(fb.where("trip.country", "==", country))]);
  if (!crossed && !main) throw new Error("Itinéraires indisponibles");
  const list = [...new Map([...(crossed || []), ...(main || [])].map((p) => [p.id, p])).values()];
  return list.sort((a, b) => b.favCount - a.favCount || newestFirst(a, b)).slice(0, max);
}

// ---------- Notifications ----------
// Déduites de ce qui existe déjà (abonnements, commentaires) : personne ne peut en fabriquer.
//   comment   quelqu'un a commenté un de mes itinéraires
//   reply     quelqu'un a répondu à un de mes commentaires
//   follow    quelqu'un s'est abonné à moi
//   request   quelqu'un demande à s'abonner (compte privé)
//   accepted  quelqu'un a accepté ma demande d'abonnement
//   joined    quelqu'un a rejoint un de mes voyages partagés
//   favorite  quelqu'un a mis un de mes itinéraires en favori

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
        type: c.replyToAuthor === me() ? "reply" : "comment", who: c.author, name: c.authorName, handle: c.authorHandle, at: c.createdAt,
        postId: p.id, postTitle: p.title, text: c.text,
      })))
      .catch(() => [])));
  items.push(...comments.flat());

  // Réponses à mes commentaires sur les itinéraires des autres (les miens sont déjà comptés)
  const mineIds = new Set(posts.map((p) => p.id));
  const replies = await fb.getDocs(fb.query(fb.collectionGroup(db, "comments"), fb.where("replyToAuthor", "==", me()), fb.limit(50)))
    .then((snap) => snap.docs.map((d) => ({ postId: d.ref.parent.parent.id, c: normalizeComment(d.id, d.data()) })))
    .catch(() => []);
  items.push(...replies.filter((r) => !mineIds.has(r.postId) && r.c.author !== me()).map(({ postId, c }) => ({
    type: "reply", who: c.author, name: c.authorName, handle: c.authorHandle, at: c.createdAt, postId, postTitle: "", text: c.text,
  })));

  const likes = await Promise.all(posts.slice(0, 30).map((p) =>
    fb.getDocs(fb.collection(db, "posts", p.id, "likes"))
      .then((snap) => snap.docs.map((d) => {
        const l = d.data();
        return { type: "favorite", who: d.id, name: text(l.name, 40) || "Quelqu'un", handle: text(l.handle, 20), at: toMs(l.at), postId: p.id, postTitle: p.title };
      }))
      .catch(() => [])));
  items.push(...likes.flat());

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
    if (await cloud.ready) {
      state.notifs = { list: await loadNotifications(), at: Date.now() };
      if (state.user.emailVerified) state.invitations = await cloud.listInvitations().catch(() => state.invitations);
    }
  } catch {
    // hors ligne : on garde la dernière liste
  }
  notifLoading = false;
  rerender();
}
