// Génère js/data/airports.js à partir de airports.csv d'OurAirports (domaine public)
// Usage : node scripts/aeroports/build.mjs chemin/vers/airports.csv
// Source : https://davidmegginson.github.io/ourairports-data/airports.csv
// On garde les aéroports avec des vols réguliers et un code IATA (GRU, CDG…).
import fs from "node:fs";

const csv = fs.readFileSync(process.argv[2], "utf8");

// Lecture CSV avec champs entre guillemets (et guillemets doublés)
function rows(text) {
  const out = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); out.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  return out;
}

const [head, ...data] = rows(csv);
const col = Object.fromEntries(head.map((h, i) => [h, i]));
const clean = (s) => String(s).replace(/[<>"\\`$]/g, "").trim();
const list = data
  .filter((r) => ["large_airport", "medium_airport"].includes(r[col.type]) && r[col.scheduled_service] === "yes" && /^[A-Z]{3}$/.test(r[col.iata_code]) && /^[A-Z]{2}$/.test(r[col.iso_country]))
  .map((r) => [r[col.iata_code], clean(r[col.name]), clean(r[col.municipality]), r[col.iso_country],
    Math.round(+r[col.latitude_deg] * 1e4) / 1e4, Math.round(+r[col.longitude_deg] * 1e4) / 1e4, r[col.type] === "large_airport" ? 1 : 0])
  .filter((a) => Number.isFinite(a[4]) && Number.isFinite(a[5]) && a[1])
  .sort((a, b) => (a[0] < b[0] ? -1 : 1));

const day = new Date().toISOString().slice(0, 10);
fs.writeFileSync(new URL("../../js/data/airports.js", import.meta.url),
  `// Aéroports avec vols réguliers : [code IATA, nom, ville, pays, lat, lng, grand aéroport]\n` +
  `// Généré par scripts/aeroports/build.mjs le ${day} depuis OurAirports (domaine public). Ne pas modifier à la main.\n` +
  `export const AIRPORTS = [\n${list.map((a) => JSON.stringify(a)).join(",\n")}\n];\n`);
console.log(`${list.length} aéroports écrits.`);
