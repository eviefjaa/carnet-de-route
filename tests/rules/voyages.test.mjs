import fs from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, query, collection, where, arrayUnion, arrayRemove, deleteField, serverTimestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-carnet",
  firestore: { rules: fs.readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8181 },
});
const as = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const alice = as("alice", "alice@x.fr"), bob = as("bob", "bob@x.fr"), eve = as("eve", "eve@x.fr");
const bobUnverified = as("bob", "bob@x.fr", false);
const anon = env.unauthenticatedContext().firestore();
const trip = (extra = {}) => ({ name: "Brésil", currency: "BRL", items: [], owner: "alice", members: ["alice"], invites: [], emails: { alice: "alice@x.fr" }, ...extra });

let ok = 0, ko = 0;
async function t(label, p, expect) {
  try { await (expect ? assertSucceeds(p) : assertFails(p)); ok++; }
  catch (e) { ko++; console.log("ÉCHEC :", label, "→", e.message.split("\n")[0]); }
}
const T = doc;

// ---------- Création ----------
await t("créer son voyage", setDoc(T(alice, "trips/v1"), trip()), true);
await t("créer avec un autre membre", setDoc(T(alice, "trips/v2"), trip({ members: ["alice", "eve"] })), false);
await t("créer avec un faux e-mail d'un autre", setDoc(T(alice, "trips/v3"), trip({ emails: { alice: "a", eve: "e" } })), false);
await t("créer avec items qui n'est pas une liste", setDoc(T(alice, "trips/v4"), trip({ items: "x" })), false);
await t("créer au nom d'un autre", setDoc(T(eve, "trips/v5"), trip()), false);
await t("créer sans compte", setDoc(T(anon, "trips/v6"), trip()), false);
await t("créer avec une fausse adresse", setDoc(T(alice, "trips/v8"), trip({ emails: { alice: "pas-moi@x.fr" } })), false);
await t("créer avec des dates d'arrivée", setDoc(T(alice, "trips/v10"), trip({ joined: { alice: 1 } })), false);
await t("nom trop long", setDoc(T(alice, "trips/v7"), trip({ name: "x".repeat(201) })), false);

// ---------- Lecture ----------
await t("le créateur lit", getDoc(T(alice, "trips/v1")), true);
await t("un inconnu ne lit pas", getDoc(T(eve, "trips/v1")), false);
await t("sans compte ne lit pas", getDoc(T(anon, "trips/v1")), false);
await t("requête « mes voyages »", getDocs(query(collection(alice, "trips"), where("members", "array-contains", "alice"))), true);
await t("requête sur les voyages d'un autre", getDocs(query(collection(eve, "trips"), where("members", "array-contains", "alice"))), false);

// ---------- Invitation ----------
await t("le créateur invite", updateDoc(T(alice, "trips/v1"), { invites: arrayUnion("bob@x.fr") }), true);
await t("le créateur ajoute un membre sans invitation", updateDoc(T(alice, "trips/v1"), { members: arrayUnion("eve") }), false);
await t("invité non confirmé ne lit pas", getDoc(T(bobUnverified, "trips/v1")), false);
await t("invité confirmé lit", getDoc(T(bob, "trips/v1")), true);
await t("requête des invitations", getDocs(query(collection(bob, "trips"), where("invites", "array-contains", "bob@x.fr"))), true);
await t("requête des invitations d'un autre", getDocs(query(collection(eve, "trips"), where("invites", "array-contains", "bob@x.fr"))), false);
await t("invité non confirmé ne rejoint pas", updateDoc(T(bobUnverified, "trips/v1"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "bob@x.fr" }), false);
await t("invité rejoint en changeant aussi le nom", updateDoc(T(bob, "trips/v1"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "bob@x.fr", name: "volé" }), false);
await t("inconnu se joint sans invitation", updateDoc(T(eve, "trips/v1"), { members: arrayUnion("eve"), "emails.eve": "eve@x.fr" }), false);
await t("invité rejoint avec une fausse date", updateDoc(T(bob, "trips/v1"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "bob@x.fr", "joined.bob": 1 }), false);
await t("invité rejoint en datant l'arrivée d'un autre", updateDoc(T(bob, "trips/v1"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "bob@x.fr", "joined.alice": serverTimestamp() }), false);
await t("invité rejoint avec une fausse adresse", updateDoc(T(bob, "trips/v1"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "admin@x.fr", "joined.bob": serverTimestamp() }), false);
await t("invité confirmé rejoint (avec la date)", updateDoc(T(bob, "trips/v1"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "bob@x.fr", "joined.bob": serverTimestamp() }), true);
await t("voyageur modifie une date d'arrivée", updateDoc(T(bob, "trips/v1"), { "joined.bob": 5 }), false);

