// Recherche de lieux dans le monde entier pour les suggestions de saisie
// Service : Photon (komoot), basé sur OpenStreetMap, gratuit et sans clé.
// Photon ne connaît pas les codes d'aéroport (GRU, CDG…) et range mal les aéroports au nom
// officiel (Guarulhos s'appelle « Governador André Franco Montoro ») : pour les trajets, on
// ajoute en tête les aéroports d'une liste locale (data/airports.js, chargée à la demande).

import { t, labels, getLang, locale } from "./i18n.js";

const API = "https://photon.komoot.io/api/";

// Types de lieux affichés (clés OpenStreetMap), avec leur nom traduit (clés place.*)
const KINDS = labels("place", ["city", "town", "village", "hamlet", "municipality", "suburb", "quarter", "neighbourhood", "island",
  "archipelago", "state", "region", "province", "country", "aerodrome", "airport", "station", "bus_station", "ferry_terminal", "halt"]);
const AIRPORT_TYPES = new Set(["aerodrome", "airport"]);

// Lieux habités et zones (pour les étapes)
const PLACE_TYPES = new Set(["city", "town", "village", "hamlet", "municipality", "suburb", "quarter", "neighbourhood", "island", "archipelago", "state", "region", "province", "country"]);

const cache = new Map();

// mode "place" : villes, régions, pays… ; mode "any" : aussi gares, aéroports, ports
export async function searchPlaces(q, mode = "place", signal) {
  q = q.trim();
  if (q.length < 2) return [];
  const key = getLang() + "|" + mode + "|" + q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const airports = mode === "place" ? [] : await airportMatches(q);
  // Noms dans la langue choisie (Photon : fr ou en)
  const params = new URLSearchParams({ q, limit: mode === "place" ? "10" : "12", lang: getLang() });
  if (mode === "place") params.append("osm_tag", "place");
  let data;
  try {
    const res = await fetch(`${API}?${params}`, { signal });
    if (!res.ok) throw new Error("Recherche indisponible");
    data = await res.json();
  } catch (err) {
    if (err.name === "AbortError" || !airports.length) throw err;
    data = {}; // service indisponible : les aéroports trouvés suffisent
  }

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
    if (AIRPORT_TYPES.has(type) && airports.some((a) => Math.abs(a.lat - lat) + Math.abs(a.lng - lng) < 0.05)) continue; // déjà en tête
    // Pays : son nom dans la langue choisie, et son code (fiches pays, quelle que soit la langue)
    const code = /^[A-Z]{2}$/i.test(p.countrycode || "") ? p.countrycode.toUpperCase() : "";
    results.push({
      name: p.name,
      sub,
      kind: KINDS[type] || t("place.generic"),
      country: type === "country" ? "" : p.country || "",
      countryCode: type === "country" ? "" : code,
      lat,
      lng,
    });
    if (results.length >= 7) break;
  }
  // Aéroports en tête si le code est tapé (GRU), sinon juste après le premier résultat (la ville)
  const first = airports[0] && airports[0].code ? 0 : Math.min(1, results.length);
  results.splice(first, 0, ...airports);
  results.splice(7);
  cache.set(key, results);
  return results;
}

// ---------- Aéroports par code IATA, nom ou ville ----------
const plain = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
let airportList = null;
let countryNames = null, namesLocale = "";

async function airportMatches(q) {
  const words = plain(q).split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length || words.join("").length < 3) return [];
  if (!airportList) {
    try {
      const { AIRPORTS } = await import("./data/airports.js");
      airportList = AIRPORTS.map(([iata, name, city, cc, lat, lng, big]) => ({
        iata, name, city: city.replace(/\s*\(.*\)\s*/g, " ").trim(), cc, lat, lng, big,
        words: plain(`${iata} ${name} ${city}`).split(/[^a-z0-9]+/).filter(Boolean),
      }));
    } catch {
      return []; // liste indisponible : Photon seul
    }
  }
  // Chaque mot tapé doit commencer un mot de l'aéroport ; « aéroport » et ses traductions sont ignorés
  const asked = words.filter((w) => !/^(aero|airport|aeroporto|aeropuerto|flughafen)/.test(w) || words.length === 1);
  const code = words.length === 1 && words[0].length === 3 ? words[0].toUpperCase() : "";
  const hits = airportList
    .filter((a) => a.iata === code || (asked.length && asked.every((w) => a.words.some((x) => x.startsWith(w)))))
    .sort((a, b) => (b.iata === code) - (a.iata === code) || b.big - a.big)
    .slice(0, 3);
  if (hits.length && (!countryNames || namesLocale !== locale())) {
    namesLocale = locale();
    try { countryNames = new Intl.DisplayNames([locale()], { type: "region" }); } catch { countryNames = { of: (c) => c }; }
  }
  return hits.map((a) => {
    const country = countryNames.of(a.cc) || a.cc;
    return { name: `${a.city || a.name} (${a.iata})`, sub: `${a.name}, ${country}`, kind: KINDS.airport, country, countryCode: a.cc, lat: a.lat, lng: a.lng, ...(a.iata === code ? { code: true } : {}) };
  });
}
