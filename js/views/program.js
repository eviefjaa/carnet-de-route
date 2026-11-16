// Programme jour par jour d'un lieu : séjour (toujours déplié) ou étape d'un road trip (repliable)
//
// Les activités sont les « todos » de l'étape : { id, text, done, book, date, time, how, maps, tickets }.
// Un bloc par jour, de l'arrivée au départ ; les activités sans date, ou hors des dates, dans
// « Pas encore de jour » ; une étape sans dates n'a qu'un bloc « Activités ».

import { esc, safeUrl, fmtDay, fmtHour, toDate, needsBooking, plural, parsePrice, priceInput, hasPrice, fmtMoney } from "../utils.js";
import { state, currentTrip } from "../store.js";
import { todoTickets, todoTicketButton } from "./tickets.js";
import { dateRange, bookBox, bookMark, markClass, pending } from "./checklist.js";

const MAX_DAYS = 60;
// Prix des activités : dans la devise du voyage affiché
const money = (n) => fmtMoney(n, (currentTrip() || {}).currency || "EUR");
const activitiesTotal = (stop) => (stop.todos || []).reduce((s, x) => s + (hasPrice(x.price) ? x.price : 0), 0);

// Jours d'un lieu, de l'arrivée au départ (AAAA-MM-JJ) ; un seul pour un arrêt sans nuit
export function stopDays(stop) {
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
export const byTime = (a, b) => (a.time || "99").localeCompare(b.time || "99");

// Lignes « Arrivée » et « Départ » d'une étape de road trip : heure d'arrivée du trajet juste avant,
// heure de départ du trajet juste après ({ date, time }, vides sans trajet ou sans heure)
export function stopMoves(trip, idx) {
  const at = (s) => ({ date: (s || "").slice(0, 10), time: (s || "").slice(11, 16) });
  const before = trip.items[idx - 1], after = trip.items[idx + 1];
  return {
    arrive: before && before.type === "transport" ? at(before.arr) : {},
    depart: after && after.type === "transport" ? at(after.dep) : {},
  };
}

// Jours du programme, prêts à afficher : [{ title, sub, date, list, moves }]
// firstDay : numéro du premier jour (celui du voyage pour une étape de road trip)
// moves : { arrive: { date, time }, depart: { date, time } }, affichés le premier et le dernier jour
export function programDays(stop, { firstDay = 1, moves = {} } = {}) {
  const todos = stop.todos || [];
  const days = stopDays(stop);
  const inDays = new Set(days);
  const loose = todos.filter((x) => !inDays.has(x.date)).sort(byTime);
  const a = moves.arrive || {}, d = moves.depart || {};
  const out = days.map((day, i) => ({
    title: `Jour ${firstDay + i}`, sub: fmtDay(day), date: day,
    list: todos.filter((x) => x.date === day).sort(byTime),
    moves: {
      arrive: i === 0 && a.time && a.date === day ? a.time : "",
      depart: i === days.length - 1 && d.time && d.date === day ? d.time : "",
    },
  }));
  if (loose.length || !days.length) out.push({ title: days.length ? "Pas encore de jour" : "Activités", sub: "", date: "", list: loose, moves: {} });
  return out;
}

const daysHtml = (stop, opts) => programDays(stop, opts).map((x) => dayBlock(stop, x)).join("");

// Séjour : toujours déplié, sous son titre
export function sejourProgram(stop) {
  const days = stopDays(stop);
  return `<h2 class="sj-title">Programme jour par jour</h2>
    ${days.length ? "" : `<p class="note">Ajoutez les dates d'arrivée et de départ dans « Le lieu » pour avoir un programme par jour.</p>`}
    ${daysHtml(stop, { moves: { arrive: { date: days[0], time: stop.arriveTime }, depart: { date: stop.depart, time: stop.departTime } } })}`;
}

// Résumé du programme replié : « 5 activités sur 3 jours · 2 à réserver · 85 € »
export function programSummary(stop) {
  const n = (stop.todos || []).length;
  if (!n) return "rien de prévu";
  const days = stopDays(stop).length;
  const left = pending(stop);
  const cost = activitiesTotal(stop);
  return `${plural(n, "activité")}${days ? ` sur ${plural(days, "jour")}` : ""}${left ? ` · <span class="pg-pending">${left} à réserver</span>` : ""}${cost ? ` · ${esc(money(cost))}` : ""}`;
}

// Étape d'un road trip : repliée par défaut (ouverte ou fermée pour la session, state.programOpen)
export function stopProgram(stop, opts) {
  const open = state.programOpen.has(stop.id);
  const id = `pg-${esc(stop.id)}`;
  const empty = !(stop.todos || []).length;
  return `<section class="program${open ? " open" : ""}" aria-label="Programme de ${esc(stop.place || "l'étape")}">
    <div class="pg-head">
      <button class="pg-toggle" data-act="program-toggle" data-stop="${esc(stop.id)}" type="button" aria-expanded="${open}" aria-controls="${id}">
        <span class="pg-arrow" aria-hidden="true">▸</span> <b>Programme</b> · ${programSummary(stop)}
      </button>
      ${empty && !open ? `<button class="cl-add" data-act="act-add" data-stop="${esc(stop.id)}" data-date="${esc(stop.arrive || "")}" type="button" aria-label="Ajouter une activité" title="Ajouter une activité">+</button>` : ""}
    </div>
    <div class="pg-days" id="${id}"${open ? "" : " hidden"}>${open ? daysHtml(stop, opts) : ""}</div>
  </section>`;
}

// moves : heure d'arrivée (premier jour) et de départ (dernier jour), placées parmi les activités
function dayBlock(stop, { title, sub, date, list, moves = {} }) {
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

// Arrivée ou départ : une ligne fixe (modifiable dans le lieu, ou dans le trajet pour un road trip)
const moveRow = (x) => `<li class="sj-move"><time class="sj-time">${esc(fmtHour(x.time))}</time><span>${esc(x.text)}</span></li>`;

function activity(stop, x) {
  const maps = safeUrl(x.maps);
  return `<li class="sj-act${markClass(x) ? " " + markClass(x) : ""}">
    <div class="sj-act-main">
      <label>
        ${bookMark(stop, x)}
        ${x.time ? `<time class="sj-time">${esc(fmtHour(x.time))}</time>` : ""}
        <span class="sj-text">${esc(x.text)}</span>
        ${hasPrice(x.price) ? `<span class="price sj-price">${esc(money(x.price))}</span>` : ""}
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
    <div class="f sj-book">${bookBox("book", "act-book-" + id, x.id ? needsBooking(x) : false)}</div>
    <label class="f">Prix (facultatif)<input name="price" id="act-price-${esc(id)}" value="${esc(priceInput(x.price))}" inputmode="decimal" placeholder="Ex. 25" autocomplete="off"></label>
    <label class="f full">Comment y aller<input name="how" id="act-how-${esc(id)}" value="${esc(x.how || "")}" placeholder="Ex. Métro 1, arrêt Palais-Royal, puis 5 min à pied" maxlength="200" autocomplete="off"></label>
    <label class="f full">Lien Google Maps<input name="maps" id="act-maps-${esc(id)}" value="${esc(x.maps || "")}" placeholder="Facultatif" inputmode="url" autocomplete="off"></label>
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
    price: parsePrice(f.price.value),
  };
}