// ---------- Voyageur ----------
await t("voyageur modifie le contenu", setDoc(T(bob, "trips/v1"), { name: "Brésil 2027", items: [{ id: "s1", type: "stop" }] }, { merge: true }), true);
await t("voyageur invite quelqu'un", updateDoc(T(bob, "trips/v1"), { invites: arrayUnion("carla@x.fr") }), true);
await t("voyageur retire une invitation", updateDoc(T(bob, "trips/v1"), { invites: arrayRemove("carla@x.fr") }), false);
await t("voyageur ajoute un membre", updateDoc(T(bob, "trips/v1"), { members: arrayUnion("eve") }), false);
await t("voyageur se fait créateur", updateDoc(T(bob, "trips/v1"), { owner: "bob" }), false);
await t("voyageur casse items", updateDoc(T(bob, "trips/v1"), { items: "cassé" }), false);
await t("voyageur supprime le voyage", deleteDoc(T(bob, "trips/v1")), false);

// ---------- Billets ----------
const file = (extra = {}) => ({ name: "billet.pdf", type: "application/pdf", size: 10, itemId: "s1", todoId: null, data: "QUJD", addedBy: "bob", addedAt: 1, ...extra });
await t("voyageur ajoute un billet PDF", setDoc(T(bob, "trips/v1/files/f1"), file()), true);
await t("billet HTML refusé", setDoc(T(bob, "trips/v1/files/f2"), file({ type: "text/html" })), false);
await t("billet SVG refusé", setDoc(T(bob, "trips/v1/files/f3"), file({ type: "image/svg+xml" })), false);
await t("billet au nom d'un autre", setDoc(T(bob, "trips/v1/files/f4"), file({ addedBy: "alice" })), false);
await t("billet trop gros", setDoc(T(bob, "trips/v1/files/f5"), file({ data: "A".repeat(1000001) })), false);
await t("inconnu ajoute un billet", setDoc(T(eve, "trips/v1/files/f6"), file({ addedBy: "eve" })), false);
await t("le créateur lit le billet", getDoc(T(alice, "trips/v1/files/f1")), true);
await t("inconnu lit le billet", getDoc(T(eve, "trips/v1/files/f1")), false);
await t("billet modifié après coup", updateDoc(T(bob, "trips/v1/files/f1"), { type: "text/html" }), false);

// ---------- Créateur ----------
await t("le créateur modifie le contenu", setDoc(T(alice, "trips/v1"), { name: "Brésil !", items: [] }, { merge: true }), true);
await setDoc(T(alice, "trips/v9"), trip());
await updateDoc(T(alice, "trips/v9"), { invites: arrayUnion("bob@x.fr") });
await updateDoc(T(bob, "trips/v9"), { members: arrayUnion("bob"), invites: arrayRemove("bob@x.fr"), "emails.bob": "bob@x.fr" });
await t("le créateur change l'adresse d'un voyageur", updateDoc(T(alice, "trips/v9"), { "emails.bob": "faux@x.fr" }), false);
await t("le créateur invente une date d'arrivée", updateDoc(T(alice, "trips/v9"), { "joined.bob": 5 }), false);
await t("le créateur retire un voyageur", updateDoc(T(alice, "trips/v9"), { members: arrayRemove("bob"), "emails.bob": deleteField() }), true);
await t("le voyageur retiré ne lit plus", getDoc(T(bob, "trips/v9")), false);
await t("le créateur ne peut pas se retirer", updateDoc(T(alice, "trips/v9"), { members: arrayRemove("alice") }), false);

