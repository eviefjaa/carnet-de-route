import fs from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, collection, where, orderBy, startAt, endAt, limit, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-social",
  firestore: { rules: fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8181 },
});
const as = (uid) => env.authenticatedContext(uid, { email: uid + "@x.fr", email_verified: true }).firestore();
const alice = as("alice"), bob = as("bob"), carla = as("carla"), eve = as("eve");
const anon = env.unauthenticatedContext().firestore();
let ok = 0, ko = 0;
async function t(label, p, expect) {
  try { await (expect ? assertSucceeds(p) : assertFails(p)); ok++; }
  catch (e) { ko++; console.log("ÉCHEC :", label, "→", e.message.split("\n")[0]); }
}
const profile = (name, handle, visibility = "public") => ({ name, nameLower: name.toLowerCase(), handle, bio: "", visibility });
function createProfile(db, uid, name, handle, visibility) {
  const b = writeBatch(db);
  b.set(doc(db, "handles", handle), { uid });
  b.set(doc(db, "profiles", uid), profile(name, handle, visibility));
  return b.commit();
}

// ---------- Profils et pseudos ----------
await t("alice crée son profil public", createProfile(alice, "alice", "Alice", "alice", "public"), true);
await t("bob crée son profil privé", createProfile(bob, "bob", "Bob", "bob.voyage", "private"), true);
await t("eve prend le pseudo d'alice", createProfile(eve, "eve", "Eve", "alice", "public"), false);
await t("profil avec pseudo non réservé", setDoc(doc(eve, "profiles/eve"), profile("Eve", "personne")), false);
await t("pseudo invalide", setDoc(doc(eve, "handles/A B"), { uid: "eve" }), false);
await t("modifier le profil d'un autre", setDoc(doc(eve, "profiles/alice"), profile("Pirate", "alice")), false);
await t("nom trop long", updateDoc(doc(alice, "profiles/alice"), { name: "x".repeat(41), nameLower: "x".repeat(41) }), false);
await t("champ en trop", updateDoc(doc(alice, "profiles/alice"), { admin: true }), false);
await t("lire un profil sans compte", getDoc(doc(anon, "profiles/alice")), true);
await t("recherche par pseudo (connecté)", getDocs(query(collection(alice, "profiles"), orderBy("handle"), startAt("bo"), endAt("bo\uf8ff"), limit(8))), true);
await t("recherche sans compte (aspiration des profils)", getDocs(query(collection(anon, "profiles"), orderBy("handle"), limit(8))), false);
await t("liste de plus de 10 profils", getDocs(query(collection(alice, "profiles"), limit(500))), false);
await t("pseudo réservé sans profil", setDoc(doc(eve, "handles/reserve.masse"), { uid: "eve" }), false);
await createProfile(carla, "carla", "Carla", "carla", "public");

// ---------- Abonnements ----------
await t("carla suit alice (public)", setDoc(doc(carla, "follows/carla_alice"), { follower: "carla", followed: "alice", status: "accepted", createdAt: serverTimestamp() }), true);
await t("carla suit bob directement (privé)", setDoc(doc(carla, "follows/carla_bob"), { follower: "carla", followed: "bob", status: "accepted", createdAt: serverTimestamp() }), false);
await t("carla demande à suivre bob", setDoc(doc(carla, "follows/carla_bob"), { follower: "carla", followed: "bob", status: "pending", createdAt: serverTimestamp() }), true);
await t("carla accepte sa propre demande", updateDoc(doc(carla, "follows/carla_bob"), { status: "accepted", acceptedAt: serverTimestamp() }), false);
await t("eve abonne carla à sa place", setDoc(doc(eve, "follows/carla_eve"), { follower: "carla", followed: "eve", status: "pending", createdAt: serverTimestamp() }), false);
await t("se suivre soi-même", setDoc(doc(eve, "follows/eve_eve"), { follower: "eve", followed: "eve", status: "pending", createdAt: serverTimestamp() }), false);
await t("eve lit l'abonnement de carla", getDoc(doc(eve, "follows/carla_alice")), false);
await t("alice voit ses abonnés", getDocs(query(collection(alice, "follows"), where("followed", "==", "alice"))), true);
await t("carla voit ses abonnements", getDocs(query(collection(carla, "follows"), where("follower", "==", "carla"))), true);
await t("eve liste les abonnés d'alice", getDocs(query(collection(eve, "follows"), where("followed", "==", "alice"))), false);

