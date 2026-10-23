// Vérifie la logique des rappels sans Firebase ni e-mail : node test.js

import assert from "node:assert/strict";
import { findDueReminders, buildEmail, daysBetween } from "./reminders.js";

const trips = {
  "v-1": {
    name: "Brésil",
    items: [
      { id: "a", type: "stop", place: "Rio de Janeiro", arrive: "2026-12-19", todos: [{ id: "t1", text: "Christ Rédempteur", done: false }, { id: "t2", text: "Pain de Sucre", done: true }] },
      { id: "b", type: "stop", place: "Curitiba", arrive: "2026-12-26", todos: [{ id: "t3", text: "Train panoramique", done: false }] },
      { id: "c", type: "stop", place: "Morretes", arrive: "2026-12-17", todos: [{ id: "t4", text: "Restaurant", done: true }] },
    ],
  },
};

assert.equal(daysBetween("2026-12-16", "2026-12-19"), 3);

// 3 jours avant Rio : un rappel avec 1 élément non coché
let due = findDueReminders(trips, "2026-12-16", 3);
assert.equal(due.length, 1);
assert.deepEqual(due[0].items, ["Christ Rédempteur"]);

// 4 jours avant : trop tôt
assert.equal(findDueReminders(trips, "2026-12-15", 3).length, 0);

// Déjà envoyé : pas de doublon
assert.equal(findDueReminders(trips, "2026-12-17", 3, { [due[0].key]: "2026-12-16" }).length, 0);

// Étape passée : rien
assert.equal(findDueReminders(trips, "2026-12-20", 3).filter((r) => r.place === "Rio de Janeiro").length, 0);

const mail = buildEmail(due, "https://exemple.github.io/carnet-de-route/");
assert.match(mail.subject, /1 chose à réserver pour Rio de Janeiro/);
assert.match(mail.text, /dans 3 jours/);
console.log("Tous les tests passent.\n");
console.log(mail.subject + "\n\n" + mail.text);