// ---------- Refuser une invitation ----------
await setDoc(T(alice, "trips/v12"), trip());
await updateDoc(T(alice, "trips/v12"), { invites: arrayUnion("bob@x.fr", "carla@x.fr") });
await t("un inconnu refuse à la place de bob", updateDoc(T(eve, "trips/v12"), { invites: arrayRemove("bob@x.fr") }), false);
await t("bob retire aussi l'invitation de carla", updateDoc(T(bob, "trips/v12"), { invites: arrayRemove("bob@x.fr", "carla@x.fr") }), false);
await t("bob (non confirmé) refuse", updateDoc(T(bobUnverified, "trips/v12"), { invites: arrayRemove("bob@x.fr") }), false);
await t("bob refuse l'invitation", updateDoc(T(bob, "trips/v12"), { invites: arrayRemove("bob@x.fr") }), true);
await t("bob ne voit plus le voyage refusé", getDoc(T(bob, "trips/v12")), false);

// ---------- Retirer, quitter, supprimer ----------
await t("voyageur quitte", updateDoc(T(bob, "trips/v1"), { members: arrayRemove("bob"), "emails.bob": deleteField() }), true);
await t("ancien voyageur ne lit plus", getDoc(T(bob, "trips/v1")), false);
await t("ancien voyageur ne lit plus le billet", getDoc(T(bob, "trips/v1/files/f1")), false);
await t("le créateur annule une invitation", updateDoc(T(alice, "trips/v1"), { invites: arrayRemove("carla@x.fr") }), true);
await t("le créateur supprime un billet", deleteDoc(T(alice, "trips/v1/files/f1")), true);
await t("le créateur supprime le voyage", deleteDoc(T(alice, "trips/v1")), true);

// ---------- Suppression du compte : le créateur confie un voyage partagé ----------
const shared = (id) => env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "trips/" + id),
  trip({ members: ["alice", "bob", "carla"], emails: { alice: "alice@x.fr", bob: "bob@x.fr", carla: "carla@x.fr" }, joined: { bob: 1, carla: 2 } })));
const carla = as("carla", "carla@x.fr");
const handOver = (to, extra = {}) => ({ owner: to, members: arrayRemove("alice"), "emails.alice": deleteField(), ...extra });
await shared("v20");
await t("confié à quelqu'un hors du voyage", updateDoc(T(alice, "trips/v20"), handOver("eve")), false);
await t("confié sans s'en retirer", updateDoc(T(alice, "trips/v20"), { owner: "bob" }), false);
await t("confié en retirant aussi un voyageur", updateDoc(T(alice, "trips/v20"), handOver("bob", { members: arrayRemove("alice", "carla") })), false);
await t("confié en changeant aussi le nom", updateDoc(T(alice, "trips/v20"), handOver("bob", { name: "x" })), false);
await t("confié en effaçant une date d'arrivée d'un autre", updateDoc(T(alice, "trips/v20"), handOver("bob", { "joined.carla": deleteField() })), false);
await t("un voyageur se donne le voyage", updateDoc(T(bob, "trips/v20"), { owner: "bob" }), false);
await t("le créateur confie le voyage à bob et s'en retire", updateDoc(T(alice, "trips/v20"), handOver("bob")), true);
await t("alice ne voit plus le voyage", getDoc(T(alice, "trips/v20")), false);
await t("bob, nouveau créateur, peut le supprimer", deleteDoc(T(bob, "trips/v20")), true);
await shared("v21");
await t("carla quitte en effaçant la date de bob", updateDoc(T(carla, "trips/v21"), { members: arrayRemove("carla"), "emails.carla": deleteField(), "joined.bob": deleteField() }), false);
await t("carla quitte avec sa date d'arrivée", updateDoc(T(carla, "trips/v21"), { members: arrayRemove("carla"), "emails.carla": deleteField(), "joined.carla": deleteField() }), true);

// ---------- Voyage tiré d'un itinéraire publié ----------
await t("voyage avec son origine (publication et pseudo)", setDoc(T(alice, "trips/v30"), trip({ source: { postId: "post123", ownerHandle: "dan.voyage" } })), true);
await t("l'origine se modifie comme le reste", updateDoc(T(alice, "trips/v30"), { "source.ownerHandle": "dan.v" }), true);

