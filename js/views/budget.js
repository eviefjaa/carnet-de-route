// Section « Budget » : tableau des coûts par destination et total du voyage

import { esc, fmtMoney, CURRENCIES } from "../utils.js";
import { computeBudget } from "../budget.js";
import { t, count } from "../i18n.js";

export function budgetSection(trip) {
  const cur = /^[A-Z]{3}$/.test(trip.currency || "") ? trip.currency : "EUR";
  const { rows, total } = computeBudget(trip);
  const m = (n) => esc(fmtMoney(n, cur));

  const list = CURRENCIES[cur] ? CURRENCIES : { [cur]: cur, ...CURRENCIES };
  const options = Object.entries(list)
    .map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(v)}</option>`)
    .join("");

  const body = rows.length
    ? rows.map((r) => `<tr>
        <th scope="row">${esc(r.place)}</th>
        <td>${r.lodging ? m(r.lodging) : "–"}</td>
        <td>${r.transport ? m(r.transport) : "–"}</td>
        <td>${r.activities ? m(r.activities) : "–"}</td>
        <td class="b-total">${m(r.total)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="note">${t("budget.empty")}</td></tr>`;

  return `<section class="budget" aria-label="${t("budget.title")}">
    <div class="budget-head">
      <h2>${t("budget.title")}</h2>
      <label class="currency">${t("budget.currency")}
        <select id="tripCurrency">${options}</select>
      </label>
    </div>
    <div class="budget-total">
      <span class="b-big">${m(total.total)}</span>
      <span class="note">${t("budget.split", { lodging: m(total.lodging), transport: m(total.transport), activities: m(total.activities) })}</span>
    </div>
    <div class="table-scroll">
      <table class="budget-table">
        <thead><tr><th scope="col">${t("budget.colPlace")}</th><th scope="col">${t("budget.colLodging")}</th><th scope="col">${t("budget.colTransport")}</th><th scope="col">${t("budget.colActivities")}</th><th scope="col">${t("budget.colTotal")}</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th scope="row">${t("budget.tripTotal")}</th><td>${m(total.lodging)}</td><td>${m(total.transport)}</td><td>${m(total.activities)}</td><td class="b-total">${m(total.total)}</td></tr></tfoot>
      </table>
    </div>
    <p class="note">${t("budget.rule")}${total.missing ? ` ${count(total.missing, "budget.missing")}` : ""}</p>
  </section>`;
}
