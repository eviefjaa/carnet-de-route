// Affichage et formulaire d'un trajet (moyen de transport, lieux, horaires, durée)

import { esc, uid, safeUrl, MODES, duration, fmtDateTime, fmtMoney, priceInput, parsePrice, hasPrice } from "../utils.js";
import { t, count } from "../i18n.js";
import { state } from "../store.js";
import { itemActions } from "./actions.js";
import { ticketsBlock, formTicketsBlock } from "./tickets.js";
import { pickedPlace } from "../autocomplete.js";

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
      <span class="mode">${esc(MODES[it.mode] || t("leg.generic"))}</span>
      <div class="leg">
        <div class="leg-places">
          <button class="stop-toggle" data-act="toggle-item" data-id="${esc(it.id)}" type="button" aria-expanded="${open}" aria-controls="${detailId}">${esc(it.from || t("leg.fromUnknown"))} → ${esc(it.to || t("leg.toUnknown"))}</button>
          <svg class="stop-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="leg-times">
          <span>${t("leg.departs", { when: `<b>${esc(fmtDateTime(it.dep))}</b>` })}</span>
          ${d ? `<span class="dur">${esc(d)}</span>` : ""}
          ${tickets ? `<span class="leg-tickets">${count(tickets, "count.ticket")}</span>` : ""}
        </div>
      </div>
    </div>
    ${open ? `<div class="leg-detail" id="${detailId}">
      <div class="leg-times">
        <span>${t("leg.arrives", { when: `<b>${esc(fmtDateTime(it.arr))}</b>` })}</span>
        ${hasPrice(it.price) ? `<span class="price">${esc(fmtMoney(it.price, trip.currency || "EUR"))}</span>` : ""}
      </div>
      ${hasExtra ? `<div class="leg-extra">
        ${it.company ? `<span>${esc(it.company)}</span>` : ""}
        ${it.ref ? `<span>${t("leg.ref")} ${esc(it.ref)}</span>` : ""}
        ${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t("leg.booking")}</a>` : ""}
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
    <h3>${isNew ? t("leg.formNew") : t("leg.formEdit")}</h3>
    <div class="grid">
      <label class="f">${t("leg.mode")}<select name="mode" id="t-mode-${esc(it.id)}">${modes}</select></label>
      <label class="f">${t("leg.company")}<input name="company" id="t-comp-${esc(it.id)}" value="${esc(it.company)}" placeholder="${t("leg.companyHint")}"></label>
      <label class="f">${t("leg.from")}<span class="ac"><input name="from" id="t-from-${esc(it.id)}" value="${esc(it.from)}" placeholder="${t("leg.placeHint")}" required data-place="any" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">${t("leg.to")}<span class="ac"><input name="to" id="t-to-${esc(it.id)}" value="${esc(it.to)}" placeholder="${t("leg.placeHint")}" required data-place="any" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">${t("leg.depWhen")}<input type="datetime-local" name="dep" id="t-dep-${esc(it.id)}" value="${esc(it.dep)}"${/^\d{4}-\d{2}-\d{2}$/.test(it.dep || "") ? ` data-day="${esc(it.dep)}"` : ""}></label>
      <label class="f">${t("leg.arrWhen")}<input type="datetime-local" name="arr" id="t-arr-${esc(it.id)}" value="${esc(it.arr)}" min="${esc(it.dep)}"></label>
      <div class="computed full" data-duration></div>
      <label class="f">${t("act.priceShort")}<input name="price" id="t-price-${esc(it.id)}" value="${esc(priceInput(it.price))}" inputmode="decimal" placeholder="${t("leg.priceHint")}"></label>
      <label class="f">${t("leg.refLabel")}<input name="ref" id="t-ref-${esc(it.id)}" value="${esc(it.ref)}"></label>
      <label class="f full">${t("leg.urlLabel")}<input name="url" id="t-url-${esc(it.id)}" value="${esc(it.url)}" placeholder="https://…" inputmode="url"></label>
      <label class="f full">${t("stop.notes")}<input name="notes" id="t-notes-${esc(it.id)}" value="${esc(it.notes)}" placeholder="${t("leg.notesHint")}"></label>
    </div>
    ${formTicketsBlock(it)}
    <div class="form-actions">
      <button class="btn" data-act="cancel" type="button">${t("common.cancel")}</button>
      <button class="btn primary" type="submit">${t("common.save")}</button>
    </div>
  </form>`;
}

export function readTransportForm(f) {
  const o = { id: f.dataset.id, type: "transport" };
  ["mode", "from", "to", "dep", "arr", "company", "ref", "url", "notes"].forEach((k) => (o[k] = f[k].value.trim()));
  // Date sans heure (voyage tiré d'un itinéraire publié) : le champ l'affiche vide, on la garde si on n'en tape pas d'autre
  if (!o.dep && f.dep.dataset.day) o.dep = f.dep.dataset.day;
  o.price = parsePrice(f.price.value);
  // Lieux choisis dans les suggestions : leur position sert à la carte quand il n'y a pas d'étape de ce côté
  for (const k of ["from", "to"]) {
    const p = pickedPlace(f[k]);
    if (p) o[k + "Geo"] = { q: o[k], lat: p.lat, lng: p.lng };
  }
  return o;
}

export function newTransport(from = "", to = "", dep = "") {
  return { id: uid(), type: "transport", mode: "bus", from, to, dep, arr: "", company: "", ref: "", url: "", notes: "", price: null };
}
