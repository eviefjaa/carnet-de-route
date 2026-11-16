// Inviter par nom ou pseudo : suggestions tirées de mon réseau, invitations par adresse et par compte
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { inviteSuggestions } = await import(root + "/js/views/share.js");
const { mergeInvitations } = await import(root + "/js/cloud.js");

const prof = (uid, name, handle) => ({ uid, name, handle });
const net = {
  following: [
    { status: "accepted", profile: prof("u1", "Élodie Martin", "elo.voyage") },
    { status: "pending", profile: prof("u2", "Éloïse En attente", "eloise") },
    { status: "accepted", profile: prof("u3", "Bob", "bobby") },
    { status: "accepted", profile: { uid: "u9", name: "Compte supprimé", handle: "" } },
  ],
  followers: [
    { status: "accepted", profile: prof("u1", "Élodie Martin", "elo.voyage") }, // dans les deux sens : une fois
    { status: "accepted", profile: prof("u4", "Léo", "leo_42") },
    { status: "accepted", profile: prof("me", "Moi", "moi.elo") },
    { status: "accepted", profile: prof("u5", "Elodie Déjà là", "elo2") },
  ],
};
const trip = { members: ["me", "u5"], inviteUids: ["u4"] };
const names = (l) => l.map((p) => p.uid).join(",");

assert.equal(names(inviteSuggestions(net, "elo", trip, "me")), "u1", "accents ignorés, sans doublon, ni moi ni voyageur, ni demande en attente");
assert.equal(names(inviteSuggestions(net, "ÉLO", trip, "me")), "u1", "majuscules et accents ignorés");
assert.equal(names(inviteSuggestions(net, "@elo.v", trip, "me")), "u1", "par pseudo, avec « @ » au début");
assert.equal(names(inviteSuggestions(net, "martin", trip, "me")), "u1", "par nom");
assert.deepEqual(inviteSuggestions(net, "leo", trip, "me"), [{ uid: "u4", name: "Léo", handle: "leo_42", invited: true }], "déjà invité(e) : marqué(e)");
assert.equal(inviteSuggestions(net, "e", trip, "me").length, 0, "2 caractères au moins");
assert.equal(inviteSuggestions(net, "elo@gmail", trip, "me").length, 0, "adresse e-mail en cours : pas de suggestions");
assert.equal(inviteSuggestions(net, "supprim", trip, "me").length, 0, "compte supprimé (sans pseudo) écarté");
assert.equal(inviteSuggestions(null, "elo", trip, "me").length, 0, "réseau pas chargé");
{ const many = { following: Array.from({ length: 12 }, (_, i) => ({ status: "accepted", profile: prof("x" + i, "Anna " + i, "anna" + i) })), followers: [] };
  assert.equal(inviteSuggestions(many, "anna", {}, "me").length, 8, "8 suggestions au plus"); }

// Un voyage où je suis invité(e) des deux façons n'apparaît qu'une fois
const m = mergeInvitations([{ id: "a", name: "Brésil", from: "x@x.fr" }, { id: "b", name: "Japon", from: "" }], [{ id: "b", name: "Japon", from: "" }, { id: "c", name: "Rome", from: "y@y.fr" }]);
assert.deepEqual(m, [
  { id: "a", name: "Brésil", from: "x@x.fr", byEmail: true, byUid: false },
  { id: "b", name: "Japon", from: "", byEmail: true, byUid: true },
  { id: "c", name: "Rome", from: "y@y.fr", byEmail: false, byUid: true },
]);
assert.deepEqual(mergeInvitations([], []), []);
console.log("Invitations par nom ou pseudo : tout passe.");
