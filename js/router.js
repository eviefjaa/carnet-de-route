// Navigation entre les pages du menu, via l'adresse (#destinations, #favoris…)
// Les boutons Précédent / Suivant du navigateur fonctionnent, et chaque page a son lien.

import { state } from "./store.js";

export const PAGES = {
  trips: { hash: "voyages", label: "Mes voyages" },
  explore: { hash: "destinations", label: "Choisir une destination" },
  favorites: { hash: "favoris", label: "Favoris" },
  profile: { hash: "profil", label: "Mon profil" },
  settings: { hash: "parametres", label: "Paramètres" },
};

export function readHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  state.country = null;
  state.tripId = null;
  if (h.startsWith("voyage-")) {
    state.view = "trip";
    state.tripId = h.slice("voyage-".length);
    return;
  }
  if (h.startsWith("destination-")) {
    state.view = "country";
    state.country = h.slice("destination-".length).toUpperCase();
    return;
  }
  const page = Object.entries(PAGES).find(([, p]) => p.hash === h);
  state.view = page ? page[0] : "trips";
}

export function bindRouter(render) {
  window.addEventListener("hashchange", () => {
    readHash();
    state.authOpen = false;
    closeMenu();
    render();
    window.scrollTo(0, 0);
  });
}

export const go = (hash) => (location.hash = hash);

// ---------- Menu sur téléphone ----------
export function openMenu() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("scrim").hidden = false;
  document.getElementById("menuBtn").setAttribute("aria-expanded", "true");
}

export function closeMenu() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("scrim").hidden = true;
  document.getElementById("menuBtn").setAttribute("aria-expanded", "false");
}
