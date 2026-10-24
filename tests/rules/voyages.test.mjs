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

// ---------- Données personnelles ----------
await t("ses préférences", setDoc(T(alice, "users/alice/meta/prefs"), { theme: "dark" }), true);
await t("préférences d'un autre (écrire)", setDoc(T(eve, "users/alice/meta/prefs"), { theme: "dark" }), false);
await t("préférences d'un autre (lire)", getDoc(T(eve, "users/alice/meta/prefs")), false);

console.log(`${ok} vérifications réussies, ${ko} échec(s).`);
await env.cleanup();
process.exit(ko ? 1 : 0);
