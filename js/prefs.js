// Préférences de l'utilisateur : favoris, devise par défaut, thème, nom affiché
//
// Enregistrées dans le navigateur, et aussi dans le compte quand on est connecté.

import { toast } from "./toast.js";

const KEY = "carnet-route-prefs";
const DEFAULTS = { favorites: [], favoritePosts: [], currency: "EUR", theme: "auto", name: "", emailReminders: true, notifSeen: 0 };

export const prefs = { ...DEFAULTS };
let cloud = null;

export function loadPrefs() {
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {}
  if (!Array.isArray(prefs.favoritePosts)) prefs.favoritePosts = [];
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
    const favoritePosts = [...new Set([...(Array.isArray(remote.favoritePosts) ? remote.favoritePosts : []), ...prefs.favoritePosts])];
    Object.assign(prefs, remote, { favorites, favoritePosts });
  }
  applyTheme();
  if (c) savePrefs();
}

// Déconnexion : les favoris du compte ne restent pas sur l'appareil
export function resetPrefs() {
  cloud = null;
  const theme = prefs.theme;
  Object.assign(prefs, DEFAULTS, { favorites: [], favoritePosts: [], theme });
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

// Itinéraires publiés mis en favori (identifiants des publications)
export const isFavoritePost = (id) => prefs.favoritePosts.includes(id);

export function toggleFavoritePost(id) {
  prefs.favoritePosts = isFavoritePost(id) ? prefs.favoritePosts.filter((p) => p !== id) : [...prefs.favoritePosts, id];
  savePrefs();
  return isFavoritePost(id);
}

// Retire des favoris les itinéraires supprimés ou devenus invisibles
export function forgetFavoritePosts(ids) {
  prefs.favoritePosts = prefs.favoritePosts.filter((p) => !ids.includes(p));
  savePrefs();
}
