// Copie publique d'un voyage, pour une publication
//
// On ne garde que l'essentiel : étapes, activités, trajets et carte.
// Les dates deviennent « Jour 1, Jour 2… » (ne pas révéler quand on est absent de chez soi),
// et les positions sont arrondies à environ 2 km (une adresse d'hébergement ne doit pas se
// deviner sur la carte). Jamais publiés : prix, notes, adresses, liens de réservation,
// billets, numéros de réservation, co-voyageurs, tracés de route précis.

import { MODES, nights, duration } from "./utils.js";
import { tripStart, tripEnd } from "./store.js";

const round = (x) => Math.round(x * 50) / 50; // 1/50 de degré ≈ 2 km

export function publicCopy(trip) {
  const start = tripStart(trip);
  const end = tripEnd(trip);
  const day = (date) => (date && start ? nights(start, date.slice(0, 10)) + 1 : null);

  const items = trip.items.map((it) =>
    it.type === "stop"
      ? {
          type: "stop",
          place: String(it.place || "").slice(0, 120),
          country: String(it.country || "").slice(0, 60),
          day: day(it.arrive),
          nights: nights(it.arrive, it.depart),
          geo: it.geo && typeof it.geo.lat === "number" ? { lat: round(it.geo.lat), lng: round(it.geo.lng) } : null,
          todos: (it.todos || []).map((t) => String(t.text || "").slice(0, 120)).filter(Boolean).slice(0, 30),
        }
      : {
          type: "transport",
          mode: MODES[it.mode] ? it.mode : "autre",
          from: String(it.from || "").slice(0, 120),
          to: String(it.to || "").slice(0, 120),
          day: day(it.dep),
          duration: duration(it.dep, it.arr),
        }
  );

  const stops = items.filter((i) => i.type === "stop");
  // Pas de nom de voyage : la publication a son propre titre
  return {
    country: /^[A-Z]{2}$/.test(trip.country || "") ? trip.country : "",
    days: start && end ? nights(start, end) + 1 : null,
    nights: stops.reduce((n, s) => n + (s.nights || 0), 0),
    items,
  };
}