// ---------- Invitation par compte (nom ou pseudo), dans son réseau ----------
// Abonnements : alice suit bob ; dan suit alice ; fanny attend qu'alice accepte sa demande
const seed = (path, data) => env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), path), data));
await seed("follows/alice_bob", { follower: "alice", followed: "bob", status: "accepted", createdAt: 1 });
await seed("follows/dan_alice", { follower: "dan", followed: "alice", status: "accepted", createdAt: 1 });
await seed("follows/fanny_alice", { follower: "fanny", followed: "alice", status: "pending", createdAt: 1 });
await seed("follows/carla_bob", { follower: "carla", followed: "bob", status: "accepted", createdAt: 1 });
const dan = as("dan", "dan@x.fr", false), fanny = as("fanny", "fanny@x.fr");
await seed("trips/v40", trip({ members: ["alice", "carla"], emails: { alice: "alice@x.fr", carla: "carla@x.fr" }, inviteUids: [] }));
await t("créer avec des invitations par compte", setDoc(T(alice, "trips/v41"), trip({ inviteUids: ["bob"] })), false);
await t("créer avec une liste vide d'invitations par compte", setDoc(T(alice, "trips/v42"), trip({ inviteUids: [] })), true);
await t("inviter une personne que je suis", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("bob") }), true);
await t("la même personne une 2e fois (rien ne change)", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("bob") }), true);
await t("inviter une personne qui me suit", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("dan") }), true);
await t("inviter sans abonnement", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("eve") }), false);
await t("inviter avec une demande en attente", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("fanny") }), false);
await seed("trips/v47", trip({ inviteUids: [] }));
await t("inviter deux personnes de son réseau d'un coup", updateDoc(T(alice, "trips/v47"), { inviteUids: ["bob", "dan"] }), false);
await seed("follows/gus_carla", { follower: "gus", followed: "carla", status: "accepted", createdAt: 1 });
await t("un voyageur invite une personne du réseau d'un autre", updateDoc(T(carla, "trips/v40"), { inviteUids: arrayUnion("fanny") }), false);
await t("un voyageur (pas le créateur) invite une personne de son réseau", updateDoc(T(carla, "trips/v40"), { inviteUids: arrayUnion("gus") }), true);
await seed("follows/alice_carla", { follower: "alice", followed: "carla", status: "accepted", createdAt: 1 });
await t("inviter une personne déjà dans le voyage (abonnée)", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("carla") }), false);
await t("un inconnu n'invite pas (même de son réseau)", updateDoc(T(fanny, "trips/v40"), { inviteUids: arrayUnion("alice") }), false);
await t("une personne invitée par compte lit le voyage", getDoc(T(bob, "trips/v40")), true);
await t("requête « mes invitations par compte »", getDocs(query(collection(dan, "trips"), where("inviteUids", "array-contains", "dan"))), true);
await t("une personne non invitée ne lit pas", getDoc(T(eve, "trips/v40")), false);
await t("une personne non invitée ne rejoint pas", updateDoc(T(eve, "trips/v40"), { members: arrayUnion("eve"), "emails.eve": "eve@x.fr" }), false);
await t("un voyageur (pas le créateur) n'annule pas une invitation", updateDoc(T(carla, "trips/v40"), { inviteUids: arrayRemove("dan") }), false);
await t("une personne invitée n'annule pas celle d'une autre", updateDoc(T(bob, "trips/v40"), { inviteUids: arrayRemove("dan") }), false);
await t("une personne invitée ne modifie pas le voyage", updateDoc(T(bob, "trips/v40"), { name: "x" }), false);
await t("rejoindre en se mettant créateur", updateDoc(T(bob, "trips/v40"), { members: arrayUnion("bob"), inviteUids: arrayRemove("bob"), "emails.bob": "bob@x.fr", owner: "bob" }), false);
await t("rejoindre en restant invité(e)", updateDoc(T(bob, "trips/v40"), { members: arrayUnion("bob"), "emails.bob": "bob@x.fr" }), false);
await t("rejoindre avec une fausse adresse", updateDoc(T(bob, "trips/v40"), { members: arrayUnion("bob"), inviteUids: arrayRemove("bob"), "emails.bob": "x@x.fr" }), false);
await t("rejoindre par compte, adresse non confirmée", updateDoc(T(dan, "trips/v40"),
  { members: arrayUnion("dan"), inviteUids: arrayRemove("dan"), "emails.dan": "dan@x.fr", "joined.dan": serverTimestamp() }), true);
