// Langue de l'interface : français ou anglais (britannique)
//
// t("clé", { paramètres }) : texte dans la langue choisie, {nom} remplacé par params.nom.
// count(n, "clé") : « 1 nuit », « 3 nights »… (formes du pluriel selon Intl.PluralRules ;
// en français, 0 et 1 sont au singulier). locale() : « fr-FR » ou « en-GB », pour tous les formats.
// Le contenu écrit par les utilisateurs n'est jamais traduit.
// Une clé absente en anglais : texte français (avertissement en développement) ; jamais la clé brute.

import fr from "./i18n/fr.js";
import en from "./i18n/en.js";

const DICTS = { fr, en };
export const LANGS = { fr: "Français", en: "English" };

let lang = "fr";
export const getLang = () => lang;
export const locale = () => (lang === "en" ? "en-GB" : "fr-FR");

// Première visite : la langue du navigateur (français s'il commence par « fr », anglais sinon).
// Sans navigateur (tests unitaires) : français.
export function browserLang() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "fr";
  const first = (navigator.languages && navigator.languages[0]) || navigator.language || "fr";
  return /^fr\b/i.test(first) ? "fr" : "en";
}

export function setLang(l) {
  lang = l === "en" ? "en" : "fr";
  if (typeof document !== "undefined" && document.documentElement) document.documentElement.lang = lang;
}

const dev = typeof location !== "undefined" && /^(localhost|127\.)/.test(location.hostname);
const warned = new Set();
function lookup(key) {
  const own = DICTS[lang][key];
  if (own !== undefined) return own;
  if (!warned.has(key) && (dev || lang === "fr")) { warned.add(key); console.warn(`Traduction manquante (${lang}) : ${key}`); }
  return fr[key];
}

// params.elide : en français, « de » devient « d' » devant un nom qui commence par une voyelle
// (« dates d'Osaka »). Seulement sur demande : les autres textes restent tels quels.
const VOWEL = /^[aeiouyàâäéèêëîïôöûüœ]/i;
const fill = (s, params) => {
  let out = String(s);
  if (params.elide && lang === "fr") out = out.replace(/(^|\s)de \{(\w+)\}/g, (m, sp, k) => (VOWEL.test(String(params[k] ?? "")) ? `${sp}d'{${k}}` : m));
  return out.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? ""));
};

export function t(key, params = {}) {
  const s = lookup(key);
  if (s === undefined) return "";
  return fill(typeof s === "object" ? s.other : s, params);
}

// Le même texte dans toutes les langues (ex. le nom par défaut d'un voyage, créé dans l'une ou l'autre)
export const inAllLangs = (key) => Object.values(DICTS).map((d) => d[key]).filter((v) => typeof v === "string");

// Liste de valeurs (modes de transport, devises…) : clés internes fixes, libellé lu dans le dictionnaire
// au moment de l'affichage, donc toujours dans la langue choisie. Ex. labels("mode", ["bus", "train"]).
export function labels(prefix, keys) {
  const o = {};
  keys.forEach((k) => Object.defineProperty(o, k, { get: () => t(`${prefix}.${k}`), enumerable: true }));
  return o;
}

// Le nombre est forcé en vrai nombre : une valeur venue d'un autre compte ne s'insère jamais telle quelle
export function count(n, key, params = {}) {
  const x = Number(n);
  const v = Number.isFinite(x) ? x : 0;
  const s = lookup(key);
  if (s === undefined) return String(v);
  const form = typeof s === "object" ? s[new Intl.PluralRules(locale()).select(v)] ?? s.other : s;
  return fill(form, { n: v, ...params });
}
