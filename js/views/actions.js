// Boutons d'action sous chaque élément et boutons d'insertion entre les éléments

import { esc } from "../utils.js";
import { state } from "../store.js";
import { stopForm } from "./stop.js";
import { transportForm } from "./transport.js";

export function itemActions(it, idx, trip) {
  if (state.confirm === it.id) {
    return `<div class="row-actions confirm">Supprimer ?
      <button class="btn small danger" data-act="del-yes" data-id="${esc(it.id)}" type="button">Oui</button>
      <button class="btn small" data-act="cancel-confirm" type="button">Non</button>
    </div>`;
  }
  const last = trip.items.length - 1;
  return `<div class="row-actions">
    ${idx > 0 ? `<button class="btn ghost small" data-act="up" data-id="${esc(it.id)}" type="button" aria-label="Monter">↑</button>` : ""}
    ${idx < last ? `<button class="btn ghost small" data-act="down" data-id="${esc(it.id)}" type="button" aria-label="Descendre">↓</button>` : ""}
    <button class="btn ghost small" data-act="edit" data-id="${esc(it.id)}" type="button">Modifier</button>
    <button class="btn ghost small" data-act="del" data-id="${esc(it.id)}" type="button">Supprimer</button>
  </div>`;
}

// big : voyage encore vide, les deux boutons sont affichés en grand pour bien démarrer
export function insertRow(pos, big = false) {
  if (state.insertAt && state.insertAt.pos === pos) {
    const d = state.insertAt.draft;
    return d.type === "stop" ? stopForm(d, true) : transportForm(d, true);
  }
  return `<div class="insert${big ? " is-big" : ""}">
    <button class="btn" data-act="add-stop" data-pos="${pos}" type="button">+ Étape</button>
    <button class="btn" data-act="add-leg" data-pos="${pos}" type="button">+ Trajet</button>
  </div>`;
}
