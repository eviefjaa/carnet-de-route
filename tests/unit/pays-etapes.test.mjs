// Pays des étapes : affiché dans la langue choisie à partir du code, y compris pour les étapes
// enregistrées avant les codes (nom en français) ; en français, le nom enregistré ne change pas
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };

const { stopCountry, stopCountryCode, codeOfName, countryName } = await import(root + "/js/i18n-data.js");
const { setLang } = await import(root + "/js/i18n.js");
const { publicCopy } = await import(root + "/js/publish.js");
const { tripFromPost } = await import(root + "/js/fork.js");

assert.equal(codeOfName("Italie"), "IT");
assert.equal(codeOfName("Royaume-Uni"), "GB");
assert.equal(codeOfName("United Kingdom"), "GB");
assert.equal(codeOfName("cote d'ivoire"), "CI", "sans accents ni majuscules");
assert.equal(codeOfName("Atlantide"), "");
assert.equal(codeOfName(""), "");
assert.equal(stopCountryCode({ country: "Brésil" }), "BR");
assert.equal(stopCountryCode({ country: "Brésil", countryCode: "XX1" }), "BR", "code mal formé : ignoré");

setLang("fr");
assert.equal(stopCountry({ country: "Italie" }), "Italie", "ancienne étape : inchangée");
assert.equal(stopCountry({ country: "États-Unis d'Amérique", countryCode: "US" }), "États-Unis", "nom inconnu en français : nom du code");
assert.equal(stopCountry({ country: "Italy", countryCode: "IT" }), "Italie", "étape créée en anglais, lue en français");
assert.equal(stopCountry({ country: "Atlantide" }), "Atlantide", "pays inconnu : tel quel");
assert.equal(countryName("BR"), "Brésil");
assert.equal(countryName("FJ"), "Fidji", "pays sans fiche : nom du navigateur");

setLang("en");
assert.equal(stopCountry({ country: "Italie" }), "Italy", "ancienne étape lue en anglais");
assert.equal(stopCountry({ country: "Royaume-Uni", countryCode: "GB" }), "United Kingdom");
assert.equal(stopCountry({ country: "Atlantide" }), "Atlantide");
setLang("fr");

// Publication : pays traversés retrouvés par code ; voyage repris d'une publication : code ajouté
const trip = { name: "x", currency: "EUR", items: [
  { id: "a", type: "stop", place: "Rome", country: "Italy", countryCode: "IT", arrive: "2030-06-01", depart: "2030-06-02", todos: [] },
  { id: "b", type: "stop", place: "Nice", country: "France", arrive: "2030-06-02", depart: "2030-06-03", todos: [] }] };
const pub = publicCopy(trip);
assert.deepEqual(pub.countries, ["IT", "FR"]);
const fork = tripFromPost({ id: "p", title: "x", ownerHandle: "h", trip: pub });
assert.deepEqual(fork.items.filter((i) => i.type === "stop").map((s) => s.countryCode), ["IT", "FR"]);

console.log("Pays des étapes : tout passe.");
