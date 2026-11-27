// Programme jour par jour d'un lieu : séjour (toujours déplié) ou étape d'un road trip (repliable)
//
// Les activités sont les « todos » de l'étape : { id, text, done, book, date, time, how, maps, tickets }.
// Un bloc par jour, de l'arrivée au départ ; les activités sans date, ou hors des dates, dans
// « Pas encore de jour » ; une étape sans dates n'a qu'un bloc « Activités ».

import { esc, safeUrl, fmtDay, fmtHour, toDate, needsBooking, parsePrice, priceInput, hasPrice, fmtMoney } from "../utils.js";
import { t, count } from "../i18n.js";
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
    title: t("program.day", { n: firstDay + i }), sub: fmtDay(day), date: day,
    list: todos.filter((x) => x.date === day).sort(byTime),
    moves: {
      arrive: i === 0 && a.time && a.date === day ? a.time : "",
      depart: i === days.length - 1 && d.time && d.date === day ? d.time : "",
    },
  }));
  if (loose.length || !days.length) out.push({ title: days.length ? t("program.noDay") : t("program.activities"), sub: "", date: "", list: loose, moves: {} });
  return out;
}

// « Rien de prévu pour l'instant » une seule fois, quand aucun jour n'a d'activité (un jour vide n'a que son titre)
const daysHtml = (stop, opts) => {
  const days = programDays(stop, opts);
  const empty = !(stop.todos || []).length && !(state.actForm && state.actForm.stop === stop.id);
  return (empty && stopDays(stop).length ? `<p class="note pg-empty">${t("program.nothingYet")}</p>` : "") + days.map((x) => dayBlock(stop, x)).join("");
};

// Séjour : toujours déplié, sous son titre
export function sejourProgram(stop) {
  const days = stopDays(stop);
  return `<h2 class="sj-title">${t("program.sejourTitle")}</h2>
    ${days.length ? "" : `<p class="note">${t("program.sejourNoDates")}</p>`}
    ${daysHtml(stop, { moves: { arrive: { date: days[0], time: stop.arriveTime }, depart: { date: stop.depart, time: stop.departTime } } })}`;
}

// Étape d'un road trip : une pastille dans le résumé (toujours visible) ouvre le programme
// sous le résumé, indépendamment des infos de l'étape. Ouvert ou fermé pour la session (state.programOpen).
const CALENDAR = `<svg class="pg-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
const ARROW = `<svg class="pg-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;

export function programPill(stop) {
  const n = (stop.todos || []).length;
  const open = state.programOpen.has(stop.id);
  const place = stop.place || t("program.theStop");
  // Rien de prévu : « + Programme » ouvre directement l'ajout d'une activité, au premier jour
  if (!n && !open) {
    return `<button class="pg-pill is-empty" data-act="act-add" data-stop="${esc(stop.id)}" data-date="${esc(stop.arrive || "")}" type="button" aria-label="${esc(t("program.addTo", { place }))}">
      <span aria-hidden="true">+</span> <b>${t("program.title")}</b></button>`;
  }
  const left = pending(stop);
  const what = n ? count(n, "count.activity") : t("program.nothing");
  const label = left ? t("program.labelLeft", { place, what, left }) : t("program.label", { place, what });
  return `<button class="pg-pill" data-act="program-toggle" data-stop="${esc(stop.id)}" type="button" aria-expanded="${open}" aria-controls="pg-${esc(stop.id)}" aria-label="${esc(label)}">
      ${CALENDAR} <b>${t("program.title")}</b>${n ? ` <span>· ${count(n, "count.activity")}</span>` : ""}
      <span class="pg-end">${left ? `<span class="pg-pending">· ${t("trips.toBook", { n: left })}</span> ` : ""}${ARROW}</span></button>`;
}

// ---------- Programme d'une publication (lecture seule) ----------
// program : [{ day, time, text, how }] (« Jour N » du voyage) ; anciennes publications : todos, simple liste.
// key : clé de l'état ouvert / fermé (state.programOpen, pour la session) ; panel : id du programme déplié.
export function publicPill({ key, panel, icon = CALENDAR, title, what, label }) {
  const open = state.programOpen.has(key);
  return `<button class="pg-pill" data-act="program-toggle" data-stop="${esc(key)}" type="button" aria-expanded="${open}" aria-controls="${panel}" aria-label="${esc(label)}">
      ${icon} <b>${title}</b>${what ? ` <span>· ${what}</span>` : ""}<span class="pg-end">${ARROW}</span></button>`;
}

export function publicProgramPill(stop, key, panel) {
  const n = (stop.program || []).length || (stop.todos || []).length;
  if (!n) return "";
  const what = count(n, "count.activity");
  return publicPill({ key, panel, title: t("program.title"), what, label: t("program.label", { place: stop.place || t("program.theStop"), what }) });
}

export function publicProgramPanel(stop, key, panel) {
  if (!state.programOpen.has(key)) return `<section class="program" id="${panel}" hidden></section>`;
  return `<section class="program" id="${panel}" aria-label="${esc(t("program.of", { place: stop.place || t("program.theStop") }))}">${publicDays(stop)}</section>`;
}

