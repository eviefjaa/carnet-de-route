// Copie publique d'un voyage, pour une publication
//
// On ne garde que l'essentiel : étapes, activités, trajets et carte.
// Séjour : le programme est publié jour par jour (jour, heure, activité, comment y aller).
// Les dates deviennent « Jour 1, Jour 2… » (ne pas révéler quand on est absent de chez soi),
// et les positions sont arrondies à environ 2 km (une adresse d'hébergement ne doit pas se
// deviner sur la carte). Le tracé des routes est publié sans ses 2 premiers et 2 derniers
// kilomètres, qui mèneraient à l'adresse exacte de l'étape. Jamais publiés : prix, notes,
// adresses, liens de réservation, billets, numéros de réservation, co-voyageurs.

import { MODES, nights, duration, byDate } from "./utils.js";
import { tripStart, tripEnd } from "./store.js";
import { COUNTRIES } from "./data/countries.js";
import { ROAD_MODES, routeKey, decodeLine, encodeLine } from "./routes.js";

const round = (x) => Math.round(x * 50) / 50; // 1/50 de degré ≈ 2 km
const roundGeo = (g) => (g && Number.isFinite(g.lat) && Number.isFinite(g.lng) ? { lat: round(g.lat), lng: round(g.lng) } : null);
const TRIM = 2000; // mètres de route retirés à chaque bout

// Distance en mètres entre deux points [lat, lng]
function meters([a, b], [c, d]) {
  const r = Math.PI / 180;
  const x = (d - b) * r * Math.cos(((a + c) / 2) * r), y = (c - a) * r;
  return Math.hypot(x, y) * 6371000;
}
// Retire « m » mètres au début du tracé (null s'il ne reste rien)
function trimStart(points, m) {
  let done = 0;
  for (let i = 1; i < points.length; i++) {
    done += meters(points[i - 1], points[i]);
    if (done >= m) return points.slice(i);
  }
  return null;
}
// Bouts d'un trajet, comme sur la carte (map.js) : l'étape voisine, sinon le lieu du trajet
// lui-même (dernier trajet du voyage qui finit sans étape, vol depuis Prague…)
function legEnds(items, i) {
  const leg = items[i], before = items[i - 1], after = items[i + 1];
  const from = before?.type === "stop" ? before.geo : leg.fromGeo || (before?.type === "transport" ? before.toGeo : null);
  const to = after?.type === "stop" ? after.geo : leg.toGeo || (after?.type === "transport" ? after.fromGeo : null);
  return [from, to];
}
// Tracé public d'un trajet par la route : seulement s'il relie bien ses deux bouts actuels
function publicLine(leg, [from, to]) {
  const r = leg.route;
  const ok = (g) => g && Number.isFinite(g.lat) && Number.isFinite(g.lng);
  if (!ROAD_MODES.has(leg.mode) || !r || r.none || typeof r.line !== "string" || !ok(from) || !ok(to)) return null;
  if (r.key !== routeKey([from.lat, from.lng], [to.lat, to.lng])) return null;
  const head = trimStart(decodeLine(r.line), TRIM);
  const middle = head && trimStart(head.reverse(), TRIM);
  return middle && middle.length >= 2 ? encodeLine(middle.reverse()) : null;
}

const withLine = (line, route) => (line ? { line, km: Number.isFinite(+route.km) ? Math.round(+route.km) : null } : {});

export function publicCopy(trip) {
  const start = tripStart(trip);
  const end = tripEnd(trip);
  const day = (date) => (date && start ? nights(start, date.slice(0, 10)) + 1 : null);
  const sejour = trip.kind === "sejour";

  const items = trip.items.map((it, i) =>
    it.type === "stop"
      ? {
          type: "stop",
          place: String(it.place || "").slice(0, 120),
          country: String(it.country || "").slice(0, 60),
          day: day(it.arrive),
          nights: nights(it.arrive, it.depart),
          geo: roundGeo(it.geo),
          todos: byDate(it.todos).map((t) => String(t.text || "").slice(0, 120)).filter(Boolean).slice(0, 30),
          ...(sejour ? { program: (it.todos || []).filter((t) => t.text).slice(0, 60).map((t) => ({
            text: String(t.text).slice(0, 120),
            day: day(t.date),
            time: /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time || "") ? t.time : "",
            how: String(t.how || "").slice(0, 200),
          })) } : {}),
        }
      : {
          type: "transport",
          mode: MODES[it.mode] ? it.mode : "autre",
          from: String(it.from || "").slice(0, 120),
          to: String(it.to || "").slice(0, 120),
          day: day(it.dep),
          duration: duration(it.dep, it.arr),
          // Lieux du trajet, arrondis eux aussi (carte : vol qui part d'une ville qui n'est pas une étape)
          fromGeo: roundGeo(it.fromGeo),
          toGeo: roundGeo(it.toGeo),
          ...withLine(publicLine(it, legEnds(trip.items, i)), it.route),
        }
  );

  const stops = items.filter((i) => i.type === "stop");
  const country = /^[A-Z]{2}$/.test(trip.country || "") ? trip.country : "";
  // Pays traversés (codes) : le pays choisi à la création et ceux des étapes, pour les fiches pays
  const countries = [...new Set([country, ...stops.map((s) => COUNTRIES.find((c) => c.name === s.country)?.code)].filter(Boolean))].slice(0, 10);
  // Pas de nom de voyage : la publication a son propre titre
  return {
    ...(sejour ? { kind: "sejour" } : {}),
    country,
    countries,
    days: start && end ? nights(start, end) + 1 : null,
    nights: stops.reduce((n, s) => n + (s.nights || 0), 0),
    items,
  };
}
