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
import { authScreen, renderAccountBar } from "./auth.js";
import { isEnabled } from "../cloud.js";
import { renderSidebar } from "./sidebar.js";
import { exploreView, filterCountries, countryView, favoritesView } from "./explore.js";
import { profileView, settingsView } from "./pages.js";
import { prefs } from "../prefs.js";
import { tripsListView } from "./trips-list.js";

export function render() {
  renderAccountBar();
  renderSidebar();
  const app = document.getElementById("app");
  const busy = state.authOpen || state.loading;
  document.getElementById("wrap").classList.toggle("wide", ["trips", "explore", "country", "favorites"].includes(state.view) && !busy);

  if (state.authOpen) {
    app.innerHTML = authScreen();
    return;
  }
  if (state.loading) {
    app.innerHTML = `<p class="note">Chargement de vos voyages…</p>`;
    return;
  }

  switch (state.view) {
    case "trips":
      app.innerHTML = tripsListView();
      return;
    case "explore":
      app.innerHTML = exploreView();
      filterCountries();
      return;
    case "country":
      app.innerHTML = countryView(state.country);
      return;
    case "favorites":
      app.innerHTML = favoritesView(prefs.favorites);
      return;
    case "profile":
      app.innerHTML = profileView();
      return;
    case "settings":
      app.innerHTML = settingsView();
      return;
  }

  // Page d'un voyage (#voyage-<id>)
  if (state.tripId) state.currentId = state.tripId;
  const t = currentTrip();
  if (!t) {
    app.innerHTML = `<div class="empty">
      <h2>Voyage introuvable</h2>
      <p class="note">Il a peut-être été supprimé, ou il est enregistré dans un autre compte.</p>
      <a class="btn primary" href="#voyages">Voir mes voyages</a>
    </div>`;
    return;
  }

  const stops = t.items.filter((i) => i.type === "stop");
  app.innerHTML = hero(t) + (stops.length ? mapSection() : "") + (t.items.length ? budgetSection(t) : "") + itinerary(t);
  drawMap();
  scheduleGeo();
  if (state.focusName) {
    state.focusName = false;
    const input = document.getElementById("tripName");
    if (input) { input.focus(); input.select(); }
  }
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
    <a class="trip-back" href="#voyages">← Mes voyages</a>
    <h1><input id="tripName" value="${esc(t.name)}" aria-label="Nom du voyage"></h1>
    <div class="stats">
      ${start ? `<span><b>${esc(fmtDay(start))}</b> → <b>${esc(fmtDay(end))}</b></span>` : ""}
      <span><b>${stops.length}</b> étape${stops.length > 1 ? "s" : ""}</span>
      <span><b>${plural(totalNights, "nuit")}</b></span>
      <span><b>${legs.length}</b> trajet${legs.length > 1 ? "s" : ""}</span>
      ${budget ? `<span><b>${esc(fmtMoney(budget, t.currency || "EUR"))}</b></span>` : ""}
    </div>
    ${isEnabled() ? `<p class="sync-note">${state.user ? "Synchronisé avec votre compte" : "Enregistré sur cet appareil uniquement"}</p>` : ""}
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
