// Fiches pays en anglais : complètes, de même structure que les fiches françaises (scripts/i18n/check-countries.mjs)
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { checkCountries } = await import(root + "/scripts/i18n/check-countries.mjs");
const errs = await checkCountries();
assert.deepEqual(errs, [], "fiches pays en anglais");

// Noms propres sous leur forme anglaise
const { COUNTRIES } = await import(root + "/js/data/countries.en.js");
const pt = COUNTRIES.find((c) => c.code === "PT");
assert.equal(pt.capital, "Lisbon");
assert.ok(pt.highlights.some((h) => /Lisbon/.test(h)) && !pt.highlights.some((h) => /Lisbonne/.test(h)));
assert.equal(COUNTRIES.find((c) => c.code === "CN").capital, "Beijing");
assert.equal(COUNTRIES.find((c) => c.code === "EG").capital, "Cairo");

console.log("Fiches pays en anglais : tout passe.");
