// Aéroports dans les suggestions des trajets : code IATA (GRU), nom ou ville, sans réseau
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));

// Photon simulé : une ville pour chaque recherche, plus l'aéroport en double pour « guarulhos »
let photonDown = false;
const feature = (name, value, key, lng, lat) => ({ type: "Feature", properties: { name, osm_key: key, osm_value: value, country: "Brésil" }, geometry: { type: "Point", coordinates: [lng, lat] } });
globalThis.fetch = async (url) => {
  if (photonDown) throw new Error("hors ligne");
  const q = new URL(url).searchParams.get("q").toLowerCase();
  const features = [feature(q === "paris" ? "Paris" : q === "gru" ? "Grue" : "Guarulhos", "city", "place", -46.5, -23.4)];
  if (q === "guarulhos") features.push(feature("Aeroporto Internacional Governador André Franco Montoro", "aerodrome", "aeroway", -46.4699, -23.4313));
  return { ok: true, json: async () => ({ features }) };
};
const { searchPlaces } = await import(root + "/js/places.js");
const { AIRPORTS } = await import(root + "/js/data/airports.js");
const names = async (q, mode = "any") => (await searchPlaces(q, mode)).map((r) => r.name);

assert.ok(AIRPORTS.length > 2000, "liste d'aéroports chargée");
assert.ok(AIRPORTS.every((a) => /^[A-Z]{3}$/.test(a[0]) && !/[<>"`]/.test(a[1] + a[2])), "codes et noms propres");

// Le code tapé : l'aéroport en tête
assert.deepEqual((await names("GRU")).slice(0, 2), ["São Paulo (GRU)", "Grue"]);
// Le nom de la ville de l'aéroport : la ville d'abord, puis l'aéroport, sans le doublon de Photon
assert.deepEqual(await names("Guarulhos"), ["Guarulhos", "São Paulo (GRU)"]);
const gru = (await searchPlaces("Guarulhos", "any"))[1];
assert.equal(gru.kind, "Aéroport");
assert.equal(gru.country, "Brésil");
assert.ok(Math.abs(gru.lat + 23.43) < 0.01 && Math.abs(gru.lng + 46.47) < 0.01);
// Une grande ville : ses grands aéroports
assert.deepEqual((await names("Paris")).slice(0, 3), ["Paris", "Paris (CDG)", "Paris (ORY)"]);
// Les étapes (villes seulement) ne proposent pas d'aéroport
assert.ok(!(await names("Guarulhos", "place")).some((n) => n.includes("GRU")));
// Photon indisponible : les aéroports restent proposés
photonDown = true;
assert.deepEqual(await names("cdg"), ["Paris (CDG)"]);
await assert.rejects(searchPlaces("Lyon centre", "place"));

console.log("Aéroports : tous les tests passent.");
