// Séjour : un seul lieu, et le programme jour par jour
//
// Même format de données qu'un road trip (synchronisation, fusion et billets inchangés) :
// trip.kind = "sejour", une seule étape (le lieu), les trajets avant elle (aller) et après (retour).
// Les activités sont les « todos » de l'étape : { id, text, done, book, date, time, how, maps, tickets }.

import { esc, safeUrl, fmtDay, fmtHour, toDate, needsBooking } from "../utils.js";
import { state } from "../store.js";
import { stopCard, stopForm, newStop } from "./stop.js";
import { transportCard, transportForm } from "./transport.js";
import { todoTickets, todoTicketButton } from "./tickets.js";
import { dateRange, bookBox, doneLabel } from "./checklist.js";

const MAX_DAYS = 60;

// Le lieu du séjour et sa place dans la liste des éléments
export function sejourStop(t) {
  const idx = t.items.findIndex((i) => i.type === "stop");
  return { stop: idx >= 0 ? t.items[idx] : null, idx };
}

// Jours du séjour, de l'arrivée au départ (AAAA-MM-JJ)
export function sejourDays(stop) {
  if (!stop || !stop.arrive) return [];
  const days = [];
  const d = toDate(stop.arrive);
  const end = stop.depart && stop.depart >= stop.arrive ? stop.depart : stop.arrive;
  for (let s = stop.arrive; s <= end && days.length < MAX_DAYS; ) {
    days.push(s);
    d.setDate(d.getDate() + 1);
    s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return days;
}

// Activités d'un jour, par heure (celles sans heure à la fin, dans l'ordre d'ajout)
const byTime = (a, b) => (a.time || "99").localeCompare(b.time || "99");

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
    ${program(stop)}
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

// ---------- Programme ----------
function program(stop) {
  const todos = stop.todos || [];
  const days = sejourDays(stop);
  const inDays = new Set(days);
  const loose = todos.filter((x) => !inDays.has(x.date));

  const dayBlocks = days.map((d, i) => dayBlock(stop, `Jour ${i + 1}`, fmtDay(d), d, todos.filter((x) => x.date === d).sort(byTime), {
    arrive: i === 0 ? stop.arriveTime : "",
    depart: i === days.length - 1 && stop.depart === d ? stop.departTime : "",
  })).join("");
  return `<h2 class="sj-title">Programme jour par jour</h2>
    ${days.length ? "" : `<p class="note">Ajoutez les dates d'arrivée et de départ dans « Le lieu » pour avoir un programme par jour.</p>`}
    ${dayBlocks}
    ${loose.length || !days.length ? dayBlock(stop, days.length ? "Pas encore de jour" : "Activités", "", "", loose.sort(byTime)) : ""}`;
}

// moves : heure d'arrivée (premier jour) et de départ (dernier jour), placées parmi les activités
function dayBlock(stop, title, sub, date, list, moves = {}) {
  const f = state.actForm;
  const adding = f && !f.todo && f.stop === stop.id && f.date === date;
  const move = (time, label) => ({ move: true, time, text: label });
  const rows = [...list, ...(moves.arrive ? [move(moves.arrive, "Arrivée")] : []), ...(moves.depart ? [move(moves.depart, "Départ")] : [])].sort(byTime);
  return `<section class="sj-day${date ? "" : " is-loose"}" aria-label="${esc(title)}${sub ? " " + esc(sub) : ""}">
    <div class="sj-day-head">
      <h3>${esc(title)}${sub ? ` <span>${esc(sub)}</span>` : ""}</h3>
      ${adding ? "" : `<button class="cl-add" data-act="act-add" data-stop="${esc(stop.id)}" data-date="${esc(date)}" type="button" aria-label="Ajouter une activité${sub ? " le " + esc(sub) : ""}" title="Ajouter une activité">+</button>`}
    </div>
    ${rows.length ? `<ul class="sj-acts">${rows.map((x) => x.move ? moveRow(x) : f && f.todo === x.id ? `<li>${activityForm(stop, x)}</li>` : activity(stop, x)).join("")}</ul>` : ""}
    ${list.length || adding || !date ? "" : `<p class="note">Rien de prévu pour l'instant.</p>`}
    ${adding ? activityForm(stop, { date }) : ""}
  </section>`;
}

// Arrivée ou départ du lieu : une ligne fixe, modifiable dans « Le lieu »
const moveRow = (x) => `<li class="sj-move"><time class="sj-time">${esc(fmtHour(x.time))}</time><span>${esc(x.text)}</span></li>`;

function activity(stop, x) {
  const maps = safeUrl(x.maps);
  return `<li class="sj-act${x.done ? " done" : needsBooking(x) ? "" : " is-free"}">
    <div class="sj-act-main">
      <label>
        <input type="checkbox" data-todo="${esc(x.id)}" data-stop="${esc(stop.id)}" id="todo-${esc(x.id)}"${x.done ? " checked" : ""} aria-label="${doneLabel(x)} : ${esc(x.text)}">
        ${x.time ? `<time class="sj-time">${esc(fmtHour(x.time))}</time>` : ""}
        <span class="sj-text">${esc(x.text)}</span>
      </label>
      <button class="cl-del" data-act="act-edit" data-stop="${esc(stop.id)}" data-todo="${esc(x.id)}" type="button" aria-label="Modifier « ${esc(x.text)} »" title="Modifier">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
      <button class="cl-del" data-act="todo-del" data-todo="${esc(x.id)}" data-stop="${esc(stop.id)}" type="button" aria-label="Supprimer « ${esc(x.text)} »" title="Supprimer">✕</button>
    </div>
    ${x.how || maps ? `<p class="sj-how">${x.how ? `<span><b>Y aller :</b> ${esc(x.how)}</span>` : ""}
      ${maps ? `<a class="cl-map" href="${esc(maps)}" target="_blank" rel="noopener noreferrer" aria-label="Voir « ${esc(x.text)} » sur la carte">Carte ↗</a>` : ""}</p>` : ""}
    <div class="sj-tk">${todoTicketButton(stop, x)}${todoTickets(stop, x)}</div>
  </li>`;
}

// Formulaire d'une activité (ajout dans un jour, ou modification)
function activityForm(stop, x) {
  const id = x.id || "new";
  return `<form class="sj-form" data-act-form="${esc(stop.id)}"${x.id ? ` data-todo="${esc(x.id)}"` : ""}>
    <label class="f full">Activité<input name="text" id="act-text-${esc(id)}" value="${esc(x.text || "")}" placeholder="Ex. Musée du Louvre, dîner chez Chartier…" maxlength="120" autocomplete="off" required></label>
    <label class="f">Jour<input type="date" name="date" id="act-date-${esc(id)}" value="${esc(x.date || "")}"${dateRange(stop)}></label>
    <label class="f">Heure<input type="time" name="time" id="act-time-${esc(id)}" value="${esc(x.time || "")}"></label>
    <label class="f full">Comment y aller<input name="how" id="act-how-${esc(id)}" value="${esc(x.how || "")}" placeholder="Ex. Métro 1, arrêt Palais-Royal, puis 5 min à pied" maxlength="200" autocomplete="off"></label>
    <label class="f full">Lien Google Maps<input name="maps" id="act-maps-${esc(id)}" value="${esc(x.maps || "")}" placeholder="Facultatif" inputmode="url" autocomplete="off"></label>
    <div class="f full">${bookBox("book", "act-book-" + id, x.id ? needsBooking(x) : false)}</div>
    <div class="form-actions">
      <button class="btn" data-act="act-cancel" type="button">Annuler</button>
      <button class="btn primary" type="submit">${x.id ? "Enregistrer" : "Ajouter"}</button>
    </div>
  </form>`;
}

// Lecture du formulaire : seuls les champs bien formés sont gardés
export function readActivityForm(f) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(f.time.value) ? f.time.value : "";
  return {
    text: f.text.value.trim().slice(0, 120),
    date: /^\d{4}-\d{2}-\d{2}$/.test(f.date.value) ? f.date.value : "",
    time,
    how: f.how.value.trim().slice(0, 200),
    maps: safeUrl(f.maps.value.trim()),
    book: f.book.checked,
  };
}

export const sejourStats = (t) => {
  const { stop } = sejourStop(t);
  return { days: sejourDays(stop).length, activities: stop ? (stop.todos || []).length : 0, place: stop ? stop.place : "" };
};