await t("s'abonner sans profil", setDoc(doc(eve, "follows/eve_alice"), { follower: "eve", followed: "alice", status: "accepted", createdAt: serverTimestamp() }), false);

// ---------- Publications ----------
const pid = (shift = 0) => "p" + String(1e13 - (Date.now() + shift)).padStart(13, "0") + Math.random().toString(36).slice(2, 8);
const P = Object.fromEntries(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map((k) => [k, pid()]));
const post = (extra = {}) => ({ owner: "bob", ownerName: "Bob", ownerHandle: "bob.voyage", title: "Brésil", visibility: "followers", publishedAt: serverTimestamp(), trip: { items: [] }, ...extra });
await t("abonnement daté à la main", setDoc(doc(alice, "follows/alice_carla"), { follower: "alice", followed: "carla", status: "accepted", createdAt: 9e12 }), false);
await t("publication antidatée (tête de Découvrir)", setDoc(doc(bob, "posts/p0000000000000aaaa"), post({ visibility: "public" })), false);
await t("publication avec fausse date", setDoc(doc(bob, `posts/${pid()}`), post({ publishedAt: 1 })), false);
await t("publication : nombre de jours en texte (injection)", setDoc(doc(bob, `posts/${pid()}`), post({ visibility: "public", trip: { items: [], days: "<iframe>" } })), false);
await t("bob publie (abonnés)", setDoc(doc(bob, `posts/${P.p1}`), post()), true);
await t("bob publie (public)", setDoc(doc(bob, `posts/${P.p2}`), post({ visibility: "public" })), true);
await t("bob publie (moi seul)", setDoc(doc(bob, `posts/${P.p3}`), post({ visibility: "private" })), true);
await t("eve publie au nom de bob", setDoc(doc(eve, `posts/${P.p4}`), post()), false);
await t("bob avec un faux nom", setDoc(doc(bob, `posts/${P.p5}`), post({ ownerName: "Alice" })), false);
await t("publication sans compte", setDoc(doc(anon, `posts/${P.p6}`), post()), false);

await t("sans compte : publication publique", getDoc(doc(anon, `posts/${P.p2}`)), true);
await t("sans compte : publication abonnés", getDoc(doc(anon, `posts/${P.p1}`)), false);
await t("carla en attente : publication abonnés", getDoc(doc(carla, `posts/${P.p1}`)), false);
await t("Découvrir sans compte", getDocs(query(collection(anon, "posts"), where("visibility", "==", "public"), limit(30))), true);
await t("profil de bob vu par carla (public seulement)", getDocs(query(collection(carla, "posts"), where("owner", "==", "bob"), where("visibility", "==", "public"))), true);
await t("carla en attente demande aussi « abonnés »", getDocs(query(collection(carla, "posts"), where("owner", "==", "bob"), where("visibility", "in", ["public", "followers"]))), false);

await t("acceptation avec une fausse date", updateDoc(doc(bob, "follows/carla_bob"), { status: "accepted", acceptedAt: 1 }), false);
await t("bob accepte carla (avec la date)", updateDoc(doc(bob, "follows/carla_bob"), { status: "accepted", acceptedAt: serverTimestamp() }), true);
await t("carla abonnée : publication abonnés", getDoc(doc(carla, `posts/${P.p1}`)), true);
await t("carla abonnée : profil de bob", getDocs(query(collection(carla, "posts"), where("owner", "==", "bob"), where("visibility", "in", ["public", "followers"]))), true);
await t("carla abonnée : publication « moi seul »", getDoc(doc(carla, `posts/${P.p3}`)), false);
await t("bob voit toutes ses publications", getDocs(query(collection(bob, "posts"), where("owner", "==", "bob"))), true);
await t("eve : publications de bob, toutes", getDocs(query(collection(eve, "posts"), where("owner", "==", "bob"))), false);

