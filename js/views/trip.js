// Page d'un voyage : en-tête, résumé, carte et itinéraire

import { esc, fmtDay, nights, fmtMoney } from "../utils.js";
import { t, count } from "../i18n.js";
import { countryName } from "../i18n-data.js";
import { state, currentTrip, tripStart, tripEnd, isOwner, sync } from "../store.js";
import { stopCard, stopForm } from "./stop.js";
import { transportCard, transportForm } from "./transport.js";
import { insertRow } from "./actions.js";
import { budgetSection } from "./budget.js";
import { computeBudget } from "../budget.js";
import { drawMap } from "../map.js";
import { scheduleGeo } from "../geocode.js";
import { authScreen, renderAccountBar, syncNote, verifyScreen } from "./auth.js";
import { isEnabled } from "../cloud.js";
import { renderSidebar } from "./sidebar.js";
import { exploreView, filterCountries, countryView, favoritesView, detailsReady, loadDetails } from "./explore.js";
import { profileView, settingsView } from "./pages.js";
import { prefs } from "../prefs.js";
import { tripsListView, newTripView } from "./trips-list.js";
import { sejourView, sejourStats } from "./sejour.js";
import { tripPending } from "./checklist.js";
import { shareSection, travellers } from "./share.js";
import { feedView, discoverView, personView, postView, loadedPostTrip, publishPanel, socialTitle, notificationsView, markNotificationsSeen, networkView, NETWORK_PAGES, favoritePostsSection, countryPostsSection } from "./social.js";
import { refreshNotifications } from "../social.js";
import { countryByCode } from "../data/countries.js";

// Titre de l'onglet et description de chaque page (clés meta.<page>.title et meta.<page>.desc)
const META_PAGES = ["trips", "explore", "favorites", "profile", "settings", "feed", "discover", "publications", "notifications"];
const pageMeta = (view) => {
  const v = META_PAGES.includes(view) ? view : "trips";
  return [t(`page.${v}`), t(`meta.${v}`)];
};

function setMeta() {
  const trip = state.view === "trip" ? currentTrip() : null;
  const country = state.view === "country" ? countryByCode(state.country) : null;
  const [title, description] =
    state.authOpen ? [t("meta.auth.title"), t("meta.auth")]
    : state.verifyOpen && state.user && !state.user.emailVerified ? [t("meta.verify.title"), t("meta.verify")]
    : trip ? [trip.name || t("meta.trip.title"), t("meta.trips")]
    : country ? [countryName(country.code), country.tagline]
    : ["person", "post"].includes(state.view) ? socialTitle()
    : state.view === "network" ? [NETWORK_PAGES[state.networkTab] || t("page.profile"), t("meta.profile")]
    : pageMeta(state.view);
  document.title = `${title} · ${t("app.name")}`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
}

// Met à jour l'état de la synchronisation sans tout réafficher (garde la saisie en cours)
export function renderSync() {
  renderAccountBar();
  const note = document.getElementById("syncNote");
  const trip = currentTrip();
  if (note && trip) {
    note.textContent = syncNote(travellers(trip));
    note.classList.toggle("is-error", sync.status === "error");
  }
}

export function render() {
  setMeta();
  renderAccountBar();
  renderSidebar();
  const app = document.getElementById("app");
  const busy = state.authOpen || state.loading;
  document.getElementById("wrap").classList.toggle("wide", ["trips", "explore", "country", "favorites", "feed", "discover", "person", "publications"].includes(state.view) && !busy);

  if (state.authOpen) {
    app.innerHTML = authScreen();
    return;
  }
  if (state.loading) {
    app.innerHTML = `<p class="note">${t("trip.loadingTrips")}</p>`;
    return;
  }
  if (state.verifyOpen && state.user && !state.user.emailVerified) {
    app.innerHTML = verifyScreen();
    return;
  }

  switch (state.view) {
    case "trips":
      app.innerHTML = tripsListView();
      return;
    case "newTrip":
      app.innerHTML = newTripView(state.newCountry);
      return;
    case "explore":
      app.innerHTML = exploreView();
      filterCountries();
      return;
    case "country":
      app.innerHTML = countryView(state.country, countryPostsSection(state.country));
      // Première fiche ouverte : on affiche la version courte, puis la version détaillée
      if (!detailsReady()) loadDetails().then(() => state.view === "country" && !state.authOpen && render());
      return;
    case "favorites":
      app.innerHTML = favoritesView(prefs.favorites, favoritePostsSection());
      return;
    case "feed":
      app.innerHTML = feedView();
      return;
    case "discover":
      app.innerHTML = discoverView();
      return;
    case "publications":
      app.innerHTML = networkView("mes-publications");
      return;
    case "network":
      app.innerHTML = networkView(state.networkTab);
      return;
    case "notifications":
      app.innerHTML = notificationsView();
      // Liste rechargée si elle date de plus de 30 secondes, puis tout est marqué comme lu
      if (state.user && (!state.notifs || Date.now() - state.notifs.at > 30000)) refreshNotifications();
      else if (state.notifs) markNotificationsSeen();
      return;
    case "person":
      app.innerHTML = personView(state.personId);
      return;
    case "post": {
      app.innerHTML = postView(state.postId);
      const trip = loadedPostTrip(state.postId);
      if (trip) drawMap(trip, { published: true });
      return;
    }
    case "profile":
      app.innerHTML = profileView();
      return;
    case "settings":
      app.innerHTML = settingsView();
      return;
  }

  // Page d'un voyage (#voyage-<id>)
  if (state.tripId) state.currentId = state.tripId;
  const trip = currentTrip();
  if (!trip) {
    app.innerHTML = `<div class="empty">
      <h2>${t("trip.notFound")}</h2>
      <p class="note">${!state.user && isEnabled() ? t("trip.notFoundSignIn")
        : state.user && !state.user.emailVerified ? t("trip.notFoundVerify")
          : t("trip.notFoundGone")}</p>
      ${!state.user && isEnabled()
        ? `<button class="btn primary" data-act="open-auth" data-mode="signin" type="button">${t("auth.signIn")}</button>`
        : `<a class="btn primary" href="#voyages">${t("trip.seeMyTrips")}</a>`}
    </div>`;
    return;
  }

  const stops = trip.items.filter((i) => i.type === "stop");
  app.innerHTML = hero(trip) + shareSection(trip) + (stops.length ? mapSection() : "") + (trip.items.length ? budgetSection(trip) : "") + (trip.kind === "sejour" ? sejourView(trip) : itinerary(trip));
  drawMap();
  scheduleGeo();
  if (state.focusName) {
    state.focusName = false;
    const input = document.getElementById("tripName");
    if (input) { input.focus(); input.select(); }
  }
}

