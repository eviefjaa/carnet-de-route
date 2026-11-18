// Vérifie la logique des rappels sans Firebase ni e-mail : node test.js

import assert from "node:assert/strict";
import { findDueReminders, buildEmail, emailLang, daysBetween } from "./reminders.js";

const trips = {
  "v-1": {
    name: "Brésil",
    items: [
      { id: "a", type: "stop", place: "Rio de Janeiro", arrive: "2026-12-19", todos: [{ id: "t1", text: "Christ Rédempteur", done: false }, { id: "t2", text: "Pain de Sucre", done: true },
        { id: "t5", text: "Balade à Copacabana", done: false, book: false }, { id: "t6", text: "Escadaria Selarón", done: false, book: true }] },
      { id: "b", type: "stop", place: "Curitiba", arrive: "2026-12-26", todos: [{ id: "t3", text: "Train panoramique", done: false }] },
      { id: "c", type: "stop", place: "Morretes", arrive: "2026-12-17", todos: [{ id: "t4", text: "Restaurant", done: true }] },
    ],
  },
};

assert.equal(daysBetween("2026-12-16", "2026-12-19"), 3);

// 3 jours avant Rio : un rappel avec ce qui reste à réserver (pas la balade, rien à réserver)
let due = findDueReminders(trips, "2026-12-16", 3);
assert.equal(due.length, 1);
assert.deepEqual(due[0].items, ["Christ Rédempteur", "Escadaria Selarón"]);
// Étape où rien n'est à réserver : pas de rappel
assert.equal(findDueReminders({ v: { items: [{ id: "s", type: "stop", arrive: "2026-12-19", todos: [{ id: "x", text: "Plage", book: false }] }] } }, "2026-12-16", 3).length, 0);

// 4 jours avant : trop tôt
assert.equal(findDueReminders(trips, "2026-12-15", 3).length, 0);

// Déjà envoyé : pas de doublon
assert.equal(findDueReminders(trips, "2026-12-17", 3, { [due[0].key]: "2026-12-16" }).length, 0);

// Étape passée : rien
assert.equal(findDueReminders(trips, "2026-12-20", 3).filter((r) => r.place === "Rio de Janeiro").length, 0);

// Voyages piégés (écrits par n'importe quel voyageur) : aucun plantage, rien d'envoyé
const traps = {
  a: { items: [{ type: "stop", id: "x", arrive: 1, todos: "x" }] },
  b: { items: "x" },
  c: { items: [null, 5, { type: "transport", dep: 7 }, { type: "stop", todos: [null, { text: 3 }] }] },
  d: null,
};
assert.doesNotThrow(() => findDueReminders(traps, "2026-12-16", 3));
assert.equal(findDueReminders(traps, "2026-12-16", 3).length, 0);

const mail = buildEmail(due, "https://exemple.github.io/carnet-de-route/");
assert.match(mail.subject, /2 choses à réserver pour Rio de Janeiro/);
assert.doesNotMatch(mail.text, /Copacabana/);
assert.match(mail.text, /dans 3 jours/);
assert.match(mail.text, /Rio de Janeiro \(Brésil\) : dans 3 jours, samedi 19 décembre/);
assert.match(mail.html, /Ouvrir le voyage/);

// Dans la langue du destinataire : anglais si choisi, français sinon (et par défaut)
assert.equal(emailLang({ lang: "en" }), "en");
assert.equal(emailLang({ lang: "fr" }), "fr");
assert.equal(emailLang({}), "fr");
assert.equal(emailLang({ lang: "<b>" }), "fr");
const en = buildEmail(due, "https://exemple.github.io/carnet-de-route/", "en");
assert.equal(en.subject, "Reminder: 2 things to book for Rio de Janeiro");
assert.match(en.text, /^Hello,/);
assert.match(en.text, /Rio de Janeiro \(Brésil\): in 3 days, Saturday 19 December/);
assert.match(en.text, /Settings → Email reminders/);
assert.match(en.html, /Open the trip/);
assert.doesNotMatch(en.text + en.html, /Bonjour|Rappel|réserver|cochez|Ouvrir/);
assert.equal(buildEmail([{ ...due[0], items: ["x"], inDays: 1, place: "" }], "https://s/", "en").subject, "Reminder: 1 thing to book for Unnamed stop");
assert.match(buildEmail([{ ...due[0], inDays: 0 }], "https://s/", "en").text, /: today,/);
// Nom piégé : échappé dans la version HTML, quelle que soit la langue
assert.doesNotMatch(buildEmail([{ ...due[0], place: "<img src=x>" }], "https://s/", "en").html, /<img/);
console.log("Tous les tests passent.\n");
console.log(mail.subject + "\n\n" + mail.text);
console.log("\n" + en.subject + "\n\n" + en.text);
