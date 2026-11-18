// Activités d'une étape : ce qui reste à réserver, et les petits éléments communs au programme
// (views/program.js) et au formulaire de l'étape. Chaque activité : { id, text, done, book, date, time, how, maps, tickets }.
// book: false = rien à réserver (pas de case) ; sinon à réserver : la case veut dire réservé, en rouge tant qu'elle n'est pas cochée.
// Une activité peut avoir ses billets (musée, excursion…) : voir views/tickets.js.

import { esc, needsBooking } from "../utils.js";
import { t } from "../i18n.js";

export const pending = (stop) => (stop.todos || []).filter((x) => needsBooking(x) && !x.done).length;
export const tripPending = (trip) => trip.items.filter((i) => i.type === "stop").reduce((n, s) => n + pending(s), 0);

// « À réserver » des formulaires d'activité : une case, affichée comme une pastille à côté de la date (désactivée par défaut)
export const bookBox = (name, id, on) =>
  `<label class="todo-book"><input type="checkbox" name="${name}" id="${esc(id)}"${on ? " checked" : ""}><span>${t("act.toBook")}</span></label>`;

// Devant une activité : la case « réservé » si elle est à réserver, sinon un simple point
export const bookMark = (stop, x) => needsBooking(x)
  ? `<input type="checkbox" data-todo="${esc(x.id)}" data-stop="${esc(stop.id)}" id="todo-${esc(x.id)}"${x.done ? " checked" : ""} aria-label="${esc(t("act.bookedNamed", { name: x.text }))}">`
  : `<span class="cl-dot" aria-hidden="true"></span>`;
export const markClass = (x) => (!needsBooking(x) ? "is-free" : x.done ? "done" : "");

// Bornes du champ date d'une activité : les dates de l'étape, quand elles sont connues
export const dateRange = (stop) =>
  `${stop.arrive ? ` min="${esc(stop.arrive)}"` : ""}${stop.depart ? ` max="${esc(stop.depart)}"` : ""}`;
