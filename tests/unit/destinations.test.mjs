// Fiches pays : version courte avant chargement, frise et incontournables pour les 59 pays
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };
const ex = await import(root + "/js/views/explore.js");
const { COUNTRIES } = await import(root + "/js/data/countries.js");
assert.match(ex.countryView("FR"), /class="highlights"/, "version courte avant chargement des détails");
await ex.loadDetails();
for (const x of COUNTRIES) {
  const html = ex.countryView(x.code);
  assert.match(html, /class="timeline"/, `frise de ${x.code}`);
  assert.match(html, /class="hl-grid"/, `incontournables de ${x.code}`);
}
console.log(`Destinations : les ${COUNTRIES.length} fiches sont complètes.`);
