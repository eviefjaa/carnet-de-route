// Menu « ⋯ » d'un en-tête (voyage ou publication) : choix secondaires, rangés à droite du titre.
// Ouvert : state.moreOpen ; clavier (flèches, Échap) et toucher ailleurs dans js/events.js.
// items : boutons déjà prêts (class="more-item", role="menuitem") ; rien à afficher sans choix.

import { t } from "../i18n.js";
import { state } from "../store.js";

export function moreMenu(items) {
  if (!items.length) return "";
  const open = !!state.moreOpen;
  return `<div class="more">
    <button class="more-btn" id="tripMoreBtn" data-act="more-toggle" type="button" aria-label="${t("trip.more")}" title="${t("trip.more")}" aria-haspopup="menu" aria-expanded="${open}" aria-controls="tripMore">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
    </button>
    <div class="more-menu" id="tripMore" role="menu" aria-labelledby="tripMoreBtn"${open ? "" : " hidden"}>${items.join("")}</div>
  </div>`;
}

// Un choix du menu ; attrs : data-act et autres attributs, déjà échappés
export const moreItem = (attrs, label, danger = false) => `<button class="more-item${danger ? " is-danger" : ""}" role="menuitem" ${attrs} type="button">${label}</button>`;
