// Carte du voyage (Leaflet + OpenStreetMap) : étapes numérotées reliées dans l'ordre.
// Trajets en voiture ou en bus : tracé de la route (routes.js) ; autres : ligne droite.

import { esc, MODES, duration, fmtDay, nights, plural } from "./utils.js";
import { state, currentTrip } from "./store.js";
import { renderGeoNote } from "./geocode.js";
import { ROAD_MODES, roadRoute, decodeLine, onRouteReady } from "./routes.js";

// Un tracé vient d'arriver : on redessine si ce voyage est affiché
onRouteReady((tripId) => {
  if (state.view === "trip" && tripId === state.currentId && mapEl && mapEl.isConnected) drawMap();
});

let map = null, layer = null, mapEl = null, lastFit = "";

const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function ensureMap() {
  if (!window.L) return false;
  if (!map) {
    mapEl = document.createElement("div");
    mapEl.id = "map";
    map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.setView([20, 0], 2);
  }
  return true;
}

// Carte d'un voyage (par défaut le voyage affiché) ; une publication est dessinée sans
// tracé de route ni placement automatique (positions déjà arrondies)
export function drawMap(t = currentTrip(), { published = false } = {}) {
  if (!t) return;

  // La carte est créée une seule fois puis déplacée dans la page à chaque affichage
  const slot = document.getElementById("mapSlot");
  if (slot) {
    if (!ensureMap()) {
      slot.innerHTML = `<p class="note">Carte indisponible : vérifiez votre connexion internet.</p>`;
      return;
    }
    slot.replaceWith(mapEl);
  } else if (!mapEl || !mapEl.isConnected) {
    return;
  }

  layer.clearLayers();
  const color = cssVar("--route") || "#e8a800";
  const points = [];
  let n = 0, prev = null, leg = null;

  t.items.forEach((it) => {
    if (it.type === "transport") { leg = it; return; }
    n++;
    if (it.geo && typeof it.geo.lat === "number") {
      const ll = [it.geo.lat, it.geo.lng];
      layer.addLayer(marker(it, n, ll));
      if (prev) layer.addLayer(segment(prev, ll, leg, color, published ? null : state.currentId));
      prev = ll;
      points.push(ll);
    }
    leg = null;
  });

  // Recadre la carte seulement si les points ont changé
  const key = JSON.stringify(points);
  setTimeout(() => {
    map.invalidateSize();
    if (key === lastFit) return;
    lastFit = key;
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36] });
    else if (points.length === 1) map.setView(points[0], 10);
  }, 0);

  if (!published) renderGeoNote();
}

function marker(it, n, ll) {
  const nb = it.nights ?? nights(it.arrive, it.depart);
  // Publication : « Jour 3 » au lieu des dates
  const dates = it.day ? `Jour ${+it.day}` : `${it.arrive ? esc(fmtDay(it.arrive)) : ""}${it.depart ? " → " + esc(fmtDay(it.depart)) : ""}`;
  const popup = `<b>${n}. ${esc(it.place)}</b><br>${dates}${nb ? " · " + plural(nb, "nuit") : ""}`;
  return L.marker(ll, {
    title: it.place,
    icon: L.divIcon({ className: "pin", html: `<span>${n}</span>`, iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14] }),
  }).bindPopup(popup);
}

function segment(from, to, leg, color, tripId) {
  const road = !!tripId && leg && ROAD_MODES.has(leg.mode);
  const route = road ? roadRoute(tripId, leg, from, to) : null;
  const line = L.polyline(route ? decodeLine(route.line) : [from, to], {
    color,
    weight: 4,
    // Tracé de la route en cours de calcul : ligne droite plus discrète en attendant
    opacity: road && !route && !(leg.route && leg.route.none) ? 0.4 : 0.9,
    dashArray: leg && leg.mode === "avion" ? "6 9" : null, // vols en pointillés
  });
  if (leg) {
    const d = leg.duration ?? duration(leg.dep, leg.arr);
    const km = route ? ` · ${route.km.toLocaleString("fr-FR")} km par la route` : "";
    line.bindTooltip(`${esc(MODES[leg.mode] || "Trajet")}${d ? " · " + esc(d) : ""}${km}`, { sticky: true });
  }
  return line;
}
