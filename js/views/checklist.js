// Checklist d'une étape : activités à faire et choses à réserver
// Chaque élément : { id, text, done, tickets }. Coché = réservé / fait.
// Une activité peut avoir ses billets (musée, excursion…) : voir views/tickets.js.

import { esc } from "../utils.js";
import { state } from "../store.js";
import { todoTickets, todoTicketButton } from "./tickets.js";

export const pending = (stop) => (stop.todos || []).filter((t) => !t.done).length;
export const tripPending = (trip) => trip.items.filter((i) => i.type === "stop").reduce((n, s) => n + pending(s), 0);

export function checklist(stop) {
  const todos = stop.todos || [];
  const done = todos.length - pending(stop);
  const adding = state.todoAdding === stop.id;

  return `<section class="checklist" aria-label="Checklist de ${esc(stop.place || "l'étape")}">
    <div class="cl-head">
      <h3>À faire et à réserver</h3>
      ${todos.length ? `<span class="cl-progress${done === todos.length ? " all" : ""}">${done}/${todos.length} réservé${done > 1 ? "s" : ""}</span>` : ""}
      ${adding ? "" : `<button class="cl-add" data-act="todo-add" data-stop="${esc(stop.id)}" type="button" aria-label="Ajouter une activité" title="Ajouter une activité">+</button>`}
    </div>
    ${todos.length ? `<ul class="cl-list">${todos.map((t) => `
      <li class="${t.done ? "done" : ""}">
        <label>
          <input type="checkbox" data-todo="${esc(t.id)}" data-stop="${esc(stop.id)}" id="todo-${esc(t.id)}"${t.done ? " checked" : ""}>
          <span>${esc(t.text)}</span>
        </label>
        ${todoTicketButton(stop, t)}
        <button class="cl-del" data-act="todo-del" data-todo="${esc(t.id)}" data-stop="${esc(stop.id)}" type="button" aria-label="Supprimer « ${esc(t.text)} »" title="Supprimer">✕</button>
        ${todoTickets(stop, t)}
      </li>`).join("")}</ul>` : adding ? "" : `<p class="note">Ajoutez les activités prévues et ce qu'il reste à réserver avec le bouton +.</p>`}
    ${adding ? `<form class="cl-form" data-todo-form="${esc(stop.id)}">
      <input name="text" id="todo-new-${esc(stop.id)}" placeholder="Ex. Visite du Christ Rédempteur, réserver le restaurant…" maxlength="120" autocomplete="off" required>
      <button class="btn primary small" type="submit">Ajouter</button>
      <button class="btn ghost small" data-act="todo-close" type="button">Fermer</button>
    </form>` : ""}
  </section>`;
}
