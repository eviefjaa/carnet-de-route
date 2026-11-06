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

// Carte d'un voyage (par défaut le voyage affiché) ; une publication est dessinée avec le
// tracé publié (raccourci aux deux bouts), sans placement automatique (positions déjà arrondies)
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
  const closeLeg = (to) => { if (cur && to) layer.addLayer(segment(cur, to, leg, color, tripId)); };

  t.items.forEach((it) => {
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
    if (ll) {
      layer.addLayer(marker(it, n, ll));
      closeLeg(ll);
      cur = ll;
      points.push(ll);
    }
    leg = null;
  });
  // Le voyage finit par un trajet (retour en avion…) : jusqu'à son lieu d'arrivée
  if (leg && at(leg.toGeo)) { closeLeg(at(leg.toGeo)); end(at(leg.toGeo), leg.to); }

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
  const popup = `<b>${n}. ${esc(it.place)}</b><br>${dates}${nb === 0 ? " · arrêt" : nb ? " · " + plural(nb, "nuit") : ""}`;
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
    const km = dist != null && Number.isFinite(+dist) ? ` · ${(+dist).toLocaleString("fr-FR")} km par la route` : "";
    line.bindTooltip(`${esc(MODES[leg.mode] || "Trajet")}${d ? " · " + esc(d) : ""}${esc(km)}`, { sticky: true });
  }
  return line;
}
