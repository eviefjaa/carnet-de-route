// Carte du voyage (Leaflet + OpenStreetMap) : étapes numérotées reliées dans l'ordre.
// Trajets en voiture ou en bus : tracé de la route (routes.js) ; autres : ligne droite.
//
// Plein écran : en CSS (l'API Fullscreen ne marche pas sur iPhone pour une carte). La carte,
// son bouton et le bandeau des étapes sont dans un même conteneur, créé une fois et déplacé
// dans la page à chaque affichage : un redessin ne ferme donc ni le plein écran ni le bandeau.

import { esc, MODES, duration, fmtDay, nights } from "./utils.js";
import { t, count, locale } from "./i18n.js";
import { state, currentTrip, tripStart } from "./store.js";
import { renderGeoNote } from "./geocode.js";
import { ROAD_MODES, roadRoute, decodeLine, onRouteReady } from "./routes.js";
import { mapStrip } from "./views/map-strip.js";

// Un tracé vient d'arriver : on redessine si ce voyage est affiché
onRouteReady((tripId) => {
  if (state.view === "trip" && tripId === state.currentId && mapEl && mapEl.isConnected) drawMap();
});

let map = null, layer = null, mapEl = null, lastFit = "";
let wrap = null, stage = null, fullBtn = null, stripBox = null, stripBtn = null;
let markers = new Map(); // numéro de l'étape → marqueur (voyage comme publication)
let frame = [];          // points du cadrage (étapes)
let redrawing = false;   // pendant un redessin, les popups qui se ferment ne retirent pas la surbrillance
let scrollY = 0;         // position de la page à l'ouverture du plein écran

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const ICON_OPEN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;
const chevron = (down) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${down ? "m6 9 6 6 6-6" : "m6 15 6-6 6 6"}"/></svg>`;

function ensureMap() {
  if (!window.L) return false;
  if (!map) {
    wrap = document.createElement("div");
    wrap.className = "map-wrap";
    wrap.innerHTML = `<div class="map-stage" aria-label="${t("trip.mapLabel")}">
      <button class="map-btn map-full-btn" type="button"></button>
      <button class="map-btn map-strip-btn" type="button"></button>
      <div class="map-strip-box"></div>
    </div>`;
    stage = wrap.firstElementChild;
    fullBtn = stage.querySelector(".map-full-btn");
    stripBtn = stage.querySelector(".map-strip-btn");
    stripBox = stage.querySelector(".map-strip-box");
    mapEl = document.createElement("div");
    mapEl.id = "map";
    stage.prepend(mapEl);
    map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.setView([20, 0], 2);
    bindFull();
  }
  return true;
}

