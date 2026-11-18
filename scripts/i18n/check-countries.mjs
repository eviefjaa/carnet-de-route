// Contrôle des fiches pays en anglais : mêmes pays, dans le même ordre, même structure que les
// fiches françaises, aucun texte vide ni resté en français, pas de tiret cadratin.
// js/data/countries.en.js, country-details.en.js et urgences.en.js comparés à leurs versions françaises.
// Lancé par les tests unitaires (tests/unit/pays-anglais.test.mjs) ; seul : node scripts/i18n/check-countries.mjs
import { fileURLToPath } from "node:url";

const data = fileURLToPath(new URL("../../js/data/", import.meta.url));
if (typeof globalThis.localStorage === "undefined") globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const TEXTS = ["name", "capital", "language", "best", "tagline", "description", "history"];
const SAME = ["continent", "currency", "budget", "tags"]; // valeurs fixes, identiques dans les deux langues
const text = (v) => typeof v === "string" && v.trim() !== "";

export async function checkCountries() {
  const fr = (await import(data + "countries.js")).COUNTRIES;
  const en = (await import(data + "countries.en.js")).COUNTRIES;
  const frD = (await import(data + "country-details.js")).DETAILS;
  const enD = (await import(data + "country-details.en.js")).DETAILS;
  const urg = (await import(data + "urgences.js")).URGENCES;
  const enU = (await import(data + "urgences.en.js")).LABELS;
  const errs = [];
  const err = (where, what) => errs.push(`${where} : ${what}`);
  // Un long texte identique en français et en anglais n'a pas été traduit
  const translated = (where, a, b) => {
    if (!text(b)) return err(where, "texte vide");
    if (b.includes("—")) err(where, "tiret cadratin");
    if (a.length > 40 && a === b) err(where, "resté en français");
  };

  if (en.length !== fr.length) err("countries.en.js", `${en.length} pays au lieu de ${fr.length}`);
  fr.forEach((f, i) => {
    const e = en[i];
    if (!e || e.code !== f.code) return err(`countries.en.js[${i}]`, `${f.code} attendu à cette place`);
    TEXTS.forEach((k) => translated(`${f.code}.${k}`, f[k], e[k]));
    SAME.forEach((k) => { if (JSON.stringify(e[k]) !== JSON.stringify(f[k])) err(`${f.code}.${k}`, "différent de la fiche française"); });
    if (!Array.isArray(e.highlights) || e.highlights.length !== f.highlights.length) err(`${f.code}.highlights`, `${f.highlights.length} lieux attendus`);
    else e.highlights.forEach((h, j) => translated(`${f.code}.highlights[${j}]`, f.highlights[j], h));

    const fd = frD[f.code], ed = enD[f.code];
    if (!fd) return;
    if (!ed) return err(`country-details.en.js`, `${f.code} manquant`);
    for (const [list, fields] of [["timeline", ["period", "title", "text"]], ["highlights", ["name", "region", "text"]]]) {
      const a = fd[list] || [], b = ed[list] || [];
      if (a.length !== b.length) { err(`${f.code}.${list}`, `${a.length} éléments attendus, ${b.length}`); continue; }
      a.forEach((x, j) => fields.forEach((k) => {
        if (x[k] === undefined) { if (b[j][k] !== undefined) err(`${f.code}.${list}[${j}].${k}`, "absent en français"); return; }
        translated(`${f.code}.${list}[${j}].${k}`, x[k], b[j][k]);
      }));
    }
  });
  Object.keys(enD).forEach((c) => { if (!frD[c]) err("country-details.en.js", `${c} en trop`); });

  // Urgences : seulement les libellés des numéros en plus (les numéros restent dans urgences.js)
  for (const [code, u] of Object.entries(urg)) {
    const labels = (u.autres || []).map((a) => a.label);
    const l = enU[code] || [];
    if (l.length !== labels.length) { err(`urgences.en.js ${code}`, `${labels.length} libellés attendus, ${l.length}`); continue; }
    labels.forEach((a, j) => translated(`urgences.en.js ${code}[${j}]`, a, l[j]));
  }
  Object.keys(enU).forEach((c) => { if (!urg[c]) err("urgences.en.js", `${c} en trop`); });
  return errs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errs = await checkCountries();
  console.log(errs.length ? errs.join("\n") : "Fiches pays en anglais : complètes et de même structure.");
  process.exit(errs.length ? 1 : 0);
}
