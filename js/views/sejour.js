// Séjour : un seul lieu, et le programme jour par jour
//
// Même format de données qu'un road trip (synchronisation, fusion et billets inchangés) :
// trip.kind = "sejour", une seule étape (le lieu), les trajets avant elle (aller) et après (retour).
// Les activités sont les « todos » de l'étape : { id, text, done, book, date, time, how, maps, tickets }.

import { state } from "../store.js";
import { stopCard, stopForm, newStop } from "./stop.js";
import { transportCard, transportForm } from "./transport.js";
import { stopDays, sejourProgram } from "./program.js";

// Le lieu du séjour et sa place dans la liste des éléments
export function sejourStop(t) {
  const idx = t.items.findIndex((i) => i.type === "stop");
  return { stop: idx >= 0 ? t.items[idx] : null, idx };
}

// Jours du séjour, de l'arrivée au départ (AAAA-MM-JJ)
export const sejourDays = stopDays;

export function sejourView(t) {
  const { stop, idx } = sejourStop(t);
  const pos = idx >= 0 ? idx : t.items.length;
  const legs = (from, to) => t.items.slice(from, to).map((it, k) => legHtml(t, it, from + k)).join("");

  // Pas encore de lieu : on commence par lui (le formulaire est ouvert d'office)
  if (!stop) {
    if (!state.insertAt || state.insertAt.draft.type !== "stop") state.insertAt = { pos, draft: newStop() };
    return `<section class="route sejour" aria-label="Séjour">
      ${stopForm(state.insertAt.draft, true, { sejour: true })}
      <p class="note">Indiquez la ville, les dates et l'hébergement : le programme jour par jour apparaît ensuite.</p>
    </section>`;
  }
  return `<section class="route sejour" aria-label="Séjour">
    <h2 class="sj-title">Aller</h2>
    ${legs(0, pos)}
    ${legSlot(pos, "+ Trajet aller")}
    <h2 class="sj-title">Le lieu</h2>
    ${state.editingId === stop.id ? stopForm(stop, false, { sejour: true }) : stopCard(stop, t, idx, { sejour: true })}
    ${sejourProgram(stop)}
    <h2 class="sj-title">Retour</h2>
    ${legs(idx + 1, t.items.length)}
    ${legSlot(t.items.length, "+ Trajet retour")}
  </section>`;
}

function legHtml(t, it, i) {
  if (it.type !== "transport") return ""; // une autre étape (voyage passé de road trip à séjour) : non affichée
  return state.editingId === it.id ? transportForm(it) : transportCard(it, t, i);
}

// Bouton d'ajout d'un trajet, ou son formulaire s'il est ouvert à cette position
function legSlot(pos, label) {
  if (state.insertAt && state.insertAt.pos === pos && state.insertAt.draft.type === "transport") return transportForm(state.insertAt.draft, true);
  return `<div class="insert"><button class="btn" data-act="add-leg" data-pos="${pos}" type="button">${label}</button></div>`;
}

export const sejourStats = (t) => {
  const { stop } = sejourStop(t);
  return { days: sejourDays(stop).length, activities: stop ? (stop.todos || []).length : 0, place: stop ? stop.place : "" };
};
