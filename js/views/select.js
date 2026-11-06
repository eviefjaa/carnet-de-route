// Mode sélection, commun à « Mes voyages » et « Mes publications » : cocher plusieurs cartes,
// puis les supprimer ensemble après confirmation (état : state.selecting, state.selected).
// Les cartes cochables portent data-act="select-item" et data-id (voir js/events.js).

import { esc, plural } from "../utils.js";
import { state } from "../store.js";

// Boutons de l'en-tête : « Sélectionner », ou « Tout sélectionner » et « Terminé » pendant la sélection
// ids : toutes les cartes de la page ; other : bouton affiché hors sélection (ex. « + Nouveau voyage »)
export function selectButtons(ids, other = "") {
  if (!state.selecting) {
    return `<div class="row-btns">${ids.length ? `<button class="btn" data-act="select-start" type="button">Sélectionner</button>` : ""}${other}</div>`;
  }
  const all = ids.length && ids.every((id) => state.selected.has(id));
  return `<div class="row-btns">
    <button class="btn" data-act="select-all" data-ids="${esc(ids.join(","))}" type="button">${all ? "Tout désélectionner" : "Tout sélectionner"}</button>
    <button class="btn primary" data-act="select-end" type="button">Terminé</button>
  </div>`;
}

// Case à cocher d'une carte (le reste de la carte coche aussi)
export const selectAttrs = (id) =>
  `data-act="select-item" data-id="${esc(id)}"`;
export const selectBox = (id, name) =>
  `<input type="checkbox" class="tc-check" ${selectAttrs(id)} ${state.selected.has(id) ? "checked" : ""} aria-label="Sélectionner « ${esc(name)} »">`;

// Barre du bas : nombre de cartes cochées, puis confirmation
// word : « voyage », « publication » (feminine : accord de « sélectionné ») ; question : texte de la confirmation, déjà échappé ;
// yesAct : action du bouton de confirmation ; yesLabel : son texte
export function selectBar(n, { word, feminine = false, hint, question, yesAct, yesLabel = "Supprimer" }) {
  if (state.confirm === "select-delete" && n) {
    return `<div class="select-bar is-confirm" role="group" aria-label="Confirmation">
      <p>${question}</p>
      <div class="row-btns">
        <button class="btn" data-act="select-cancel-delete" type="button">Annuler</button>
        <button class="btn danger-solid" data-act="${yesAct}" type="button">${yesLabel}</button>
      </div>
    </div>`;
  }
  return `<div class="select-bar">
    <p aria-live="polite">${n ? `${plural(n, word)} sélectionné${feminine ? "e" : ""}${n > 1 ? "s" : ""}` : hint}</p>
    <button class="btn danger-solid" data-act="select-delete" type="button" ${n ? "" : "disabled"}>Supprimer</button>
  </div>`;
}
