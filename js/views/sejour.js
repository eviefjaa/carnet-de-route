// Séjour : un seul lieu, et le programme jour par jour
//
// Même format de données qu'un road trip (synchronisation, fusion et billets inchangés) :
// trip.kind = "sejour", une seule étape (le lieu), les trajets avant elle (aller) et après (retour).
// Les activités sont les « todos » de l'étape : { id, text, done, book, date, time, how, maps, tickets }.

import { state } from "../store.js";
import { t } from "../i18n.js";
import { stopCard, stopForm, newStop } from "./stop.js";
import { transportCard, transportForm } from "./transport.js";
import { stopDays, sejourProgram } from "./program.js";

// Le lieu du séjour et sa place dans la liste des éléments
export function sejourStop(trip) {
  const idx = trip.items.findIndex((i) => i.type === "stop");
  return { stop: idx >= 0 ? trip.items[idx] : null, idx };
}

// Jours du séjour, de l'arrivée au départ (AAAA-MM-JJ)
export const sejourDays = stopDays;

export function sejourView(trip) {
  const { stop, idx } = sejourStop(trip);
  const pos = idx >= 0 ? idx : trip.items.length;
  const legs = (from, to) => trip.items.slice(from, to).map((it, k) => legHtml(trip, it, from + k)).join("");

  // Pas encore de lieu : on commence par lui (le formulaire est ouvert d'office)
  if (!stop) {
    if (!state.insertAt || state.insertAt.draft.type !== "stop") state.insertAt = { pos, draft: newStop() };
    return `<section class="route sejour" aria-label="${t("trip.kindSejour")}">
      ${stopForm(state.insertAt.draft, true, { sejour: true })}
      <p class="note">${t("sejour.startHint")}</p>
    </section>`;
  }
  return `<section class="route sejour" aria-label="${t("trip.kindSejour")}">
    <h2 class="sj-title">${t("sejour.out")}</h2>
    ${legs(0, pos)}
    ${legSlot(pos, t("sejour.addOut"))}
    <h2 class="sj-title">${t("sejour.place")}</h2>
    ${state.editingId === stop.id ? stopForm(stop, false, { sejour: true }) : stopCard(stop, trip, idx, { sejour: true })}
    ${sejourProgram(stop)}
    <h2 class="sj-title">${t("sejour.back")}</h2>
    ${legs(idx + 1, trip.items.length)}
    ${legSlot(trip.items.length, t("sejour.addBack"))}
  </section>`;
}

function legHtml(trip, it, i) {
  if (it.type !== "transport") return ""; // une autre étape (voyage passé de road trip à séjour) : non affichée
  return state.editingId === it.id ? transportForm(it) : transportCard(it, trip, i);
}

// Bouton d'ajout d'un trajet, ou son formulaire s'il est ouvert à cette position
function legSlot(pos, label) {
  if (state.insertAt && state.insertAt.pos === pos && state.insertAt.draft.type === "transport") return transportForm(state.insertAt.draft, true);
  return `<div class="insert"><button class="btn" data-act="add-leg" data-pos="${pos}" type="button">${label}</button></div>`;
}

export const sejourStats = (trip) => {
  const { stop } = sejourStop(trip);
  return { days: sejourDays(stop).length, activities: stop ? (stop.todos || []).length : 0, place: stop ? stop.place : "" };
};
