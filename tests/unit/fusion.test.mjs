// Fusion d'un voyage modifié en même temps par deux voyageurs (js/merge.js)
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
const { mergeTrip } = await import(root + "/js/merge.js");

const stop = (id, place, extra = {}) => ({ id, type: "stop", place, ...extra });
const base = { name: "Japon", currency: "JPY", items: [stop("a", "Kyoto"), stop("b", "Osaka")] };
const ids = (t) => t.items.map((i) => i.id + ":" + i.place).join(" ");

// Deux ajouts au même moment : les deux restent, chacun à sa place
let mine = { ...base, items: [...base.items, stop("c", "Nara")] };
let theirs = { ...base, items: [stop("a", "Kyoto"), stop("d", "Kobe"), stop("b", "Osaka")] };
assert.equal(ids(mergeTrip(base, mine, theirs)), "a:Kyoto d:Kobe b:Osaka c:Nara");

// Je modifie une étape, l'autre en supprime une autre
mine = { ...base, items: [stop("a", "Kyoto (centre)"), stop("b", "Osaka")] };
theirs = { ...base, items: [stop("a", "Kyoto")] };
assert.equal(ids(mergeTrip(base, mine, theirs)), "a:Kyoto (centre)");

// Je supprime une étape que l'autre vient de modifier : elle est gardée (sa modification n'est pas perdue)
mine = { ...base, items: [stop("a", "Kyoto")] };
theirs = { ...base, items: [stop("a", "Kyoto"), stop("b", "Osaka", { notes: "Réserver le château" })] };
assert.equal(ids(mergeTrip(base, mine, theirs)), "a:Kyoto b:Osaka");

// Je supprime une étape que personne n'a touchée : supprimée
theirs = base;
assert.equal(ids(mergeTrip(base, mine, theirs)), "a:Kyoto");

// Même étape modifiée des deux côtés : ma version l'emporte
mine = { ...base, items: [stop("a", "Kyoto (moi)"), stop("b", "Osaka")] };
theirs = { ...base, items: [stop("a", "Kyoto (autre)"), stop("b", "Osaka")] };
assert.equal(ids(mergeTrip(base, mine, theirs)), "a:Kyoto (moi) b:Osaka");

// Nom du voyage : changé chez l'autre seulement → le sien ; changé chez moi → le mien
assert.equal(mergeTrip(base, base, { ...base, name: "Japon 2027" }).name, "Japon 2027");
assert.equal(mergeTrip(base, { ...base, name: "Mon Japon" }, { ...base, name: "Japon 2027" }).name, "Mon Japon");

// Champs exclus (voyageurs) : toujours ceux du serveur
const shared = mergeTrip({ ...base, members: ["x"] }, { ...base, members: ["x"] }, { ...base, members: ["x", "y"] }, ["members"]);
assert.deepEqual(shared.members, ["x", "y"]);

console.log("Fusion des modifications simultanées : tous les tests passent.");
