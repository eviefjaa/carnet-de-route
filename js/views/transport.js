// Affichage et formulaire d'un trajet (moyen de transport, lieux, horaires, durée)

import { esc, uid, safeUrl, MODES, duration, fmtDateTime, fmtMoney, priceInput, parsePrice, hasPrice, plural } from "../utils.js";
import { state } from "../store.js";
import { itemActions } from "./actions.js";
import { ticketsBlock, formTicketsBlock } from "./tickets.js";

export function transportCard(it, trip, idx) {
  const d = duration(it.dep, it.arr);
  const u = safeUrl(it.url);
  const hasExtra = it.company || it.ref || u || it.notes;

  // Carte repliée : mode, lieux, départ et durée. Un clic affiche le reste.
  const open = state.openItems.has(it.id);
  const tickets = (it.tickets || []).length;
  const detailId = `leg-detail-${esc(it.id)}`;

  return `<article class="item transport${open ? " open" : ""}">
    <div class="leg-summary">
      <span class="mode">${esc(MODES[it.mode] || "Trajet")}</span>
      <div class="leg">
        <div class="leg-places">
          <button class="stop-toggle" data-act="toggle-item" data-id="${esc(it.id)}" type="button" aria-expanded="${open}" aria-controls="${detailId}">${esc(it.from || "Départ ?")} → ${esc(it.to || "Arrivée ?")}</button>
          <svg class="stop-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="leg-times">
          <span>Départ <b>${esc(fmtDateTime(it.dep))}</b></span>
          ${d ? `<span class="dur">${esc(d)}</span>` : ""}
          ${tickets ? `<span class="leg-tickets">${plural(tickets, "billet")}</span>` : ""}
        </div>
      </div>
    </div>
    ${open ? `<div class="leg-detail" id="${detailId}">
      <div class="leg-times">
        <span>Arrivée <b>${esc(fmtDateTime(it.arr))}</b></span>
        ${hasPrice(it.price) ? `<span class="price">${esc(fmtMoney(it.price, trip.currency || "EUR"))}</span>` : ""}
      </div>
      ${hasExtra ? `<div class="leg-extra">
        ${it.company ? `<span>${esc(it.company)}</span>` : ""}
        ${it.ref ? `<span>Réf. ${esc(it.ref)}</span>` : ""}
        ${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Réservation ↗</a>` : ""}
        ${it.notes ? `<span>${esc(it.notes)}</span>` : ""}
      </div>` : ""}
      ${ticketsBlock(it)}
      ${itemActions(it, idx, trip)}
    </div>` : ""}
  </article>`;
}

export function transportForm(it, isNew) {
  const modes = Object.entries(MODES)
    .map(([k, v]) => `<option value="${k}"${it.mode === k ? " selected" : ""}>${v}</option>`)
    .join("");

  return `<form class="form" data-form="transport" data-id="${esc(it.id)}" data-new="${isNew ? 1 : 0}">
    <h3>${isNew ? "Nouveau trajet" : "Modifier le trajet"}</h3>
    <div class="grid">
      <label class="f">Moyen de transport<select name="mode" id="t-mode-${esc(it.id)}">${modes}</select></label>
      <label class="f">Compagnie<input name="company" id="t-comp-${esc(it.id)}" value="${esc(it.company)}" placeholder="Ex. 1001, LATAM"></label>
      <label class="f">Lieu de départ<span class="ac"><input name="from" id="t-from-${esc(it.id)}" value="${esc(it.from)}" placeholder="Ville, gare, aéroport…" data-place="any" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">Lieu d'arrivée<span class="ac"><input name="to" id="t-to-${esc(it.id)}" value="${esc(it.to)}" placeholder="Ville, gare, aéroport…" data-place="any" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">Départ (date et heure)<input type="datetime-local" name="dep" id="t-dep-${esc(it.id)}" value="${esc(it.dep)}"></label>
      <label class="f">Arrivée (date et heure)<input type="datetime-local" name="arr" id="t-arr-${esc(it.id)}" value="${esc(it.arr)}" min="${esc(it.dep)}"></label>
      <div class="computed full" data-duration></div>
      <label class="f">Prix<input name="price" id="t-price-${esc(it.id)}" value="${esc(priceInput(it.price))}" inputmode="decimal" placeholder="Ex. 80"></label>
      <label class="f">N° de réservation<input name="ref" id="t-ref-${esc(it.id)}" value="${esc(it.ref)}"></label>
      <label class="f full">Lien de réservation<input name="url" id="t-url-${esc(it.id)}" value="${esc(it.url)}" placeholder="https://…" inputmode="url"></label>
      <label class="f full">Notes<input name="notes" id="t-notes-${esc(it.id)}" value="${esc(it.notes)}" placeholder="Quai, siège, bagages…"></label>
    </div>
    ${formTicketsBlock(it)}
    <div class="form-actions">
      <button class="btn" data-act="cancel" type="button">Annuler</button>
      <button class="btn primary" type="submit">Enregistrer</button>
    </div>
  </form>`;
}

export function readTransportForm(f) {
  const o = { id: f.dataset.id, type: "transport" };
  ["mode", "from", "to", "dep", "arr", "company", "ref", "url", "notes"].forEach((k) => (o[k] = f[k].value.trim()));
  o.price = parsePrice(f.price.value);
  return o;
}

export function newTransport(from = "", to = "", dep = "") {
  return { id: uid(), type: "transport", mode: "bus", from, to, dep, arr: "", company: "", ref: "", url: "", notes: "", price: null };
}
