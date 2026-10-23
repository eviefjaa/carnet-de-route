// Recherche de lieux dans le monde entier pour les suggestions de saisie
// Service : Photon (komoot), basé sur OpenStreetMap — gratuit, sans clé.

const API = "https://photon.komoot.io/api/";

// Types de lieux affichés, avec leur nom en français
const KINDS = {
  city: "Ville",
  town: "Ville",
  village: "Village",
  hamlet: "Hameau",
  municipality: "Commune",
  suburb: "Quartier",
  quarter: "Quartier",
  neighbourhood: "Quartier",
  island: "Île",
  archipelago: "Archipel",
  state: "Région",
  region: "Région",
  province: "Province",
  country: "Pays",
  aerodrome: "Aéroport",
  airport: "Aéroport",
  station: "Gare",
  bus_station: "Gare routière",
  ferry_terminal: "Port",
  halt: "Gare",
};

// Lieux habités et zones (pour les étapes)
const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "municipality", "suburb", "quarter", "neighbourhood", "island", "archipelago", "state", "region", "province", "country"]);

const cache = new Map();

// mode "place" : villes, régions, pays… ; mode "any" : aussi gares, aéroports, ports
export async function searchPlaces(q, mode = "place", signal) {
  q = q.trim();
  if (q.length < 2) return [];
  const key = mode + "|" + q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({ q, limit: mode === "place" ? "10" : "12", lang: "fr" });
  if (mode === "place") params.append("osm_tag", "place");
  const res = await fetch(`${API}?${params}`, { signal });
  if (!res.ok) throw new Error("Recherche indisponible");
  const data = await res.json();

  const seen = new Set();
  const results = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    const type = p.osm_value;
    if (mode === "place" ? !PLACE_TYPES.has(type) : !KINDS[type]) continue;
    if (!p.name || !f.geometry) continue;

    const parts = [p.city, p.county, p.state, p.country].filter((x) => x && x !== p.name);
    const sub = [...new Set(parts)].slice(-2).join(", ");
    const id = p.name + "|" + sub + "|" + (KINDS[type] || "");
    if (seen.has(id)) continue;
    seen.add(id);

    const [lng, lat] = f.geometry.coordinates;
    results.push({
      name: p.name,
      sub,
      kind: KINDS[type] || "Lieu",
      country: type === "country" ? "" : p.country || "",
      lat,
      lng,
    });
    if (results.length >= 7) break;
  }
  cache.set(key, results);
  return results;
}
