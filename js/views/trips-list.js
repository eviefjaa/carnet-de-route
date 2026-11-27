// Page « Mes voyages » : une carte par voyage avec un récapitulatif
// Un clic sur la carte ouvre le voyage (#voyage-<id>).

import { esc, nights, fmtMoney, toDate } from "../utils.js";
import { t, count, locale } from "../i18n.js";
import { countryName } from "../i18n-data.js";
import { state, tripStart, tripEnd, isOwner } from "../store.js";
import { computeBudget } from "../budget.js";
import { COUNTRIES } from "../data/countries.js";
import { tripPending } from "./checklist.js";
import { isEnabled } from "../cloud.js";
import { invitationsBlock } from "./share.js";
import { sejourStats } from "./sejour.js";
import { selectButtons, selectAttrs, selectBox, selectBar } from "./select.js";
import { toBookLink } from "./to-book.js";
import { stopCountryCode } from "../i18n-data.js";

// Premier écran d'un nouveau visiteur : ce que fait le site, et de quoi commencer tout de suite
function welcome() {
  return `<section class="page welcome">
    ${invitationsBlock()}
    <h1>${t("welcome.title")}</h1>
    <p class="lead">${t("welcome.lead")}</p>
    <div class="row-btns">
      <button class="btn primary big" data-act="new-trip" type="button">${t("welcome.firstTrip")}</button>
      <a class="btn big" href="#destinations">${t("welcome.findDestination")}</a>
    </div>
    ${isEnabled() && !state.user
      ? `<p class="note">${t("welcome.noAccount", { link: `<button class="link-btn" data-act="open-auth" data-mode="signup" type="button">${t("welcome.createAccount")}</button>` })}</p>`
      : ""}
  </section>`;
}

const DAY = 86400000;
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// État du voyage, affiché en pastille : en cours, à venir, terminé, sans dates
function status(start, end) {
  if (!start) return { key: "nodate", label: t("status.nodate"), order: 2 };
  const today = todayStr();
  if (today < start) {
    const n = Math.round((toDate(start) - toDate(today)) / DAY);
    return { key: "upcoming", label: n === 1 ? t("status.tomorrow") : count(n, "status.inDays"), order: 1, sort: start };
  }
  if (today <= end) return { key: "now", label: t("status.now"), order: 0, sort: start };
  return { key: "past", label: t("status.past"), order: 3, sort: end };
}