function hero(trip) {
  const stops = trip.items.filter((i) => i.type === "stop");
  const legs = trip.items.filter((i) => i.type === "transport");
  const totalNights = stops.reduce((s, i) => s + (nights(i.arrive, i.depart) || 0), 0);
  const start = tripStart(trip), end = tripEnd(trip);
  const budget = computeBudget(trip).total.total;
  const name = trip.name;

  // Seul le créateur supprime le voyage ; les autres voyageurs peuvent le quitter
  const owner = isOwner(trip);
  const others = travellers(trip) - 1;
  const del = state.confirm === "trip"
    ? `<div class="confirm">${esc(owner
          ? (others ? t("trip.deleteAskShared", { name, others: count(others, "count.otherTraveller") }) : t("trip.deleteAsk", { name }))
          : t("trip.leaveAsk", { name }))}
        <button class="btn small danger" data-act="del-trip-yes" type="button">${owner ? t("common.delete") : t("common.leave")}</button>
        <button class="btn small" data-act="cancel-confirm" type="button">${t("common.cancel")}</button>
      </div>`
    : `<div class="hero-actions"><button class="btn ghost small danger" data-act="del-trip" type="button">${owner ? t("trip.deleteThis") : t("trip.leaveThis")}</button></div>`;
  const pending = tripPending(trip);

  return `<section class="hero">
    <a class="trip-back" href="#voyages">${t("trips.back")}</a>
    <h1><input id="tripName" value="${esc(trip.name)}" maxlength="200" aria-label="${t("trip.nameLabel")}"></h1>
    ${trip.source ? `<p class="trip-source">${t("trip.inspiredBy", { who: `<a href="#publication-${esc(trip.source.postId)}">@${esc(trip.source.ownerHandle)}</a>` })}</p>` : ""}
    <div class="stats">
      ${start ? `<span><b>${esc(fmtDay(start))}</b> → <b>${esc(fmtDay(end))}</b></span>` : ""}
      ${trip.kind === "sejour" ? sejourHeroStats(trip, totalNights) : `<span>${count(stops.length, "trip.statStops")}</span>
      <span><b>${count(totalNights, "count.night")}</b></span>
      <span>${count(legs.length, "trip.statLegs")}</span>`}
      ${budget ? `<span><b>${esc(fmtMoney(budget, trip.currency || "EUR"))}</b></span>` : ""}
    </div>
    ${pending ? `<span class="todo-alert">${count(pending, "trip.toBook")}</span>` : ""}
    ${kindLine(trip, stops.length)}
    ${isEnabled() ? `<p class="sync-note${sync.status === "error" ? " is-error" : ""}" id="syncNote" role="status">${esc(syncNote(travellers(trip)))}</p>` : ""}
    ${publishPanel(trip)}
    ${del}
  </section>`;
}

function sejourHeroStats(trip, totalNights) {
  const s = sejourStats(trip);
  return `${s.days ? `<span><b>${count(s.days, "count.day")}</b></span>` : ""}
      <span><b>${count(totalNights, "count.night")}</b></span>
      <span><b>${count(s.activities, "count.activity")}</b></span>`;
}

// Type du voyage, et passage de l'un à l'autre (un séjour n'a qu'un lieu)
function kindLine(trip, nStops) {
  if (trip.kind === "sejour") return `<p class="kind-line">${t("trip.kindSejour")} · <button class="link-btn" data-act="set-kind" data-kind="road" type="button">${t("trip.toRoad")}</button></p>`;
  return nStops <= 1 ? `<p class="kind-line">${t("trip.kindRoad")} · <button class="link-btn" data-act="set-kind" data-kind="sejour" type="button">${t("trip.toSejour")}</button></p>` : "";
}

function mapSection() {
  return `<section class="map-box" aria-label="${t("trip.mapLabel")}">
    <div id="mapSlot"></div>
    <p id="geoNote" class="note"></p>
  </section>`;
}

function itinerary(trip) {
  let html = `<section class="route" aria-label="${t("trip.itinerary")}">` + insertRow(0, !trip.items.length);
  trip.items.forEach((it, idx) => {
    const editing = state.editingId === it.id;
    if (it.type === "stop") html += editing ? stopForm(it) : stopCard(it, trip, idx);
    else html += editing ? transportForm(it) : transportCard(it, trip, idx);
    html += insertRow(idx + 1);
  });
  if (!trip.items.length && !state.insertAt) html += `<p class="note">${t("trip.startHint")}</p>`;
  return html + `</section>`;
}
