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
  assert.match(html, /class="urgences-list"/, `numéros utiles de ${x.code}`);
  assert.doesNotMatch(html, /href="tel:/, `pas de bouton d'appel (${x.code})`);
}
// Page « Choisir une destination » : pays par ordre alphabétique
{ const shown = [...ex.exploreView().matchAll(/class="cc-link"[^>]*>([^<]+)</g)].map((m) => m[1].trim());
  assert.equal(shown.length, COUNTRIES.length, "tous les pays affichés");
  assert.deepEqual(shown, [...shown].sort((a, b) => a.localeCompare(b, "fr")), "ordre alphabétique");
  console.log(`Destinations : de ${shown[0]} à ${shown[shown.length - 1]}.`); }
// Publication : pays traversés (pays du voyage et pays des étapes), pour les fiches pays
{ const { publicCopy } = await import(root + "/js/publish.js");
  const c = publicCopy({ country: "FR", items: [{ id: "a", type: "stop", place: "Lyon", country: "France" },
    { id: "b", type: "stop", place: "Turin", country: "Italie" }, { id: "c", type: "stop", place: "Atlantide", country: "Nulle part" }] });
  assert.deepEqual(c.countries, ["FR", "IT"], "pays traversés");
  assert.deepEqual(publicCopy({ items: [] }).countries, [], "aucun pays"); }
// Un numéro qui sert à tout n'est affiché qu'une fois
assert.equal(ex.countryView("US").match(/>911</g).length, 1, "911 une seule fois");
console.log(`Destinations : les ${COUNTRIES.length} fiches sont complètes.`);
