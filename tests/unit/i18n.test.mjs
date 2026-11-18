// Traduction : mêmes clés et mêmes paramètres en français et en anglais, pluriels, repli, formats
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { default: fr } = await import(root + "/js/i18n/fr.js");
const { default: en } = await import(root + "/js/i18n/en.js");
const { t, count, setLang, getLang, locale, browserLang } = await import(root + "/js/i18n.js");
const { MODES, CURRENCIES, fmtHour, fmtDay, duration, parsePrice } = await import(root + "/js/utils.js");
const { TAGS, CONTINENTS } = await import(root + "/js/data/countries.js");
const { RECO_KINDS, VISIBILITIES } = await import(root + "/js/social.js");
const { editText } = await import(root + "/js/changes.js");
const { shadows } = await import(root + "/scripts/i18n/check-shadow.mjs");

// Mêmes clés, même forme (texte ou pluriel), mêmes paramètres {x}
const params = (v) => [...new Set(JSON.stringify(v).match(/\{\w+\}/g) || [])].sort();
assert.deepEqual(Object.keys(en).sort(), Object.keys(fr).sort(), "mêmes clés en français et en anglais");
for (const k of Object.keys(fr)) {
  assert.equal(typeof en[k], typeof fr[k], `même forme pour ${k}`);
  if (typeof fr[k] === "object") {
    assert.ok(fr[k].one && fr[k].other && en[k].one && en[k].other, `pluriel complet pour ${k}`);
    // Le singulier peut écrire le nombre en toutes lettres : on compare les paramètres du pluriel
    assert.deepEqual(params(en[k].other), params(fr[k].other), `mêmes paramètres pour ${k}`);
  } else {
    assert.deepEqual(params(en[k]), params(fr[k]), `mêmes paramètres pour ${k}`);
    assert.ok(fr[k].trim() && en[k].trim(), `texte non vide pour ${k}`);
  }
}
// Règles d'écriture : pas de tiret cadratin dans les textes
for (const [k, v] of [...Object.entries(fr), ...Object.entries(en)]) assert.ok(!JSON.stringify(v).includes("—"), `pas de tiret cadratin : ${k}`);

// Toutes les clés écrites en dur dans le code existent
const files = (d) => readdirSync(root + d).filter((f) => f.endsWith(".js")).map((f) => d + f);
const used = new Set();
for (const f of [...files("js/"), ...files("js/views/")]) {
  for (const m of readFileSync(root + f, "utf8").matchAll(/\b(?:t|count|inAllLangs)\(\s*(?:[\w.]+\s*,\s*)?"([\w.-]+)"/g)) used.add(m[1]);
}
const missing = [...used].filter((k) => !(k in fr));
assert.deepEqual(missing, [], "clés utilisées absentes du dictionnaire");

// Pluriels : en français 0 et 1 au singulier, en anglais seul 1
setLang("fr");
assert.equal(count(0, "count.day"), "0 jour");
assert.equal(count(1, "count.day"), "1 jour");
assert.equal(count(2, "count.day"), "2 jours");
setLang("en");
assert.equal(count(0, "count.day"), "0 days");
assert.equal(count(1, "count.day"), "1 day");
assert.equal(count(2, "count.day"), "2 days");

// Paramètres, langue et formats
assert.equal(getLang(), "en");
assert.equal(locale(), "en-GB");
assert.equal(t("app.tagline"), "Catch the right wind");
assert.equal(fmtHour("14:30"), "14:30");
assert.equal(duration("2030-06-01T09:00", "2030-06-01T12:05"), "3h 05");
assert.match(fmtDay("2030-06-03"), /^Mon,? 3 Jun$/, "jour avant le mois");
assert.equal(MODES.train, "Train");
assert.equal(editText(["a", "b"], 2), "a, b and 2 other changes");
assert.equal(parsePrice("1,200.50"), 1200.5);
setLang("fr");
assert.equal(t("app.tagline"), "Prenez le bon vent");
assert.equal(fmtHour("14:30"), "14 h 30");
assert.equal(duration("2030-06-01T09:00", "2030-06-01T12:05"), "3 h 05");
assert.equal(editText(["a", "b"], 1), "a, b et 1 autre changement");
assert.equal(parsePrice("1.200,50"), 1200.5);
assert.equal(MODES.train, "Train");
assert.equal(MODES.voiture, "Voiture");

// Listes : chaque clé interne a un libellé dans les deux langues
for (const lang of ["fr", "en"]) {
  setLang(lang);
  for (const list of [MODES, CURRENCIES, TAGS, RECO_KINDS, VISIBILITIES]) {
    for (const [k, v] of Object.entries(list)) assert.ok(typeof v === "string" && v, `libellé ${lang} pour ${k}`);
  }
  for (const c of CONTINENTS) assert.ok(t(`continent.${c}`), `continent ${lang} : ${c}`);
}

// Clé inconnue : jamais la clé brute ; clé absente en anglais : texte français
setLang("en");
const warn = console.warn;
console.warn = () => {};
assert.equal(t("nope.nothing"), "");
fr["test.onlyFr"] = "Seulement en français";
assert.equal(t("test.onlyFr"), "Seulement en français");
delete fr["test.onlyFr"];
console.warn = warn;
setLang("fr");

// Hors navigateur, la langue par défaut est le français
assert.equal(browserLang(), "fr");

// Aucune variable t qui masquerait la fonction de traduction
assert.deepEqual(shadows(), []);

console.log("Traduction : tout passe.");
