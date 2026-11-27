// Page « À réserver » d'un voyage (#a-reserver-<id>) : toutes les activités encore à réserver,
// rangées par étape (ordre de l'itinéraire), puis par date et heure (sans date à la fin).
//
// Même règle que la pastille « N à réserver » (views/checklist.js, pending et tripPending) : une activité
// à réserver et pas encore réservée. Une activité cochée ici reste affichée, « Réservé », tant qu'on est
// sur la page (state.toBookShown, vidé en changeant de page) : on peut la décocher en cas d'erreur.
// La case est celle du programme (bookMark) : même action, même enregistrement (js/events.js).

import { esc, byDate, needsBooking, nights, fmtDay, fmtHour, fmtMoney, hasPrice } from "../utils.js";
import { t, count } from "../i18n.js";
import { state, tripStart } from "../store.js";
import { bookMark } from "./checklist.js";

const isPending = (x) => needsBooking(x) && !x.done;

// Étapes qui ont des activités à réserver : [{ stop, title, list }] ; list triée par date puis heure.
// shown : activités à garder même réservées (ids affichés depuis l'ouverture de la page)
export function toBookList(trip, shown = new Set()) {
  const sejour = trip.kind === "sejour";
  const start = tripStart(trip);
  return trip.items.filter((i) => i.type === "stop").map((stop) => {
    const list = byDate((stop.todos || []).filter((x) => isPending(x) || (shown.has(x.id) && needsBooking(x))));
    const dayN = !sejour && stop.arrive && start ? nights(start, stop.arrive) + 1 : null;
    const place = stop.place || t("stop.unnamed");
    return { stop, list, title: dayN ? `${t("program.day", { n: dayN })} · ${place}` : place };
  }).filter((g) => g.list.length);
}

export function toBookView(id, trip) {
  // Les activités à réserver à l'ouverture de la page restent affichées jusqu'à ce qu'on la quitte ;
  // une activité qui redevient à réserver (décochée ailleurs) s'y ajoute
  if (!state.toBookShown || state.toBookShown.trip !== id) state.toBookShown = { trip: id, ids: new Set() };
  const shown = state.toBookShown.ids;
  trip.items.forEach((i) => i.type === "stop" && (i.todos || []).forEach((x) => isPending(x) && shown.add(x.id)));

  const groups = toBookList(trip, shown);
  const left = groups.reduce((n, g) => n + g.list.filter(isPending).length, 0);
  const name = trip.name || t("trip.untitled");
  const cur = trip.currency || "EUR";

  const row = (stop, x) => {
    const when = x.date ? `${esc(fmtDay(x.date))}${x.time ? ` · ${esc(fmtHour(x.time))}` : ""}` : t("program.noDay");
    return `<li class="tb-act${x.done ? " done" : ""}" data-tb="${esc(x.id)}">
      ${bookMark(stop, x)}
      <label class="tb-main" for="todo-${esc(x.id)}">
        <span class="tb-text">${esc(x.text)}</span>
        <span class="tb-meta">${when}${hasPrice(x.price) ? ` · ${esc(fmtMoney(x.price, cur))}` : ""}<span class="tb-booked"> · ${t("toBook.booked")}</span></span>
      </label>
      <a class="tb-see" href="#voyage-${esc(id)}" data-act="to-book-see" data-stop="${esc(stop.id)}" data-todo="${esc(x.id)}" aria-label="${esc(t("toBook.seeNamed", { name: x.text }))}">${t("toBook.see")}</a>
    </li>`;
  };

  return `<section class="page to-book">
    <a class="trip-back" href="#voyage-${esc(id)}">${t("toBook.back")}</a>
    <header class="page-head">
      <h1>${t("toBook.title")}</h1>
      <p class="lead">${esc(name)} · <span id="toBookCount" aria-live="polite">${count(left, "count.activity")}</span></p>
    </header>
    <div class="tb-done" id="toBookDone"${left ? " hidden" : ""}>
      <p><b>${t("toBook.allBooked")}</b></p>
      <a class="btn" href="#voyage-${esc(id)}">${t("toBook.backShort")}</a>
    </div>
    ${groups.map((g) => `<section class="tb-stop" aria-label="${esc(g.title)}">
      <h2>${esc(g.title)}</h2>
      <ul class="tb-list">${g.list.map((x) => row(g.stop, x)).join("")}</ul>
    </section>`).join("")}
  </section>`;
}

// Pastille rouge « N à réserver » (en-tête du voyage, carte de Mes voyages) : ouvre la page de tout
// ce qui reste à réserver. Zone de toucher agrandie dans le CSS (css/checklist.css).
export const toBookLink = (id, n, label) =>
  `<a class="todo-alert is-link" href="#a-reserver-${esc(id)}" aria-label="${esc(count(n, "toBook.open"))}">${esc(label)} <span aria-hidden="true">›</span></a>`;

// Case cochée ou décochée sur cette page : la ligne et le compteur changent sur place (le compteur,
// annoncé par aria-live, n'est pas remplacé ; le focus reste sur la case)
export function refreshToBook(trip) {
  const items = trip.items.filter((i) => i.type === "stop").flatMap((s) => s.todos || []);
  let left = 0;
  document.querySelectorAll(".to-book [data-tb]").forEach((li) => {
    const x = items.find((a) => a.id === li.dataset.tb);
    const done = !x || !!x.done;
    li.classList.toggle("done", done);
    if (!done) left++;
  });
  const counter = document.getElementById("toBookCount");
  if (counter) counter.textContent = count(left, "count.activity");
  const all = document.getElementById("toBookDone");
  if (all) all.hidden = !!left;
}
