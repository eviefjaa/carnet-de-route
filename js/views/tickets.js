// Billets d'un trajet (train, avion, bus…) : liste, ouverture, ajout et suppression

import { esc } from "../utils.js";
import { state } from "../store.js";
import { isEnabled } from "../cloud.js";

// Taille lisible : « 240 Ko », « 1,2 Mo »
export const fmtSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;

export function ticketsBlock(leg) {
  if (!isEnabled()) return "";
  const tickets = leg.tickets || [];

  // Les billets sont enregistrés dans le compte
  if (!state.user) return `<div class="tickets"><p class="note">Connectez-vous pour ajouter vos billets à ce trajet.</p></div>`;

  const list = tickets.map((f) => {
    if (state.confirm === "ticket:" + f.id) {
      return `<li class="tk-confirm">Supprimer « ${esc(f.name)} » ?
        <button class="btn small danger" data-act="ticket-del-yes" data-leg="${esc(leg.id)}" data-file="${esc(f.id)}" type="button">Oui</button>
        <button class="btn small" data-act="cancel-confirm" type="button">Non</button>
      </li>`;
    }
    return `<li>
      <button class="tk-open" data-act="ticket-open" data-leg="${esc(leg.id)}" data-file="${esc(f.id)}" type="button" title="Ouvrir le billet">
        <span class="tk-kind">${f.type === "application/pdf" ? "PDF" : "IMG"}</span>
        <span class="tk-name">${esc(f.name)}</span>
        <span class="tk-size">${fmtSize(f.size)}</span>
      </button>
      <button class="cl-del" data-act="ticket-del" data-leg="${esc(leg.id)}" data-file="${esc(f.id)}" type="button" aria-label="Supprimer le billet ${esc(f.name)}" title="Supprimer">✕</button>
    </li>`;
  }).join("");

  return `<div class="tickets">
    <span class="tk-title">Billets</span>
    ${tickets.length ? `<ul class="tk-list">${list}</ul>` : ""}
    <label class="btn small tk-add">+ Ajouter un billet
      <input type="file" accept="application/pdf,image/*" multiple class="tk-file" data-ticket-input="${esc(leg.id)}">
    </label>
  </div>`;
}
