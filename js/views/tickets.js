// Billets : sur un trajet (billet de train, d'avion, de bus…) ou sur une activité
// de la checklist (musée, excursion, restaurant…). Affichage, ajout, ouverture, suppression.
//
// Un billet est rattaché à un élément de l'itinéraire (data-item) et, pour une activité,
// à l'activité (data-tk-todo).

import { esc } from "../utils.js";
import { state } from "../store.js";
import { isEnabled } from "../cloud.js";
import { t, getLang } from "../i18n.js";

// Taille lisible : « 240 Ko », « 1,2 Mo » (en anglais : « 240 KB », « 1.2 MB »)
export function fmtSize(bytes) {
  const b = Number(bytes) || 0;
  const en = getLang() === "en";
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} ${en ? "KB" : "Ko"}`;
  const mb = (b / 1024 / 1024).toFixed(1);
  return en ? `${mb} MB` : `${mb.replace(".", ",")} Mo`;
}

const kind = (type) => (type === "application/pdf" ? "PDF" : "IMG");
const target = (itemId, todoId) => `data-item="${esc(itemId)}"${todoId ? ` data-tk-todo="${esc(todoId)}"` : ""}`;

// Billets les uns à côté des autres : clic pour ouvrir, ✕ pour supprimer (avec confirmation)
function chips(tickets, itemId, todoId) {
  if (!tickets.length) return "";
  return `<ul class="tk-list">${tickets.map((f) => state.confirm === "ticket:" + f.id
    ? `<li class="tk-confirm">${esc(t("ticket.deleteAsk", { name: f.name }))}
        <button class="btn small danger" data-act="ticket-del-yes" ${target(itemId, todoId)} data-file="${esc(f.id)}" type="button">${t("common.yes")}</button>
        <button class="btn small" data-act="cancel-confirm" type="button">${t("common.no")}</button>
      </li>`
    : `<li>
        <button class="tk-open" data-act="ticket-open" ${target(itemId, todoId)} data-file="${esc(f.id)}" type="button" title="${t("ticket.open")}">
          <span class="tk-kind">${kind(f.type)}</span><span class="tk-name">${esc(f.name)}</span><span class="tk-size">${fmtSize(f.size)}</span>
        </button>
        <button class="cl-del" data-act="ticket-del" ${target(itemId, todoId)} data-file="${esc(f.id)}" type="button" aria-label="${esc(t("ticket.deleteNamed", { name: f.name }))}" title="${t("common.delete")}">✕</button>
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
  if (!state.user) return `<div class="tickets"><p class="note">${t("ticket.signInLeg")}</p></div>`;
  return `<div class="tickets">
    <span class="tk-title">${t("ticket.title")}</span>
    ${chips(leg.tickets || [], leg.id)}
    ${addButton(t("ticket.add"), `data-ticket-input="${esc(leg.id)}"`)}
  </div>`;
}

// ---------- Activité de la checklist ----------
export function todoTickets(stop, todo) {
  if (!isEnabled() || !state.user) return "";
  return chips(todo.tickets || [], stop.id, todo.id);
}
export function todoTicketButton(stop, todo) {
  if (!isEnabled() || !state.user) return "";
  return addButton(`<span aria-hidden="true">+</span> ${t("ticket.short")}`,
    `data-ticket-input="${esc(stop.id)}" data-tk-todo="${esc(todo.id)}" aria-label="${esc(t("ticket.addFor", { name: todo.text }))}"`, "tk-add-mini");
}

// ---------- Formulaire d'un trajet ----------
// Les billets choisis dans le formulaire partent à l'enregistrement ; « Annuler » n'envoie rien.
// state.formTickets = { pending: [File…], removed: [idDuBillet…] }
export function formTicketsBlock(leg) {
  if (!isEnabled()) return "";
  if (!state.user) return `<div class="f-label">${t("ticket.title")}<p class="note">${t("ticket.signIn")}</p></div>`;
  return `<div class="f-label">${t("ticket.formLabel")}
    <div class="tickets in-form" data-form-tickets="${esc(leg.id)}">${formTicketsList(leg)}</div>
  </div>`;
}

export function formTicketsList(leg) {
  const { pending, removed } = state.formTickets;
  const kept = (leg.tickets || []).filter((f) => !removed.includes(f.id));
  const items = [
    ...kept.map((f) => `<li>
        <button class="tk-open" data-act="ticket-open" data-item="${esc(leg.id)}" data-file="${esc(f.id)}" type="button" title="${t("ticket.open")}">
          <span class="tk-kind">${kind(f.type)}</span><span class="tk-name">${esc(f.name)}</span><span class="tk-size">${fmtSize(f.size)}</span>
        </button>
        <button class="cl-del" data-act="form-ticket-rm" data-file="${esc(f.id)}" type="button" aria-label="${esc(t("ticket.removeNamed", { name: f.name }))}" title="${t("ticket.remove")}">✕</button>
      </li>`),
    ...pending.map((file, i) => `<li>
        <span class="tk-open is-pending" title="${t("ticket.sentOnSave")}">
          <span class="tk-kind">${kind(file.type)}</span><span class="tk-name">${esc(file.name)}</span><span class="tk-size">${t("ticket.toSend")}</span>
        </span>
        <button class="cl-del" data-act="form-ticket-rm" data-pending="${i}" type="button" aria-label="${esc(t("ticket.removeNamed", { name: file.name }))}" title="${t("ticket.remove")}">✕</button>
      </li>`),
  ];
  return `${items.length ? `<ul class="tk-list">${items.join("")}</ul>` : ""}
    ${addButton(t("ticket.add"), `data-form-ticket-input="1"`)}`;
}
