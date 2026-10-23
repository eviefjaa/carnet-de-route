// Section « Budget » : tableau des coûts par destination et total du voyage

import { esc, fmtMoney, CURRENCIES } from "../utils.js";
import { computeBudget } from "../budget.js";

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
        <td>${r.lodging ? m(r.lodging) : "—"}</td>
        <td>${r.transport ? m(r.transport) : "—"}</td>
        <td class="b-total">${m(r.total)}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="note">Ajoutez des étapes et des trajets pour voir le budget.</td></tr>`;

  return `<section class="budget" aria-label="Budget">
    <div class="budget-head">
      <h2>Budget</h2>
      <label class="currency">Devise
        <select id="tripCurrency">${options}</select>
      </label>
    </div>
    <div class="budget-total">
      <span class="b-big">${m(total.total)}</span>
      <span class="note">dont ${m(total.lodging)} d'hébergement et ${m(total.transport)} de transport</span>
    </div>
    <div class="table-scroll">
      <table class="budget-table">
        <thead><tr><th scope="col">Destination</th><th scope="col">Hébergement</th><th scope="col">Transport</th><th scope="col">Total</th></tr></thead>
        <tbody>${body}</tbody>
        <tfoot><tr><th scope="row">Total du voyage</th><td>${m(total.lodging)}</td><td>${m(total.transport)}</td><td class="b-total">${m(total.total)}</td></tr></tfoot>
      </table>
    </div>
    <p class="note">Chaque trajet est compté dans la destination vers laquelle il mène.${total.missing ? ` ${total.missing} prix pas encore renseigné${total.missing > 1 ? "s" : ""}.` : ""}</p>
  </section>`;
}
