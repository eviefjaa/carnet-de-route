// Checklist d'une étape : activités à faire et choses à réserver
// Chaque élément : { id, text, done }. Coché = réservé / fait.

import { esc } from "../utils.js";
import { state } from "../store.js";

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
      ${adding ? "" : `<button class="cl-add" data-act="todo-add" data-stop="${stop.id}" type="button" aria-label="Ajouter une activité" title="Ajouter une activité">+</button>`}
    </div>
    ${todos.length ? `<ul class="cl-list">${todos.map((t) => `
      <li class="${t.done ? "done" : ""}">
        <label>
          <input type="checkbox" data-todo="${t.id}" data-stop="${stop.id}" id="todo-${t.id}"${t.done ? " checked" : ""}>
          <span>${esc(t.text)}</span>
        </label>
        <button class="cl-del" data-act="todo-del" data-todo="${t.id}" data-stop="${stop.id}" type="button" aria-label="Supprimer « ${esc(t.text)} »" title="Supprimer">✕</button>
      </li>`).join("")}</ul>` : adding ? "" : `<p class="note">Ajoutez les activités prévues et ce qu'il reste à réserver avec le bouton +.</p>`}
    ${adding ? `<form class="cl-form" data-todo-form="${stop.id}">
      <input name="text" id="todo-new-${stop.id}" placeholder="Ex. Visite du Christ Rédempteur, réserver le restaurant…" maxlength="120" autocomplete="off" required>
      <button class="btn primary small" type="submit">Ajouter</button>
      <button class="btn ghost small" data-act="todo-cancel" type="button">Terminer</button>
    </form>` : ""}
  </section>`;
}