// ---------- Recommandations et commentaires ----------
await t("publication avec recommandations", setDoc(doc(bob, `posts/${P.p7}`), post({ visibility: "public", recos: [{ kind: "resto", name: "Chez Jo", where: "Lyon", note: "Super", url: "", stop: null }] })), true);
await t("trop de recommandations", setDoc(doc(bob, `posts/${P.p8}`), post({ recos: Array.from({ length: 51 }, () => ({ kind: "autre", name: "x" })) })), false);
const comment = (db, uid, name, handle, extra = {}) => ({ author: uid, authorName: name, authorHandle: handle, text: "Super itinéraire !", createdAt: serverTimestamp(), ...extra });
await t("carla commente une publication publique", setDoc(doc(carla, `posts/${P.p7}/comments/c1`), comment(carla, "carla", "Carla", "carla")), true);
await t("sans compte : lire les commentaires", getDocs(query(collection(anon, `posts/${P.p7}/comments`), orderBy("createdAt"))), true);
await t("sans compte : commenter", setDoc(doc(anon, `posts/${P.p7}/comments/c2`), { author: "x", authorName: "x", authorHandle: "x", text: "spam", createdAt: serverTimestamp() }), false);
await t("eve (sans profil) commente", setDoc(doc(eve, `posts/${P.p7}/comments/c3`), comment(eve, "eve", "Eve", "eve")), false);
await t("commenter au nom d'un autre", setDoc(doc(carla, `posts/${P.p7}/comments/c4`), comment(carla, "alice", "Alice", "alice")), false);
await t("commentaire vide", setDoc(doc(carla, `posts/${P.p7}/comments/c5`), comment(carla, "carla", "Carla", "carla", { text: "" })), false);
await t("commentaire trop long", setDoc(doc(carla, `posts/${P.p7}/comments/c6`), comment(carla, "carla", "Carla", "carla", { text: "x".repeat(1001) })), false);
await t("date de commentaire falsifiée", setDoc(doc(carla, `posts/${P.p7}/comments/c7`), comment(carla, "carla", "Carla", "carla", { createdAt: 1 })), false);
await t("modifier un commentaire", updateDoc(doc(carla, `posts/${P.p7}/comments/c1`), { text: "modifié" }), false);
await t("alice supprime le commentaire de carla", deleteDoc(doc(alice, `posts/${P.p7}/comments/c1`)), false);
await t("bob (auteur) supprime le commentaire de carla", deleteDoc(doc(bob, `posts/${P.p7}/comments/c1`)), true);
await t("alice commente « moi seul » de bob", setDoc(doc(alice, `posts/${P.p3}/comments/c8`), comment(alice, "alice", "Alice", "alice")), false);
await t("alice lit les commentaires « moi seul » de bob", getDocs(collection(alice, `posts/${P.p3}/comments`)), false);
await setDoc(doc(carla, `posts/${P.p7}/comments/c9`), comment(carla, "carla", "Carla", "carla"));
await t("carla supprime son commentaire", deleteDoc(doc(carla, `posts/${P.p7}/comments/c9`)), true);

await t("carla modifie la publication de bob", updateDoc(doc(carla, `posts/${P.p1}`), { title: "volé" }), false);
await t("bob modifie le contenu", updateDoc(doc(bob, `posts/${P.p1}`), { title: "Autre" }), false);
await t("bob change la visibilité", updateDoc(doc(bob, `posts/${P.p1}`), { visibility: "private" }), true);
await t("carla ne voit plus", getDoc(doc(carla, `posts/${P.p1}`)), false);
await t("carla supprime la publication de bob", deleteDoc(doc(carla, `posts/${P.p2}`)), false);
await t("bob retire carla", deleteDoc(doc(bob, "follows/carla_bob")), true);
await t("bob supprime sa publication", deleteDoc(doc(bob, `posts/${P.p2}`)), true);

console.log(`${ok} vérifications réussies, ${ko} échec(s).`);
await env.cleanup();
process.exit(ko ? 1 : 0);