await t("la personne qui a rejoint lit le voyage", getDoc(T(dan, "trips/v40")), true);
await t("refuser une invitation par compte", updateDoc(T(bob, "trips/v40"), { inviteUids: arrayRemove("bob") }), true);
await t("après le refus, plus de lecture", getDoc(T(bob, "trips/v40")), false);
await t("inviter de nouveau bob", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayUnion("bob") }), true);
await t("le créateur annule l'invitation", updateDoc(T(alice, "trips/v40"), { inviteUids: arrayRemove("bob") }), true);
// Invité(e) des deux façons : refuser retire l'adresse et le compte d'un coup
await seed("trips/v43", trip({ invites: ["bob@x.fr"], inviteUids: ["bob"] }));
await t("refus par compte qui laisse l'adresse (non confirmée)", updateDoc(T(bobUnverified, "trips/v43"), { inviteUids: arrayRemove("bob"), invites: arrayRemove("bob@x.fr") }), false);
await t("refuser les deux invitations", updateDoc(T(bob, "trips/v43"), { inviteUids: arrayRemove("bob"), invites: arrayRemove("bob@x.fr") }), true);
// L'abonnement n'est vérifié qu'à l'invitation : supprimé ensuite, l'invitation reste valable
await seed("trips/v44", trip({ inviteUids: [] }));
await t("inviter bob", updateDoc(T(alice, "trips/v44"), { inviteUids: arrayUnion("bob") }), true);
await env.withSecurityRulesDisabled((c) => deleteDoc(doc(c.firestore(), "follows/alice_bob")));
await t("abonnement supprimé : le créateur modifie encore le voyage", updateDoc(T(alice, "trips/v44"), { name: "Brésil 2" }), true);
await t("abonnement supprimé : bob rejoint quand même", updateDoc(T(bob, "trips/v44"),
  { members: arrayUnion("bob"), inviteUids: arrayRemove("bob"), "emails.bob": "bob@x.fr" }), true);
// 30 invitations au plus, adresses et comptes ensemble
await seed("follows/alice_zoe", { follower: "alice", followed: "zoe", status: "accepted", createdAt: 1 });
await seed("trips/v45", trip({ invites: Array.from({ length: 30 }, (_, i) => `p${i}@x.fr`), inviteUids: [] }));
await t("31e invitation refusée", updateDoc(T(alice, "trips/v45"), { inviteUids: arrayUnion("zoe") }), false);
// Ancien voyage sans le champ : on peut inviter, refuser l'invitation par adresse comme avant
await seed("trips/v46", trip({ invites: ["eve@x.fr"] }));
await t("ancien voyage : refuser par adresse", updateDoc(T(eve, "trips/v46"), { invites: arrayRemove("eve@x.fr") }), true);
await seed("follows/alice_eve", { follower: "alice", followed: "eve", status: "accepted", createdAt: 1 });
await t("ancien voyage : inviter par compte", updateDoc(T(alice, "trips/v46"), { inviteUids: arrayUnion("eve") }), true);

// ---------- Données personnelles ----------
await t("ses préférences", setDoc(T(alice, "users/alice/meta/prefs"), { theme: "dark" }), true);
await t("préférences d'un autre (écrire)", setDoc(T(eve, "users/alice/meta/prefs"), { theme: "dark" }), false);
await t("préférences d'un autre (lire)", getDoc(T(eve, "users/alice/meta/prefs")), false);

console.log(`${ok} vérifications réussies, ${ko} échec(s).`);
await env.cleanup();
process.exit(ko ? 1 : 0);
