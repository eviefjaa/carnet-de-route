// Page « Mes voyages » : une carte par voyage avec un récapitulatif
// Un clic sur la carte ouvre le voyage (#voyage-<id>).

import { esc, nights, plural, fmtMoney, toDate } from "../utils.js";
import { state, tripStart, tripEnd } from "../store.js";
import { computeBudget } from "../budget.js";
import { COUNTRIES, flag } from "../data/countries.js";
import { tripPending } from "./checklist.js";

const DAY = 86400000;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// État du voyage, affiché en pastille : en cours, à venir, terminé, sans dates
function status(start, end) {
  if (!start) return { key: "nodate", label: "Dates à définir", order: 2 };
  const today = todayStr();
  if (today < start) {
    const n = Math.round((toDate(start) - toDate(today)) / DAY);
    return { key: "upcoming", label: n === 1 ? "Demain" : `Dans ${n} jours`, order: 1, sort: start };
  }
  if (today <= end) return { key: "now", label: "En cours", order: 0, sort: start };
  return { key: "past", label: "Terminé", order: 3, sort: end };
}

function fmtRange(start, end) {
  const opts = { day: "numeric", month: "short" };
  const a = toDate(start), b = toDate(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString("fr-FR", sameYear ? opts : { ...opts, year: "numeric" });
  const right = b.toLocaleDateString("fr-FR", { ...opts, year: "numeric" });
  return start === end ? right : `${left} → ${right}`;
}

// Drapeaux des pays traversés (d'après les étapes ou le pays choisi à la création)
function flagsOf(trip, stops) {
  const codes = new Set();
  if (trip.country) codes.add(trip.country);
  stops.forEach((s) => {
    const c = COUNTRIES.find((x) => x.name === s.country);
    if (c) codes.add(c.code);
  });
  return [...codes].slice(0, 4).map(flag).join(" ");
}

function summary(id, trip) {
  const stops = trip.items.filter((i) => i.type === "stop");
  const start = tripStart(trip), end = tripEnd(trip);
  return {
    id, trip, stops,
    start, end,
    status: status(start, end),
    nights: stops.reduce((s, i) => s + (nights(i.arrive, i.depart) || 0), 0),
    budget: computeBudget(trip).total.total,
  };
}

function card(s) {
  const { id, trip, stops } = s;
  const places = stops.map((x) => x.place).filter(Boolean);
  const route = places.length > 4 ? [...places.slice(0, 3), `+${places.length - 3}`] : places;
  const dots = stops.slice(0, 12).map(() => "<i></i>").join("");

  return `<article class="trip-card is-${s.status.key}">
    <div class="tc-top">
      <span class="tc-status">${esc(s.status.label)}</span>
      ${(trip.members || []).length > 1 ? `<span class="tc-shared">Partagé · ${trip.members.length}</span>` : ""}
      <span class="tc-flags" aria-hidden="true">${flagsOf(trip, stops)}</span>
    </div>
    <h2><a class="tc-link" href="#voyage-${esc(id)}">${esc(trip.name || "Sans titre")}</a></h2>
    <p class="tc-dates">${s.start ? esc(fmtRange(s.start, s.end)) : "Pas encore de dates"}</p>
    ${route.length ? `<p class="tc-route">${route.map(esc).join(" <span>→</span> ")}</p>` : `<p class="tc-route empty-route">Aucune étape pour l'instant</p>`}
    ${tripPending(trip) ? `<span class="todo-alert">${tripPending(trip)} à réserver</span>` : ""}
    ${dots ? `<div class="tc-dots" aria-hidden="true">${dots}</div>` : ""}
    <dl class="tc-stats">
      <div><dt>Étapes</dt><dd>${stops.length}</dd></div>
      <div><dt>Nuits</dt><dd>${s.nights}</dd></div>
      <div><dt>Budget</dt><dd>${s.budget ? esc(fmtMoney(s.budget, trip.currency || "EUR")) : "—"}</dd></div>
    </dl>
  </article>`;
}

export function tripsListView() {
  const all = Object.entries(state.trips).map(([id, t]) => summary(id, t));
  all.sort((a, b) => {
    if (a.status.order !== b.status.order) return a.status.order - b.status.order;
    if (a.status.key === "past") return b.status.sort.localeCompare(a.status.sort); // plus récent d'abord
    if (a.status.sort && b.status.sort) return a.status.sort.localeCompare(b.status.sort); // plus proche d'abord
    return (b.trip.createdAt || 0) - (a.trip.createdAt || 0);
  });

  return `<section class="page">
    <header class="page-head trips-head">
      <div>
        <h1>Mes voyages</h1>
        <p class="lead">${all.length ? plural(all.length, "voyage") : "Vos voyages apparaîtront ici."}</p>
      </div>
      <button class="btn primary" data-act="new-trip" type="button">+ Nouveau voyage</button>
    </header>
    <div class="trip-grid">
      ${all.map(card).join("")}
      <button class="trip-card new-card" data-act="new-trip" type="button">
        <span class="plus" aria-hidden="true">+</span>
        <b>Nouveau voyage</b>
        <span class="note">Ou inspirez-vous des destinations</span>
      </button>
    </div>
    ${all.length ? "" : `<p class="note">En manque d'idées ? <a href="#destinations">Choisir une destination</a></p>`}
  </section>`;
}
