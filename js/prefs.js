// Préférences de l'utilisateur : favoris, devise par défaut, thème, nom affiché
//
// Enregistrées dans le navigateur, et aussi dans le compte quand on est connecté.

import { toast } from "./toast.js";

const KEY = "carnet-route-prefs";
const DEFAULTS = { favorites: [], currency: "EUR", theme: "auto", name: "", emailReminders: true };

export const prefs = { ...DEFAULTS };
let cloud = null;

export function loadPrefs() {
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {}
  applyTheme();
}

export function savePrefs() {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
  if (cloud) cloud.savePrefs({ ...prefs }).catch(() => toast("Préférences non synchronisées. Vérifiez votre connexion."));
}

// Connexion : on fusionne les préférences du compte avec celles de l'appareil
export function usePrefsCloud(c, remote) {
  cloud = c;
  if (remote) {
    const favorites = [...new Set([...(remote.favorites || []), ...prefs.favorites])];
    Object.assign(prefs, remote, { favorites });
  }
  applyTheme();
  if (c) savePrefs();
}

// Déconnexion : les favoris du compte ne restent pas sur l'appareil
export function resetPrefs() {
  cloud = null;
  const theme = prefs.theme;
  Object.assign(prefs, DEFAULTS, { favorites: [], theme });
  savePrefs();
}

export function applyTheme() {
  const root = document.documentElement;
  if (prefs.theme === "light" || prefs.theme === "dark") root.dataset.theme = prefs.theme;
  else delete root.dataset.theme;
}

export const isFavorite = (code) => prefs.favorites.includes(code);

export function toggleFavorite(code) {
  prefs.favorites = isFavorite(code) ? prefs.favorites.filter((c) => c !== code) : [...prefs.favorites, code];
  savePrefs();
  return isFavorite(code);
}