// Carte d'un voyage (par défaut le voyage affiché) ; une publication est dessinée avec le
// tracé publié (raccourci aux deux bouts), sans placement automatique (positions déjà arrondies)
export function drawMap(trip = currentTrip(), { published = false } = {}) {
  if (!trip) return;

  // La carte est créée une seule fois puis déplacée dans la page à chaque affichage
  const slot = document.getElementById("mapSlot");
  if (slot) {
    if (!ensureMap()) {
      slot.innerHTML = `<p class="note">${t("map.unavailable")}</p>`;
      return;
    }
    slot.replaceWith(wrap);
  } else if (!mapEl || !mapEl.isConnected) {
    return;
  }

  redrawing = true;
  layer.clearLayers();
  markers = new Map();
  const strip = []; // étapes du bandeau
  const start = published ? null : tripStart(trip);
  const color = cssVar("--route") || "#e8a800";
  const points = [];
  const tripId = published ? null : state.currentId;
  const at = (g) => (g && typeof g.lat === "number" ? [g.lat, g.lng] : null);
  // Bout d'un trajet sans étape de ce côté (ex. vol depuis Prague au début du voyage) : petit point
  const end = (ll, name) => {
    layer.addLayer(L.circleMarker(ll, { radius: 5, color, weight: 2, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(esc(name || "")));
    points.push(ll);
    return ll;
  };
  // cur : dernière position connue ; leg : trajet en attente de son point d'arrivée
  let n = 0, cur = null, leg = null;
  const stopPts = []; // cadrage : sur les étapes (un vol depuis l'Europe ne réduit pas le Brésil à un point)
  const closeLeg = (to) => { if (cur && to) layer.addLayer(segment(cur, to, leg, color, tripId)); };

  trip.items.forEach((it) => {
    if (it.type === "transport") {
      // Deux trajets de suite : le premier s'arrête à son lieu d'arrivée (ou au départ du suivant)
      if (leg) {
        const to = at(leg.toGeo) || at(it.fromGeo);
        if (to) { closeLeg(to); cur = end(to, leg.to); }
      }
      if (!cur && at(it.fromGeo)) cur = end(at(it.fromGeo), it.from);
      leg = it;
      return;
    }
    n++;
    const ll = at(it.geo);
    strip.push({ n, place: it.place, line: stopLine(it, start), placed: !!ll });
    if (ll) {
      const m = marker(it, n, ll);
      markers.set(n, m);
      layer.addLayer(m);
      closeLeg(ll);
      cur = ll;
      points.push(ll);
      stopPts.push(ll);
    }
    leg = null;
  });
  // Le voyage finit par un trajet (retour en avion…) : jusqu'à son lieu d'arrivée
  if (leg && at(leg.toGeo)) { closeLeg(at(leg.toGeo)); end(at(leg.toGeo), leg.to); }

  // Bandeau des étapes (plein écran) : seulement s'il y a plus d'une étape
  wrap.classList.toggle("has-strip", strip.length > 1);
  if (strip.length > 1) {
    const left = stripBox.firstElementChild ? stripBox.firstElementChild.scrollLeft : 0;
    stripBox.innerHTML = mapStrip(strip, state.mapActiveStop);
    stripBox.firstElementChild.scrollLeft = left;
  } else {
    stripBox.innerHTML = "";
  }
  if (!markers.has(state.mapActiveStop)) state.mapActiveStop = null;
  showFull();
  redrawing = false;
  // La page a été redessinée derrière : le focus revient dans la carte en plein écran
  if (state.mapFull && !stage.contains(document.activeElement)) fullBtn.focus({ preventScroll: true });
  // Étape en surbrillance : sa popup reste ouverte après le redessin, sans déplacer la carte
  const active = markers.get(state.mapActiveStop);
  if (active && state.mapFull) {
    active.getPopup().options.autoPan = false;
    active.openPopup();
    active.getPopup().options.autoPan = true;
  }

  // Recadre la carte seulement si les points ont changé ; sur les étapes s'il y en a au moins deux.
  // En plein écran, jamais : on ne déplace pas la carte qu'on est en train de regarder.
  frame = stopPts.length > 1 ? stopPts : points;
  const key = JSON.stringify(frame);
  setTimeout(() => {
    map.invalidateSize();
    if (key === lastFit) return;
    lastFit = key;
    if (!state.mapFull) fit();
  }, 0);

  if (!published) renderGeoNote();
}

// Cadrage sur les étapes ; en plein écran, rien sous le bouton ✕ ni sous le bandeau
function fit() {
  const bottom = state.mapFull && wrap.classList.contains("has-strip") && !state.mapStripHidden ? stripBox.offsetHeight : 0;
  const pad = state.mapFull ? { paddingTopLeft: [36, 64], paddingBottomRight: [36, bottom + 36] } : { padding: [36, 36] };
  if (frame.length > 1) map.fitBounds(frame, pad);
  else if (frame.length === 1) map.setView(frame[0], 10);
}

// « Jour 3 · 2 nuits », « Jour 5 · arrêt » (publication : son jour ; voyage : depuis le début du voyage)
function stopLine(it, start) {
  const day = it.day || (it.arrive && start ? nights(start, it.arrive) + 1 : null);
  const nb = it.nights ?? nights(it.arrive, it.depart);
  return [day ? t("program.day", { n: +day }) : "", nb === 0 ? t("map.halt") : nb ? count(nb, "count.night") : ""].filter(Boolean).join(" · ");
}

// ---------- Plein écran ----------
// Boutons et bandeau tels que l'état les décrit (appelé à chaque affichage)
function showFull() {
  const full = !!state.mapFull;
  wrap.classList.toggle("is-full", full);
  document.body.classList.toggle("map-full-open", full);
  if (full) {
    stage.setAttribute("role", "dialog");
    stage.setAttribute("aria-modal", "true");
  } else {
    stage.removeAttribute("role");
    stage.removeAttribute("aria-modal");
  }
  fullBtn.innerHTML = full ? ICON_CLOSE : ICON_OPEN;
  fullBtn.setAttribute("aria-label", full ? t("map.exitFull") : t("map.full"));
  fullBtn.title = fullBtn.getAttribute("aria-label");
  const hidden = !!state.mapStripHidden;
  wrap.classList.toggle("strip-hidden", hidden);
  stripBtn.innerHTML = chevron(!hidden);
  stripBtn.setAttribute("aria-expanded", String(!hidden));
  stripBtn.setAttribute("aria-label", hidden ? t("map.showStops") : t("map.hideStops"));
  stripBtn.title = stripBtn.getAttribute("aria-label");
  stripBox.hidden = hidden;
  // Hauteur du bandeau : les boutons et l'attribution de la carte se placent au-dessus
  stage.style.setProperty("--strip-h", `${full && wrap.classList.contains("has-strip") && !hidden ? stripBox.offsetHeight : 0}px`);
}

export function openFullMap() {
  if (!map || state.mapFull) return;
  scrollY = window.scrollY;
  wrap.style.height = `${wrap.offsetHeight}px`; // la page derrière garde sa hauteur
  state.mapFull = true;
  showFull();
  map.scrollWheelZoom.enable();
  history.pushState({ mapFull: true }, ""); // Retour du téléphone : ferme le plein écran
  map.invalidateSize();
  fit();
  fullBtn.focus();
}

// back : fermé par Retour (l'entrée de l'historique est déjà retirée)
export function closeFullMap({ back = false } = {}) {
  if (!state.mapFull) return;
  state.mapFull = false;
  showFull();
  wrap.style.height = "";
  map.scrollWheelZoom.disable();
  map.invalidateSize(); // même zoom, même position
  window.scrollTo(0, scrollY);
  fullBtn.focus();
  if (!back && history.state && history.state.mapFull) history.back();
}

function select(n) {
  state.mapActiveStop = n;
  stripBox.querySelectorAll(".ms-stop").forEach((b) => {
    const on = +b.dataset.n === n;
    b.classList.toggle("is-active", on);
    if (on) b.setAttribute("aria-current", "true");
    else b.removeAttribute("aria-current");
  });
}

function bindFull() {
  fullBtn.addEventListener("click", () => (state.mapFull ? closeFullMap() : openFullMap()));
  stripBtn.addEventListener("click", () => {
    state.mapStripHidden = !state.mapStripHidden;
    showFull();
    map.invalidateSize();
  });
  // Toucher une étape du bandeau : la carte s'y rend, sans dézoomer si on est déjà plus près
  stripBox.addEventListener("click", (e) => {
    const b = e.target.closest(".ms-stop");
    const m = b && markers.get(+b.dataset.n);
    if (!m) return;
    select(+b.dataset.n);
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 10), { duration: 0.8 });
    map.once("moveend", () => m.openPopup());
  });
  // Bandeau : flèches gauche et droite d'une étape à l'autre ; molette verticale = défilement horizontal
  stripBox.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const list = [...stripBox.querySelectorAll(".ms-stop")];
    const i = list.indexOf(document.activeElement);
    const next = list[Math.min(list.length - 1, Math.max(0, (i < 0 ? 0 : i) + (e.key === "ArrowRight" ? 1 : -1)))];
    if (!next) return;
    e.preventDefault();
    next.focus();
    next.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
  stripBox.addEventListener("wheel", (e) => {
    const s = stripBox.firstElementChild;
    if (!s || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    s.scrollLeft += e.deltaY;
  }, { passive: false });
  // Toucher un point : son étape en surbrillance, centrée dans le bandeau ; fermer la popup la retire
  map.on("popupopen", (e) => {
    const n = [...markers].find(([, m]) => m.getPopup() === e.popup)?.[0];
    if (!n) return;
    select(n);
    const b = stripBox.querySelector(`.ms-stop[data-n="${n}"]`);
    if (b && state.mapFull) b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  });
  map.on("popupclose", (e) => {
    if (redrawing) return;
    const m = markers.get(state.mapActiveStop);
    if (m && m.getPopup() === e.popup) select(null);
  });
  // Échap, Retour du téléphone ; changement de page : le plein écran se ferme
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.mapFull) closeFullMap();
  });
  window.addEventListener("popstate", () => {
    if (state.mapFull && !(history.state && history.state.mapFull)) closeFullMap({ back: true });
  });
  window.addEventListener("hashchange", () => {
    if (state.mapFull) closeFullMap({ back: true });
    state.mapActiveStop = null; // autre voyage ou publication : d'autres étapes
  });
  // Fenêtre modale : le focus ne sort pas de la carte
  document.addEventListener("focusin", (e) => {
    if (state.mapFull && stage.isConnected && !stage.contains(e.target)) fullBtn.focus();
  });
}

