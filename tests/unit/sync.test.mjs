import assert from "node:assert/strict";
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: (k) => delete mem[k] };
globalThis.document = { getElementById: () => null };
globalThis.setTimeout = (fn) => 0; // les sauvegardes différées sont lancées à la main avec flush()
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
const store = await import(root + "/js/store.js");

let fail = null;
const writes = [];
const fakeCloud = {
  newTripSharing: () => ({ owner: "me", members: ["me"], invites: [], emails: { me: "x" } }),
  saveTrip: async (id, t, isNew) => { if (fail) throw fail; writes.push({ id, isNew }); },
  deleteTrip: async (id) => { if (fail) throw fail; writes.push({ id, del: true }); },
};

store.replaceTrips({});
store.setCloud(fakeCloud);
assert.equal(store.sync.status, "saved");

// Nouveau voyage, le compte refuse : erreur visible, rien n'est marqué enregistré
const id = store.createTrip({ name: "Lyon" });
assert.equal(store.sync.status, "pending");
fail = Object.assign(new Error("x"), { code: "permission-denied" });
await store.flush();
assert.equal(store.sync.status, "error");
assert.match(store.sync.error, /règles Firestore/);
assert.equal(store.hasUnsaved(), true);

// Nouvel essai qui réussit : envoyé comme nouveau voyage, tout est enregistré
fail = null;
await store.flush();
assert.equal(store.sync.status, "saved");
assert.equal(store.hasUnsaved(), false);
assert.deepEqual(writes.at(-1), { id, isNew: true });

// Ajout d'une activité : envoyée comme modification
store.state.trips[id].items.push({ id: "s1", type: "stop", place: "Lyon", arrive: "2026-10-25", todos: [{ id: "t", text: "Test rappel", done: false }] });
store.save();
await store.flush();
assert.deepEqual(writes.at(-1), { id, isNew: false });
assert.equal(store.sync.status, "saved");

// Suppression qui échoue puis réussit
store.deleteTrip(id);
fail = new Error("réseau");
await store.flush();
assert.equal(store.sync.status, "error");
fail = null;
await store.flush();
assert.deepEqual(writes.at(-1), { id, del: true });
assert.equal(store.sync.status, "saved");
console.log("Synchronisation : tous les tests passent.");
