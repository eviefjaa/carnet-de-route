// Noms traduits tirés des données : pays (en français, le nom des fiches pays, inchangé ;
// en anglais, le nom donné par le navigateur à partir du code ISO, ex. « Brésil » → « Brazil »)

import { COUNTRIES } from "./data/countries.js";
import { getLang, locale } from "./i18n.js";

let names = null, namesLang = "";
export function countryName(code) {
  const c = COUNTRIES.find((x) => x.code === code);
  if (getLang() === "fr") return c ? c.name : code;
  try {
    if (!names || namesLang !== locale()) { names = new Intl.DisplayNames([locale()], { type: "region" }); namesLang = locale(); }
    return names.of(code) || (c ? c.name : code);
  } catch {
    return c ? c.name : code;
  }
}
