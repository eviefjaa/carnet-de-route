// Menu de gauche : navigation entre les pages

import { esc } from "../utils.js";
import { state } from "../store.js";
import { prefs } from "../prefs.js";
import { PAGES } from "../router.js";

const ICONS = {
  trips: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
  explore: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  favorites: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
};

export const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

export function renderSidebar() {
  const el = document.getElementById("sidebar");
  const current = { country: "explore", trip: "trips" }[state.view] || state.view;
  const counts = {
    trips: Object.keys(state.trips).length,
    favorites: prefs.favorites.length,
  };

  const links = Object.entries(PAGES).map(([key, p]) => `
    <a class="nav-link${key === current ? " on" : ""}" href="#${p.hash}"${key === current ? ' aria-current="page"' : ""}>
      ${icon(key)}<span>${esc(p.label)}</span>
      ${counts[key] ? `<span class="nav-count">${counts[key]}</span>` : ""}
    </a>`).join("");

  const who = state.user
    ? `<a class="side-user" href="#profil"><span class="avatar">${esc((prefs.name || state.user.email || "?")[0].toUpperCase())}</span>
        <span class="side-user-text"><b>${esc(prefs.name || "Mon compte")}</b><span>${esc(state.user.email)}</span></span></a>`
    : "";

  el.innerHTML = `
    <div class="side-head">
      <span class="side-brand">Carnet de route</span>
      <button class="btn ghost small side-close" data-act="close-menu" type="button" aria-label="Fermer le menu">✕</button>
    </div>
    <nav class="side-nav" aria-label="Pages">${links}</nav>
    <div class="side-foot">${who}</div>`;
}
