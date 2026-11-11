// Checklist d'une étape : activités à faire et choses à réserver
// Chaque élément : { id, text, done, book, date, maps, tickets }. La date (AAAA-MM-JJ) est facultative.
// book: false = rien à réserver (pas de case) ; sinon à réserver : la case veut dire réservé, en rouge tant qu'elle n'est pas cochée.
// Une activité peut avoir ses billets (musée, excursion…) : voir views/tickets.js.

import { esc, safeUrl, fmtDay, byDate, needsBooking } from "../utils.js";
import { state } from "../store.js";
import { todoTickets, todoTicketButton } from "./tickets.js";

export const pending = (stop) => (stop.todos || []).filter((t) => needsBooking(t) && !t.done).length;
export const tripPending = (trip) => trip.items.filter((i) => i.type === "stop").reduce((n, s) => n + pending(s), 0);

// Case « à réserver » des formulaires d'activité (décochée par défaut)
export const bookBox = (name, id, on) =>
  `<label class="todo-book"><input type="checkbox" name="${name}" id="${esc(id)}"${on ? " checked" : ""}>À réserver</label>`;

// Devant une activité : la case « réservé » si elle est à réserver, sinon un simple point
export const bookMark = (stop, t) => needsBooking(t)
  ? `<input type="checkbox" data-todo="${esc(t.id)}" data-stop="${esc(stop.id)}" id="todo-${esc(t.id)}"${t.done ? " checked" : ""} aria-label="Réservé : ${esc(t.text)}">`
  : `<span class="cl-dot" aria-hidden="true"></span>`;
export const markClass = (t) => (!needsBooking(t) ? "is-free" : t.done ? "done" : "");

export function checklist(stop) {
  const todos = byDate(stop.todos);
  const toBook = todos.filter(needsBooking);
  const booked = toBook.length - pending(stop);
  const adding = state.todoAdding === stop.id;

  return `<section class="checklist" aria-label="Checklist de ${esc(stop.place || "l'étape")}">
    <div class="cl-head">
      <h3>À faire et à réserver</h3>
      ${toBook.length ? `<span class="cl-progress${booked === toBook.length ? " all" : ""}">${booked}/${toBook.length} réservé${booked > 1 ? "s" : ""}</span>` : ""}
      ${adding ? "" : `<button class="cl-add" data-act="todo-add" data-stop="${esc(stop.id)}" type="button" aria-label="Ajouter une activité" title="Ajouter une activité">+</button>`}
    </div>
    ${todos.length ? `<ul class="cl-list">${todos.map((t) => `
      <li class="${markClass(t)}">
        <label>
          ${bookMark(stop, t)}
          <span>${esc(t.text)}</span>
          ${t.date ? `<time class="cl-date" datetime="${esc(t.date)}">${esc(fmtDay(t.date))}</time>` : ""}
        </label>
        ${safeUrl(t.maps) ? `<a class="cl-map" href="${esc(safeUrl(t.maps))}" target="_blank" rel="noopener noreferrer" aria-label="Voir « ${esc(t.text)} » sur la carte" title="Ouvrir dans Google Maps">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>Carte</a>` : ""}
        ${todoTicketButton(stop, t)}
        <button class="cl-del" data-act="todo-del" data-todo="${esc(t.id)}" data-stop="${esc(stop.id)}" type="button" aria-label="Supprimer « ${esc(t.text)} »" title="Supprimer">✕</button>
        ${todoTickets(stop, t)}
      </li>`).join("")}</ul>` : adding ? "" : `<p class="note">Ajoutez les activités prévues et ce qu'il reste à réserver avec le bouton +.</p>`}
    ${adding ? `<form class="cl-form" data-todo-form="${esc(stop.id)}">
      <input name="text" id="todo-new-${esc(stop.id)}" placeholder="Ex. Visite du Christ Rédempteur, réserver le restaurant…" maxlength="120" autocomplete="off" required>
      <label class="todo-date">Date<input type="date" name="date" id="todo-date-${esc(stop.id)}"${dateRange(stop)}></label>
      <input name="maps" id="todo-maps-${esc(stop.id)}" placeholder="Lien Google Maps du lieu (facultatif)" inputmode="url" autocomplete="off" aria-label="Lien Google Maps du lieu">
      ${bookBox("book", "todo-book-" + stop.id, false)}
      <button class="btn primary small" type="submit">Ajouter</button>
      <button class="btn ghost small" data-act="todo-close" type="button">Fermer</button>
    </form>` : ""}
  </section>`;
}

// Bornes du champ date d'une activité : les dates de l'étape, quand elles sont connues
export const dateRange = (stop) =>
  `${stop.arrive ? ` min="${esc(stop.arrive)}"` : ""}${stop.depart ? ` max="${esc(stop.depart)}"` : ""}`;
