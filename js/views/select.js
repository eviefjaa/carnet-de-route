// Mode sélection, commun à « Mes voyages » et « Mes publications » : cocher plusieurs cartes,
// puis les supprimer ensemble après confirmation (état : state.selecting, state.selected).
// Les cartes cochables portent data-act="select-item" et data-id (voir js/events.js).

import { esc } from "../utils.js";
import { state } from "../store.js";
import { t, count } from "../i18n.js";

// Boutons de l'en-tête : « Sélectionner », ou « Tout sélectionner » et « Terminé » pendant la sélection
// ids : toutes les cartes de la page ; other : bouton affiché hors sélection (ex. « + Nouveau voyage »)
export function selectButtons(ids, other = "") {
  if (!state.selecting) {
    return `<div class="row-btns">${ids.length ? `<button class="btn" data-act="select-start" type="button">${t("select.start")}</button>` : ""}${other}</div>`;
  }
  const all = ids.length && ids.every((id) => state.selected.has(id));
  return `<div class="row-btns">
    <button class="btn" data-act="select-all" data-ids="${esc(ids.join(","))}" type="button">${all ? t("select.none") : t("select.all")}</button>
    <button class="btn primary" data-act="select-end" type="button">${t("select.done")}</button>
  </div>`;
}

// Case à cocher d'une carte (le reste de la carte coche aussi)
export const selectAttrs = (id) =>
  `data-act="select-item" data-id="${esc(id)}"`;
export const selectBox = (id, name) =>
  `<input type="checkbox" class="tc-check" ${selectAttrs(id)} ${state.selected.has(id) ? "checked" : ""} aria-label="${esc(t("select.one", { name }))}">`;

// Barre du bas : nombre de cartes cochées, puis confirmation
// picked : clé du nombre coché (« 2 voyages sélectionnés ») ; question : texte de la confirmation, déjà échappé ;
// yesAct : action du bouton de confirmation ; yesLabel : son texte
export function selectBar(n, { picked, hint, question, yesAct, yesLabel = t("common.delete") }) {
  if (state.confirm === "select-delete" && n) {
    return `<div class="select-bar is-confirm" role="group" aria-label="${t("common.confirmation")}">
      <p>${question}</p>
      <div class="row-btns">
        <button class="btn" data-act="select-cancel-delete" type="button">${t("common.cancel")}</button>
        <button class="btn danger-solid" data-act="${yesAct}" type="button">${yesLabel}</button>
      </div>
    </div>`;
  }
  return `<div class="select-bar">
    <p aria-live="polite">${n ? esc(count(n, picked)) : hint}</p>
    <button class="btn danger-solid" data-act="select-delete" type="button" ${n ? "" : "disabled"}>${t("common.delete")}</button>
  </div>`;
}