// Jours publiés : un bloc par jour, activités par heure (heure, activité, comment y aller)
export function publicDays(stop) {
  const program = stop.program || [];
  if (!program.length) return (stop.todos || []).length ? `<ul class="post-todos">${stop.todos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const days = [...new Set(program.map((a) => a.day))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  return days.map((d) => `<section class="sj-day${d ? "" : " is-loose"}">
      <div class="sj-day-head"><h3>${d ? t("program.day", { n: +d }) : t("post.noDay")}</h3></div>
      <ul class="sj-acts">${program.filter((a) => a.day === d).sort(byTime).map((a) => `<li class="sj-act is-public">
        <div class="sj-act-main">${a.time ? `<time class="sj-time">${esc(fmtHour(a.time))}</time>` : ""}<span class="sj-text">${esc(a.text)}</span></div>
        ${a.how ? `<p class="sj-how"><span><b>${t("program.getThere")}</b> ${esc(a.how)}</span></p>` : ""}
      </li>`).join("")}</ul>
    </section>`).join("");
}

// Programme déplié, sous le résumé de l'étape : jours et prix en une ligne discrète, puis les jours
export function programPanel(stop, opts) {
  const id = `pg-${esc(stop.id)}`;
  if (!state.programOpen.has(stop.id)) return `<section class="program" id="${id}" hidden></section>`;
  const days = stopDays(stop).length;
  const cost = activitiesTotal(stop);
  // Textes du dictionnaire (sûrs) : seul le montant est échappé
  const meta = [days ? t("program.overDays", { days: count(days, "count.day") }) : "", cost ? t("program.cost", { price: esc(money(cost)) }) : ""].filter(Boolean).join(" · ");
  return `<section class="program" id="${id}" aria-label="${esc(t("program.of", { place: stop.place || t("program.theStop") }))}">
    ${meta ? `<p class="pg-meta">${meta}</p>` : ""}
    ${daysHtml(stop, opts)}
  </section>`;
}

// moves : heure d'arrivée (premier jour) et de départ (dernier jour), placées parmi les activités
function dayBlock(stop, { title, sub, date, list, moves = {} }) {
  const f = state.actForm;
  const adding = f && !f.todo && f.stop === stop.id && f.date === date;
  const move = (time, label) => ({ move: true, time, text: label });
  const rows = [...list, ...(moves.arrive ? [move(moves.arrive, t("stop.arrive"))] : []), ...(moves.depart ? [move(moves.depart, t("stop.depart"))] : [])].sort(byTime);
  return `<section class="sj-day${date ? "" : " is-loose"}" aria-label="${esc(title)}${sub ? " " + esc(sub) : ""}">
    <div class="sj-day-head">
      <h3>${esc(title)}${sub ? ` <span>· ${esc(sub)}</span>` : ""}</h3>
      ${adding ? "" : `<button class="cl-add" data-act="act-add" data-stop="${esc(stop.id)}" data-date="${esc(date)}" type="button" aria-label="${esc(sub ? t("program.addOn", { day: sub }) : t("program.add"))}" title="${t("program.add")}">+</button>`}
    </div>
    ${rows.length ? `<ul class="sj-acts">${rows.map((x) => x.move ? moveRow(x) : f && f.todo === x.id ? `<li>${activityForm(stop, x)}</li>` : activity(stop, x)).join("")}</ul>` : ""}
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
      <button class="cl-del" data-act="act-edit" data-stop="${esc(stop.id)}" data-todo="${esc(x.id)}" type="button" aria-label="${esc(t("program.editNamed", { name: x.text }))}" title="${t("common.edit")}">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
      <button class="cl-del" data-act="todo-del" data-todo="${esc(x.id)}" data-stop="${esc(stop.id)}" type="button" aria-label="${esc(t("program.deleteNamed", { name: x.text }))}" title="${t("common.delete")}">✕</button>
    </div>
    ${x.how || maps ? `<p class="sj-how">${x.how ? `<span><b>${t("program.getThere")}</b> ${esc(x.how)}</span>` : ""}
      ${maps ? `<a class="cl-map" href="${esc(maps)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(t("program.seeOnMap", { name: x.text }))}">${t("program.map")}</a>` : ""}</p>` : ""}
    <div class="sj-tk">${todoTicketButton(stop, x)}${todoTickets(stop, x)}</div>
  </li>`;
}

// Formulaire d'une activité (ajout dans un jour, ou modification)
function activityForm(stop, x) {
  const id = x.id || "new";
  return `<form class="sj-form" data-act-form="${esc(stop.id)}"${x.id ? ` data-todo="${esc(x.id)}"` : ""}>
    <label class="f full">${t("act.activity")}<input name="text" id="act-text-${esc(id)}" value="${esc(x.text || "")}" placeholder="${t("act.textHint")}" maxlength="120" autocomplete="off" required></label>
    <label class="f">${t("act.day")}<input type="date" name="date" id="act-date-${esc(id)}" value="${esc(x.date || "")}"${dateRange(stop)}></label>
    <label class="f">${t("act.time")}<input type="time" name="time" id="act-time-${esc(id)}" value="${esc(x.time || "")}"></label>
    <div class="f sj-book">${bookBox("book", "act-book-" + id, x.id ? needsBooking(x) : false)}</div>
    <label class="f">${t("act.price")}<input name="price" id="act-price-${esc(id)}" value="${esc(priceInput(x.price))}" inputmode="decimal" placeholder="${t("act.priceHint")}" autocomplete="off"></label>
    <label class="f full">${t("act.how")}<input name="how" id="act-how-${esc(id)}" value="${esc(x.how || "")}" placeholder="${t("act.howHint")}" maxlength="200" autocomplete="off"></label>
    <label class="f full">${t("act.maps")}<input name="maps" id="act-maps-${esc(id)}" value="${esc(x.maps || "")}" placeholder="${t("act.optional")}" inputmode="url" autocomplete="off"></label>
    <div class="form-actions">
      <button class="btn" data-act="act-cancel" type="button">${t("common.cancel")}</button>
      <button class="btn primary" type="submit">${x.id ? t("common.save") : t("common.add")}</button>
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
