// Tracé des routes pour les trajets en voiture ou en bus
//
// Service : OSRM d'OpenStreetMap (routing.openstreetmap.de), gratuit et sans clé, à utiliser
// avec modération : une demande à la fois, une par seconde, et chaque tracé est enregistré
// dans le trajet (leg.route) pour ne pas le redemander. Le tracé complet (≈ 30 Ko pour
// 500 km) est simplifié à environ 150 m près avant d'être enregistré (quelques Ko).
// Les autres modes (train, avion, bateau…) restent en ligne droite.

import { state, save } from "./store.js";

export const ROAD_MODES = new Set(["voiture", "bus"]);
const API = "https://routing.openstreetmap.de/routed-car/route/v1/driving/";
// Point recalé à plus de 20 km de l'étape : pas de route possible (océan entre les deux…)
const MAX_SNAP = 20000;

const queue = [];
let busy = false;
let onDone = () => {};
export const onRouteReady = (fn) => (onDone = fn);

// Clé du tracé : départ et arrivée arrondis (environ 100 m)
export const routeKey = (from, to) => [...from, ...to].map((x) => x.toFixed(3)).join(",");

// Tracé connu pour ce trajet entre ces deux points, sinon null (et demandé en arrière-plan)
export function roadRoute(tripId, leg, from, to) {
  const key = routeKey(from, to);
  if (leg.route && leg.route.key === key) return leg.route.none ? null : leg.route;
  if (!queue.some((q) => q.leg === leg.id && q.key === key)) queue.push({ tripId, leg: leg.id, key, from, to });
  run();
  return null;
}

async function run() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    const route = await fetchRoute(job.from, job.to);
    const leg = state.trips[job.tripId]?.items.find((i) => i.id === job.leg);
    // Hors ligne ou service indisponible : on réessaiera au prochain affichage
    if (leg && route !== undefined) {
      leg.route = route ? { key: job.key, ...route } : { key: job.key, none: true };
      save();
      onDone(job.tripId);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }
  busy = false;
}

// { line, km, min }, null si aucune route, undefined si le service n'a pas répondu
async function fetchRoute([lat1, lng1], [lat2, lng2]) {
  try {
    const res = await fetch(`${API}${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=polyline`);
    if (!res.ok) return undefined;
    const data = await res.json();
    const r = data.routes && data.routes[0];
    if (data.code !== "Ok" || !r) return null;
    if ((data.waypoints || []).some((w) => w.distance > MAX_SNAP)) return null;
    return { line: encodeLine(simplify(decodeLine(r.geometry), 0.0015)), km: Math.round(r.distance / 1000), min: Math.round(r.duration / 60) };
  } catch {
    return undefined;
  }
}

// Tracé encodé (format « polyline » de Google, précision 5) → liste de [lat, lng]
export function decodeLine(str) {
  const points = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const k of [0, 1]) {
      let shift = 0, result = 0, b;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function encodeLine(points) {
  let out = "", lat = 0, lng = 0;
  const enc = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    while (v >= 0x20) { out += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; }
    out += String.fromCharCode(v + 63);
  };
  for (const [a, b] of points) {
    const la = Math.round(a * 1e5), lo = Math.round(b * 1e5);
    enc(la - lat); enc(lo - lng);
    lat = la; lng = lo;
  }
  return out;
}

// Simplification de Douglas-Peucker : garde les points qui s'écartent de plus de « tol » degrés
export function simplify(points, tol) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ya, xa] = points[a], [yb, xb] = points[b];
    const dx = xb - xa, dy = yb - ya, len = Math.hypot(dx, dy) || 1e-12;
    let far = -1, farD = tol;
    for (let i = a + 1; i < b; i++) {
      const [y, x] = points[i];
      const d = Math.abs(dy * x - dx * y + xb * ya - yb * xa) / len;
      if (d > farD) { far = i; farD = d; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
