// Heure tapée dans le calendrier du site (js/datepicker.js) : formes courantes acceptées, impossibles refusées
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { parseTime } = await import(root + "/js/datepicker.js");
const ok = { "5": "05:00", "5h": "05:00", "5h55": "05:55", "05 h 55": "05:55", "05:55": "05:55", "17.30": "17:30", "555": "05:55",
  "1730": "17:30", "0005": "00:05", "23:59": "23:59", "5:55 pm": "17:55", "12am": "00:00", "12 pm": "12:00", "9H05": "09:05" };
for (const [s, v] of Object.entries(ok)) assert.equal(parseTime(s), v, s);
for (const s of ["", "24", "25h", "5h60", "abc", "5h5", "12345", "13pm", "0am", "-1"]) assert.equal(parseTime(s), null, s);
console.log("Heure tapée : tout passe.");
