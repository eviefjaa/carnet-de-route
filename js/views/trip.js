// Page d'un voyage : en-tête, résumé, carte et itinéraire

import { esc, fmtDay, nights, plural, fmtMoney } from "../utils.js";
import { state, currentTrip, tripStart, tripEnd, isOwner, sync } from "../store.js";
import { stopCard, stopForm } from "./stop.js";
import { transportCard, transportForm } from "./transport.js";
import { insertRow } from "./actions.js";
import { budgetSection } from "./budget.js";
import { computeBudget } from "../budget.js";
import { drawMap } from "../map.js";
import { scheduleGeo } from "../geocode.js";
import { authScreen, renderAccountBar, syncNote } from "./auth.js";
import { isEnabled } from "../cloud.js";
import { renderSidebar } from "./sidebar.js";
import { exploreView, filterCountries, countryView, favoritesView, detailsReady, loadDetails } from "./explore.js";
import { profileView, settingsView } from "./pages.js";
import { prefs } from "../prefs.js";
import { tripsListView } from "./trips-list.js";
import { tripPending } from "./checklist.js";
import { shareSection, travellers } from "./share.js";

// Met à jour l'état de la synchronisation sans tout réafficher (garde la saisie en cours)
export function renderSync() {
  renderAccountBar();
  const note = document.getElementById("syncNote");
  const t = currentTrip();
  if (note && t) {
    note.textContent = syncNote(travellers(t));
    note.classList.toggle("is-error", sync.status === "error");
  }
}

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
      // Première fiche ouverte : on affiche la version courte, puis la version détaillée
      if (!detailsReady()) loadDetails().then(() => state.view === "country" && !state.authOpen && render());
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
      <p class="note">${!state.user && isEnabled()
        ? "Si vous avez été invité(e), connectez-vous avec l'adresse e-mail qui a reçu l'invitation."
        : state.user && !state.user.emailVerified
          ? "Si vous avez été invité(e), confirmez d'abord votre adresse e-mail avec le lien reçu, puis rechargez la page."
          : "Il a peut-être été supprimé, ou il est enregistré dans un autre compte."}</p>
      ${!state.user && isEnabled()
        ? `<button class="btn primary" data-act="open-auth" data-mode="signin" type="button">Se connecter</button>`
        : `<a class="btn primary" href="#voyages">Voir mes voyages</a>`}
    </div>`;
    return;
  }

  const stops = t.items.filter((i) => i.type === "stop");
  app.innerHTML = hero(t) + shareSection(t) + (stops.length ? mapSection() : "") + (t.items.length ? budgetSection(t) : "") + itinerary(t);
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

  // Seul le créateur supprime le voyage ; les autres voyageurs peuvent le quitter
  const owner = isOwner(t);
  const others = travellers(t) - 1;
  const del = state.confirm === "trip"
    ? `<div class="confirm">${owner
          ? `Supprimer « ${esc(t.name)} » et tout son contenu${others ? ` pour vous et ${plural(others, "autre voyageur")}` : ""} ?`
          : `Quitter « ${esc(t.name)} » ? Il disparaîtra de vos voyages.`}
        <button class="btn small danger" data-act="del-trip-yes" type="button">${owner ? "Supprimer" : "Quitter"}</button>
        <button class="btn small" data-act="cancel-confirm" type="button">Annuler</button>
      </div>`
    : `<div class="hero-actions"><button class="btn ghost small danger" data-act="del-trip" type="button">${owner ? "Supprimer ce voyage" : "Quitter ce voyage"}</button></div>`;

  return `<section class="hero">
    <a class="trip-back" href="#voyages">← Mes voyages</a>
    <h1><input id="tripName" value="${esc(t.name)}" maxlength="200" aria-label="Nom du voyage"></h1>
    <div class="stats">
      ${start ? `<span><b>${esc(fmtDay(start))}</b> → <b>${esc(fmtDay(end))}</b></span>` : ""}
      <span><b>${stops.length}</b> étape${stops.length > 1 ? "s" : ""}</span>
      <span><b>${plural(totalNights, "nuit")}</b></span>
      <span><b>${legs.length}</b> trajet${legs.length > 1 ? "s" : ""}</span>
      ${budget ? `<span><b>${esc(fmtMoney(budget, t.currency || "EUR"))}</b></span>` : ""}
    </div>
    ${tripPending(t) ? `<span class="todo-alert">${tripPending(t)} chose${tripPending(t) > 1 ? "s" : ""} à réserver</span>` : ""}
    ${isEnabled() ? `<p class="sync-note${sync.status === "error" ? " is-error" : ""}" id="syncNote" role="status">${esc(syncNote(travellers(t)))}</p>` : ""}
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
