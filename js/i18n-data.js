// Noms traduits tirés des données : pays (en français, le nom des fiches pays, inchangé ;
// sinon le nom donné par le navigateur à partir du code ISO, ex. « Brésil » → « Brazil »)

import { COUNTRIES } from "./data/countries.js";
import { getLang, locale } from "./i18n.js";

const displays = {};
const display = (loc) => {
  try { return (displays[loc] ||= new Intl.DisplayNames([loc], { type: "region" })); } catch { return null; }
};
// Nom du navigateur, ou "" si le code n'en a pas (code inconnu : Intl renvoie le code lui-même)
const intlName = (code, loc) => {
  try {
    const n = display(loc)?.of(code);
    return n && n !== code ? n : "";
  } catch {
    return "";
  }
};

export function countryName(code) {
  const c = COUNTRIES.find((x) => x.code === code);
  if (getLang() === "fr" && c) return c.name;
  return intlName(code, locale()) || (c ? c.name : code);
}

// Code ISO d'un nom de pays écrit en français ou en anglais (étapes enregistrées avant les codes,
// itinéraires publiés) ; "" si inconnu. Tables construites une fois, à la première demande.
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
let tables = null; // { fr: Map(nom → code), en: Map(nom → code) }
function table(lang) {
  if (!tables) {
    tables = { fr: new Map(), en: new Map() };
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    COUNTRIES.forEach((c) => tables.fr.set(norm(c.name), c.code));
    for (const a of A) for (const b of A) {
      const code = a + b;
      if (code === "ZZ") continue;
      for (const [l, loc] of [["fr", "fr-FR"], ["en", "en-GB"], ["en", "en-US"]]) {
        const n = norm(intlName(code, loc));
        if (n && !tables[l].has(n)) tables[l].set(n, code);
      }
    }
  }
  return tables[lang];
}
export const codeOfName = (name) => (name ? table("fr").get(norm(name)) || table("en").get(norm(name)) || "" : "");

// Code du pays d'une étape : enregistré avec l'étape, sinon retrouvé à partir du nom
export const stopCountryCode = (it) => (/^[A-Z]{2}$/.test(it.countryCode || "") ? it.countryCode : codeOfName(it.country));

// Pays affiché à côté d'une étape, dans la langue choisie. En français, le nom enregistré
// reste tel quel quand c'est un nom français de ce pays (mêmes mots qu'avant les codes).
export function stopCountry(it) {
  const code = stopCountryCode(it);
  if (!code) return it.country || "";
  if (getLang() === "fr" && it.country && table("fr").get(norm(it.country)) === code) return it.country;
  return countryName(code);
}
