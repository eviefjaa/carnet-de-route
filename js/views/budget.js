// Section « Budget » : replié, une ligne (total et prix manquants) ; déplié, la devise, le total
// et le tableau par destination. Ouvert ou fermé pour la session (state.budgetOpen).
// Sur téléphone, le tableau n'a que Destination et Total : toucher une ligne affiche son détail.

import { esc, fmtMoney, CURRENCIES } from "../utils.js";
import { computeBudget } from "../budget.js";
import { state } from "../store.js";
import { t, count } from "../i18n.js";

const ARROW = `<svg class="b-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;

export function budgetSection(trip) {
  const cur = /^[A-Z]{3}$/.test(trip.currency || "") ? trip.currency : "EUR";
  const { rows, total } = computeBudget(trip);
  const m = (n) => esc(fmtMoney(n, cur));
  const open = state.budgetOpen;

  // Titre et bouton à la fois (un bouton dans le titre : bien annoncé par les lecteurs d'écran)
  const head = `<h2 class="b-head"><button class="b-toggle" data-act="budget-toggle" type="button" aria-expanded="${open}" aria-controls="budgetBody">
      <span class="b-title">${t("budget.title")}</span>
      <span class="b-sum">· <b>${m(total.total)}</b>${total.missing ? ` <span class="b-missing">· ${count(total.missing, "budget.missingShort")}</span>` : ""}</span>
      ${ARROW}
    </button></h2>`;
  if (!open) return `<section class="budget trip-budget" aria-label="${t("budget.title")}">${head}<div id="budgetBody" hidden></div></section>`;

  const list = CURRENCIES[cur] ? CURRENCIES : { [cur]: cur, ...CURRENCIES };
  const options = Object.entries(list)
    .map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(v)}</option>`)
    .join("");

  // Téléphone : le nom de la destination est un bouton qui affiche le détail de la ligne en dessous
  // (sur ordinateur, texte simple : toutes les colonnes sont visibles)
  const row = (r, i) => {
    const key = `${state.currentId}:${i}`;
    const shown = state.budgetRows.has(key);
    const id = `b-row-${i}`;
    return `<tr>
        <th scope="row"><span class="b-place">${esc(r.place)}</span><button class="b-place-btn" data-act="budget-row" data-row="${esc(key)}" type="button" aria-expanded="${shown}" aria-controls="${id}" aria-label="${esc(t("budget.rowDetail", { place: r.place }))}">${esc(r.place)} ${ARROW}</button></th>
        <td>${r.lodging ? m(r.lodging) : "–"}</td>
        <td>${r.transport ? m(r.transport) : "–"}</td>
        <td>${r.activities ? m(r.activities) : "–"}</td>
        <td class="b-total">${m(r.total)}</td>
      </tr>
      <tr class="b-detail" id="${id}"${shown ? "" : " hidden"}><td colspan="5">
        <span>${t("budget.colLodging")} <b>${r.lodging ? m(r.lodging) : "–"}</b></span>
        <span>${t("budget.colTransport")} <b>${r.transport ? m(r.transport) : "–"}</b></span>
        <span>${t("budget.colActivities")} <b>${r.activities ? m(r.activities) : "–"}</b></span>
      </td></tr>`;
  };
  const body = rows.length ? rows.map(row).join("") : `<tr><td colspan="5" class="note">${t("budget.empty")}</td></tr>`;

  return `<section class="budget trip-budget is-open" aria-label="${t("budget.title")}">
    ${head}
    <div class="b-body" id="budgetBody">
      <label class="currency">${t("budget.currency")}
        <select id="tripCurrency">${options}</select>
      </label>
      <div class="budget-total">
        <span class="b-big">${m(total.total)}</span>
        <span class="note">${t("budget.split", { lodging: m(total.lodging), transport: m(total.transport), activities: m(total.activities) })}</span>
      </div>
      <table class="budget-table">
        <thead><tr><th scope="col">${t("budget.colPlace")}</th><th scope="col">${t("budget.colLodging")}</th><th scope="col">${t("budget.colTransport")}</th><th scope="col">${t("budget.colActivities")}</th><th scope="col">${t("budget.colTotal")}</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th scope="row">${t("budget.tripTotal")}</th><td>${m(total.lodging)}</td><td>${m(total.transport)}</td><td>${m(total.activities)}</td><td class="b-total">${m(total.total)}</td></tr></tfoot>
      </table>
      <p class="note">${t("budget.rule")}${total.missing ? ` ${count(total.missing, "budget.missing")}` : ""}</p>
    </div>
  </section>`;
}