function marker(it, n, ll) {
  const nb = it.nights ?? nights(it.arrive, it.depart);
  // Publication : « Jour 3 » au lieu des dates
  const dates = it.day ? t("program.day", { n: +it.day }) : `${it.arrive ? esc(fmtDay(it.arrive)) : ""}${it.depart ? " → " + esc(fmtDay(it.depart)) : ""}`;
  const popup = `<b>${n}. ${esc(it.place)}</b><br>${dates}${nb === 0 ? ` · ${t("map.halt")}` : nb ? " · " + count(nb, "count.night") : ""}`;
  return L.marker(ll, {
    title: it.place,
    icon: L.divIcon({ className: "pin", html: `<span>${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] }),
  }).bindPopup(popup);
}

function segment(from, to, leg, color, tripId) {
  const road = !!tripId && leg && ROAD_MODES.has(leg.mode);
  const route = road ? roadRoute(tripId, leg, from, to) : null;
  // Publication : tracé sans ses deux bouts, relié aux étapes (arrondies) par une ligne droite
  const published = !tripId && leg && leg.line ? decodeLine(leg.line) : null;
  const line = L.polyline(route ? decodeLine(route.line) : published ? [from, ...published, to] : [from, to], {
    color,
    weight: 4,
    // Tracé de la route en cours de calcul : ligne droite plus discrète en attendant
    opacity: road && !route && !(leg.route && leg.route.none) ? 0.4 : 0.9,
    dashArray: leg && leg.mode === "avion" ? "6 9" : null, // vols en pointillés
  });
  if (leg) {
    const d = leg.duration ?? duration(leg.dep, leg.arr);
    const dist = route ? route.km : published ? leg.km : null;
    const km = dist != null && Number.isFinite(+dist) ? ` · ${t("map.byRoad", { km: (+dist).toLocaleString(locale()) })}` : "";
    line.bindTooltip(`${esc(MODES[leg.mode] || t("leg.generic"))}${d ? " · " + esc(d) : ""}${esc(km)}`, { sticky: true });
  }
  return line;
}
