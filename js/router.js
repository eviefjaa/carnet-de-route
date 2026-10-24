// Navigation entre les pages du menu, via l'adresse (#destinations, #favoris…)
// Les boutons Précédent / Suivant du navigateur fonctionnent, et chaque page a son lien.

import { state, resetUi } from "./store.js";

// Listes ouvertes depuis Mon profil
const NETWORK = ["demandes", "abonnes", "abonnements", "mes-publications"];

export const PAGES = {
  trips: { hash: "voyages", label: "Mes voyages" },
  feed: { hash: "fil", label: "Fil d'actualité" },
  discover: { hash: "decouvrir", label: "Découvrir" },
  notifications: { hash: "notifications", label: "Notifications" },
  explore: { hash: "destinations", label: "Choisir une destination" },
  favorites: { hash: "favoris", label: "Favoris" },
  profile: { hash: "profil", label: "Mon profil" },
  settings: { hash: "parametres", label: "Paramètres" },
};

export function readHash() {
  let h = location.hash.slice(1);
  try { h = decodeURIComponent(h); } catch {} // lien abîmé : on garde le texte brut
  state.country = null;
  state.tripId = null;
  if (h.startsWith("voyage-")) {
    state.view = "trip";
    state.tripId = h.slice("voyage-".length);
    return;
  }
  if (NETWORK.includes(h)) {
    state.view = "network";
    state.networkTab = h;
    return;
  }
  // Profil d'une personne (#personne-<uid>) et publication (#publication-<id>)
  if (h.startsWith("personne-")) {
    state.view = "person";
    state.personId = h.slice("personne-".length);
    return;
  }
  if (h.startsWith("publication-")) {
    state.view = "post";
    state.postId = h.slice("publication-".length);
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
    resetUi(); // une confirmation ou un formulaire ouvert ne suit pas sur la page suivante
    state.authOpen = false;
    state.verifyOpen = false; // quitter l'écran de confirmation par le menu = « Plus tard »
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
