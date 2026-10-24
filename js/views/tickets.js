// Billets : sur un trajet (billet de train, d'avion, de bus…) ou sur une activité
// de la checklist (musée, excursion, restaurant…). Affichage, ajout, ouverture, suppression.
//
// Un billet est rattaché à un élément de l'itinéraire (data-item) et, pour une activité,
// à l'activité (data-tk-todo).

import { esc } from "../utils.js";
import { state } from "../store.js";
import { isEnabled } from "../cloud.js";

// Taille lisible : « 240 Ko », « 1,2 Mo »
export function fmtSize(bytes) {
  const b = Number(bytes) || 0;
  return b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

const kind = (type) => (type === "application/pdf" ? "PDF" : "IMG");
const target = (itemId, todoId) => `data-item="${esc(itemId)}"${todoId ? ` data-tk-todo="${esc(todoId)}"` : ""}`;

// Billets les uns à côté des autres : clic pour ouvrir, ✕ pour supprimer (avec confirmation)
function chips(tickets, itemId, todoId) {
  if (!tickets.length) return "";
  return `<ul class="tk-list">${tickets.map((f) => state.confirm === "ticket:" + f.id
    ? `<li class="tk-confirm">Supprimer « ${esc(f.name)} » ?
        <button class="btn small danger" data-act="ticket-del-yes" ${target(itemId, todoId)} data-file="${esc(f.id)}" type="button">Oui</button>
        <button class="btn small" data-act="cancel-confirm" type="button">Non</button>
      </li>`
    : `<li>
        <button class="tk-open" data-act="ticket-open" ${target(itemId, todoId)} data-file="${esc(f.id)}" type="button" title="Ouvrir le billet">
          <span class="tk-kind">${kind(f.type)}</span><span class="tk-name">${esc(f.name)}</span><span class="tk-size">${fmtSize(f.size)}</span>
        </button>
        <button class="cl-del" data-act="ticket-del" ${target(itemId, todoId)} data-file="${esc(f.id)}" type="button" aria-label="Supprimer le billet ${esc(f.name)}" title="Supprimer">✕</button>
      </li>`).join("")}</ul>`;
}

// Bouton qui ouvre le choix de fichiers (le champ reste atteignable au clavier)
function addButton(label, attrs, extraClass = "") {
  return `<label class="btn small tk-add ${extraClass}">${label}
    <input type="file" accept="application/pdf,image/*" multiple class="tk-file" ${attrs}>
  </label>`;
}

// ---------- Trajet ----------
export function ticketsBlock(leg) {
  if (!isEnabled()) return "";
  // Les billets sont enregistrés dans le compte
  if (!state.user) return `<div class="tickets"><p class="note">Connectez-vous pour ajouter vos billets à ce trajet.</p></div>`;
  return `<div class="tickets">
    <span class="tk-title">Billets</span>
    ${chips(leg.tickets || [], leg.id)}
    ${addButton("+ Ajouter un billet", `data-ticket-input="${esc(leg.id)}"`)}
  </div>`;
}

// ---------- Activité de la checklist ----------
export function todoTickets(stop, todo) {
  if (!isEnabled() || !state.user) return "";
  return chips(todo.tickets || [], stop.id, todo.id);
}
export function todoTicketButton(stop, todo) {
  if (!isEnabled() || !state.user) return "";
  return addButton(`<span aria-hidden="true">+</span> Billet`,
    `data-ticket-input="${esc(stop.id)}" data-tk-todo="${esc(todo.id)}" aria-label="Ajouter un billet pour « ${esc(todo.text)} »"`, "tk-add-mini");
}

// ---------- Formulaire d'un trajet ----------
// Les billets choisis dans le formulaire partent à l'enregistrement ; « Annuler » n'envoie rien.
// state.formTickets = { pending: [File…], removed: [idDuBillet…] }
export function formTicketsBlock(leg) {
  if (!isEnabled()) return "";
  if (!state.user) return `<div class="f-label">Billets<p class="note">Connectez-vous pour ajouter vos billets.</p></div>`;
  return `<div class="f-label">Billets (PDF ou photo, 700 Ko maximum)
    <div class="tickets in-form" data-form-tickets="${esc(leg.id)}">${formTicketsList(leg)}</div>
  </div>`;
}

export function formTicketsList(leg) {
  const { pending, removed } = state.formTickets;
  const kept = (leg.tickets || []).filter((f) => !removed.includes(f.id));
  const items = [
    ...kept.map((f) => `<li>
        <button class="tk-open" data-act="ticket-open" data-item="${esc(leg.id)}" data-file="${esc(f.id)}" type="button" title="Ouvrir le billet">
          <span class="tk-kind">${kind(f.type)}</span><span class="tk-name">${esc(f.name)}</span><span class="tk-size">${fmtSize(f.size)}</span>
        </button>
        <button class="cl-del" data-act="form-ticket-rm" data-file="${esc(f.id)}" type="button" aria-label="Retirer le billet ${esc(f.name)}" title="Retirer">✕</button>
      </li>`),
    ...pending.map((file, i) => `<li>
        <span class="tk-open is-pending" title="Envoyé à l'enregistrement">
          <span class="tk-kind">${kind(file.type)}</span><span class="tk-name">${esc(file.name)}</span><span class="tk-size">à envoyer</span>
        </span>
        <button class="cl-del" data-act="form-ticket-rm" data-pending="${i}" type="button" aria-label="Retirer le billet ${esc(file.name)}" title="Retirer">✕</button>
      </li>`),
  ];
  return `${items.length ? `<ul class="tk-list">${items.join("")}</ul>` : ""}
    ${addButton("+ Ajouter un billet", `data-form-ticket-input="1"`)}`;
}
