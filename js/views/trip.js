// Page d'un voyage : en-tête, résumé, carte et itinéraire

import { esc, fmtDay, nights, plural, fmtMoney } from "../utils.js";
import { state, currentTrip, tripStart, tripEnd } from "../store.js";
import { stopCard, stopForm } from "./stop.js";
import { transportCard, transportForm } from "./transport.js";
import { insertRow } from "./actions.js";
import { budgetSection } from "./budget.js";
import { computeBudget } from "../budget.js";
import { drawMap } from "../map.js";
import { scheduleGeo } from "../geocode.js";

export function render() {
  renderTripSelect();
  const app = document.getElementById("app");
  const t = currentTrip();

  if (!t) {
    app.innerHTML = `<div class="empty">
      <h2>Aucun voyage pour l'instant</h2>
      <p class="note">Créez un voyage, puis ajoutez vos étapes, vos hébergements et vos trajets.</p>
      <button class="btn primary" data-act="new-trip" type="button">Créer un voyage</button>
    </div>`;
    return;
  }

  const stops = t.items.filter((i) => i.type === "stop");
  app.innerHTML = hero(t) + (stops.length ? mapSection() : "") + (t.items.length ? budgetSection(t) : "") + itinerary(t);
  drawMap();
  scheduleGeo();
}

export function renderTripSelect() {
  const sel = document.getElementById("tripSelect");
  const ids = Object.keys(state.trips).sort((a, b) => (state.trips[a].name || "").localeCompare(state.trips[b].name || ""));
  sel.innerHTML = ids
    .map((id) => `<option value="${esc(id)}"${id === state.currentId ? " selected" : ""}>${esc(state.trips[id].name || "Sans titre")}</option>`)
    .join("");
  sel.hidden = ids.length === 0;
}

function hero(t) {
  const stops = t.items.filter((i) => i.type === "stop");
  const legs = t.items.filter((i) => i.type === "transport");
  const totalNights = stops.reduce((s, i) => s + (nights(i.arrive, i.depart) || 0), 0);
  const start = tripStart(t), end = tripEnd(t);
  const budget = computeBudget(t).total.total;

  const del = state.confirm === "trip"
    ? `<div class="confirm">Supprimer « ${esc(t.name)} » et tout son contenu ?
        <button class="btn small danger" data-act="del-trip-yes" type="button">Supprimer</button>
        <button class="btn small" data-act="cancel-confirm" type="button">Annuler</button>
      </div>`
    : `<div class="hero-actions"><button class="btn ghost small danger" data-act="del-trip" type="button">Supprimer ce voyage</button></div>`;

  return `<section class="hero">
    <h1><input id="tripName" value="${esc(t.name)}" aria-label="Nom du voyage"></h1>
    <div class="stats">
      ${start ? `<span><b>${esc(fmtDay(start))}</b> → <b>${esc(fmtDay(end))}</b></span>` : ""}
      <span><b>${stops.length}</b> étape${stops.length > 1 ? "s" : ""}</span>
      <span><b>${plural(totalNights, "nuit")}</b></span>
      <span><b>${legs.length}</b> trajet${legs.length > 1 ? "s" : ""}</span>
      ${budget ? `<span><b>${esc(fmtMoney(budget, t.currency || "EUR"))}</b></span>` : ""}
    </div>
    ${del}
  </section>`;
}

function mapSection() {
  return `<section class="map-box" aria-label="Carte du voyage">
    <div id="mapSlot"></div>
    <p id="geoNote" class="note"></p>
  </section>`;
}

function itinerary(t) {
  let html = `<section class="route" aria-label="Itinéraire">` + insertRow(0);
  t.items.forEach((it, idx) => {
    const editing = state.editingId === it.id;
    if (it.type === "stop") html += editing ? stopForm(it) : stopCard(it, t, idx);
    else html += editing ? transportForm(it) : transportCard(it, t, idx);
    html += insertRow(idx + 1);
  });
  if (!t.items.length) html += `<p class="note">Commencez par ajouter votre première étape.</p>`;
  return html + `</section>`;
}