function fmtRange(start, end) {
  const opts = { day: "numeric", month: "short" };
  const a = toDate(start), b = toDate(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString(locale(), sameYear ? opts : { ...opts, year: "numeric" });
  const right = b.toLocaleDateString(locale(), { ...opts, year: "numeric" });
  return start === end ? right : `${left} → ${right}`;
}

// Codes des pays traversés (d'après les étapes ou le pays choisi à la création), ex. « BR · AR »
function flagsOf(trip, stops) {
  const codes = new Set();
  if (trip.country) codes.add(trip.country);
  stops.forEach((s) => {
    const c = stopCountryCode(s);
    if (c) codes.add(c);
  });
  return [...codes].filter((c) => /^[A-Z]{2}$/.test(c)).slice(0, 4).join(" · ");
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

// Une carte seule (pour remplacer une confirmation annulée sans réafficher la liste, voir js/swipe.js)
export const tripCard = (id) => (state.trips[id] ? card(summary(id, state.trips[id])) : "");

function card(s) {
  const { id, trip } = s;
  const owner = isOwner(trip);
  const name = trip.name || t("trip.untitled");
  // Confirmation après la poubelle (une suppression efface aussi les billets, sans retour possible)
  if (state.confirm === "swipe:" + id) {
    return `<div class="swipe is-confirm"><div class="trip-card swipe-confirm" role="group" aria-label="${t("common.confirmation")}">
      <p>${esc(owner ? t("trip.deleteAsk", { name }) : t("trip.leaveAsk", { name }))}</p>
      <div class="row-btns">
        <button class="btn danger-solid" data-act="swipe-delete-yes" data-trip="${esc(id)}" type="button">${owner ? t("common.delete") : t("common.leave")}</button>
        <button class="btn" data-act="swipe-cancel" type="button">${t("common.cancel")}</button>
      </div>
    </div></div>`;
  }

  // Mode sélection : toucher la carte la coche (voir js/events.js), sans ouvrir le voyage ni glisser
  if (state.selecting) {
    const on = state.selected.has(id);
    return `<article class="trip-card is-${s.status.key} is-selectable${on ? " is-selected" : ""}" ${selectAttrs(id)}>
      ${selectBox(id, name)}
      ${cardBody(s, esc(name))}
    </article>`;
  }

  // Glisser vers la gauche fait apparaître la poubelle : la carte et la poubelle sont côte à côte
  // dans un bandeau qui défile horizontalement (défilement natif du téléphone, voir js/swipe.js)
  return `<div class="swipe">
    <article class="trip-card is-${s.status.key}">
    ${cardBody(s, `<a class="tc-link" href="#voyage-${esc(id)}">${esc(name)}</a>`)}
  </article>
    <button class="swipe-action" data-act="swipe-delete" data-trip="${esc(id)}" type="button" aria-label="${esc(owner ? t("trip.deleteNamed", { name }) : t("trip.leaveNamed", { name }))}">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
      <span>${owner ? t("common.delete") : t("common.leave")}</span>
    </button>
  </div>`;
}

// Contenu de la carte ; title : le nom du voyage, déjà échappé (lien, ou texte en mode sélection)
function cardBody(s, title) {
  const { trip, stops } = s;
  const places = stops.map((x) => x.place).filter(Boolean);
  const route = places.length > 4 ? [...places.slice(0, 3), `+${places.length - 3}`] : places;
  const dots = stops.slice(0, 12).map(() => "<i></i>").join("");
  return `<div class="tc-top">
      <span class="tc-status">${esc(s.status.label)}</span>
      ${(trip.members || []).length > 1 ? `<span class="tc-shared">${t("trips.shared", { n: trip.members.length })}</span>` : ""}
      <span class="tc-flags" aria-hidden="true">${flagsOf(trip, stops)}</span>
    </div>
    <h2>${title}</h2>
    <p class="tc-dates">${s.start ? esc(fmtRange(s.start, s.end)) : t("trips.noDates")}</p>
    ${route.length ? `<p class="tc-route">${route.map(esc).join(" <span>→</span> ")}</p>` : `<p class="tc-route empty-route">${t("trips.noStops")}</p>`}
    ${tripPending(trip) ? (state.selecting
      ? `<span class="todo-alert">${esc(t("trips.toBook", { n: tripPending(trip) }))}</span>`
      : toBookLink(s.id, tripPending(trip), t("trips.toBook", { n: tripPending(trip) }))) : ""}
    ${dots ? `<div class="tc-dots" aria-hidden="true">${dots}</div>` : ""}
    <dl class="tc-stats">
      ${trip.kind === "sejour"
        ? `<div><dt>${t("trips.statSejour")}</dt><dd>${count(sejourStats(trip).activities, "count.activity")}</dd></div>`
        : `<div><dt>${t("trips.statStops")}</dt><dd>${stops.length}</dd></div>`}
      <div><dt>${t("trips.statNights")}</dt><dd>${s.nights}</dd></div>
      <div><dt>${t("trips.statBudget")}</dt><dd>${s.budget ? esc(fmtMoney(s.budget, trip.currency || "EUR")) : "–"}</dd></div>
    </dl>`;
}

export function tripsListView() {
  const all = Object.entries(state.trips).map(([id, trip]) => summary(id, trip));
  all.sort((a, b) => {
    if (a.status.order !== b.status.order) return a.status.order - b.status.order;
    if (a.status.key === "past") return b.status.sort.localeCompare(a.status.sort); // plus récent d'abord
    if (a.status.sort && b.status.sort) return a.status.sort.localeCompare(b.status.sort); // plus proche d'abord
    return (b.trip.createdAt || 0) - (a.trip.createdAt || 0);
  });

  if (!all.length) return welcome();

  const sel = state.selecting;
  return `<section class="page${sel ? " is-selecting" : ""}">
    <header class="page-head trips-head">
      <div>
        <h1>${t("page.trips")}</h1>
        <p class="lead">${count(all.length, "count.trip")}</p>
      </div>
      ${selectButtons(all.map((s) => s.id), `<button class="btn primary" data-act="new-trip" type="button">${t("trips.new")}</button>`)}
    </header>
    ${sel ? "" : invitationsBlock()}
    <div class="trip-grid">
      ${all.map(card).join("")}
      ${sel ? "" : `<div class="trip-card new-card">
        <button class="new-card-btn" data-act="new-trip" type="button">
          <span class="plus" aria-hidden="true">+</span>
          <b>${t("trips.newShort")}</b>
        </button>
        <span class="note">${t("trips.orInspire", { link: `<a href="#destinations">${t("trips.inspireLink")}</a>` })}</span>
      </div>`}
    </div>
    ${sel ? selectionBar(all) : ""}
  </section>`;
}

// Barre du bas en mode sélection : nombre de voyages cochés, puis suppression avec confirmation
function selectionBar(all) {
  const picked = all.filter((s) => state.selected.has(s.id));
  // Les voyages partagés par quelqu'un d'autre ne sont pas supprimés : on les quitte
  const del = picked.filter((s) => isOwner(s.trip)).length;
  const leave = picked.length - del;
  const parts = [];
  if (del) parts.push(count(del, "trips.selDelete"));
  if (leave) parts.push(count(leave, "trips.selLeave"));
  const question = parts.join(t("common.and"));
  return selectBar(picked.length, {
    picked: "trips.picked",
    hint: t("trips.selHint"),
    question: esc(t("trips.selQuestion", { what: question.charAt(0).toUpperCase() + question.slice(1) })),
    yesAct: "select-delete-yes",
    yesLabel: del ? t("common.delete") : t("common.leave"),
  });
}

// Création d'un voyage : road trip (plusieurs étapes) ou séjour (un lieu, programme par jour)
export function newTripView(code) {
  const c = code ? COUNTRIES.find((x) => x.code === code) : null;
  const choice = (kind, title, text, icon) => `<button class="kind-card" data-act="create-trip" data-kind="${kind}"${c ? ` data-country="${esc(c.code)}"` : ""} type="button">
      <svg class="kind-icon" viewBox="0 0 64 32" width="64" height="32" aria-hidden="true">${icon}</svg>
      <b>${title}</b>
      <span>${text}</span>
    </button>`;
  return `<section class="page new-trip">
    <a class="trip-back" href="#voyages">${t("trips.back")}</a>
    <header class="page-head">
      <h1>${c ? esc(t("newTrip.titleIn", { country: countryName(c.code) })) : t("newTrip.title")}</h1>
      <p class="lead">${t("newTrip.lead")}</p>
    </header>
    <div class="kind-grid">
      ${choice("road", t("newTrip.road"), t("newTrip.roadText"),
        `<path d="M8 22 C20 6, 30 28, 44 12 S58 14, 58 14" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/><circle cx="8" cy="22" r="4"/><circle cx="31" cy="17" r="4"/><circle cx="56" cy="12" r="4"/>`)}
      ${choice("sejour", t("newTrip.sejour"), t("newTrip.sejourText"),
        `<path d="M13 4a9 9 0 0 1 9 9c0 7-9 15-9 15s-9-8-9-15a9 9 0 0 1 9-9z" fill="currentColor"/><circle cx="13" cy="13" r="3" fill="var(--surface)"/>`)}
    </div>
    <p class="note">${t("newTrip.note")}</p>
  </section>`;
}
