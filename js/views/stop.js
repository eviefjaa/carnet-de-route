// Affichage et formulaire d'une étape (lieu, dates, hébergement, liens de réservation)

import { esc, uid, safeUrl, dayOrEmpty, timeOrEmpty, byDate, needsBooking, fmtHour, source, fmtDay, nights, fmtMoney, priceInput, parsePrice, hasPrice } from "../utils.js";
import { t, count } from "../i18n.js";
import { state, tripStart } from "../store.js";
import { itemActions } from "./actions.js";
import { pickedPlace } from "../autocomplete.js";
import { dateRange, bookBox } from "./checklist.js";
import { programPill, programPanel, stopMoves } from "./program.js";
import { stopCountry } from "../i18n-data.js";

// sejour : lieu d'un séjour, sans numéro de jour ni programme (affiché à part, toujours déplié)
export function stopCard(it, trip, idx, { sejour = false } = {}) {
  const start = tripStart(trip);
  const dayN = !sejour && it.arrive && start ? nights(start, it.arrive) + 1 : null;
  const n = nights(it.arrive, it.depart);
  const links = (it.links || []).filter((l) => safeUrl(l.url));
  const where = it.address || it.place;
  const maps = where ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}` : "";
  const cur = trip.currency || "EUR";
  const price = hasPrice(it.price)
    ? `<div><span class="price">${esc(fmtMoney(it.price, cur))}</span>${n ? ` <span class="price-sub">${esc(t("stop.perNight", { price: fmtMoney(Math.round((it.price / n) * 100) / 100, cur) }))}</span>` : ""}</div>`
    : "";

  // Carte repliée : l'essentiel, et la pastille du programme (avec ce qui reste à réserver).
  // Le nom ouvre les infos de l'étape ; la pastille, le programme. Les deux sont indépendants.
  const open = state.openItems.has(it.id);
  const detailId = `stop-detail-${esc(it.id)}`;

  return `<article class="item stop${open ? " open" : ""}">
    <div class="stop-summary">
      <div class="stop-head">
        ${dayN ? `<span class="day">${t("stop.dayBadge", { n: dayN })}</span>` : ""}
        <h2><button class="stop-toggle" data-act="toggle-item" data-id="${esc(it.id)}" type="button" aria-expanded="${open}" aria-controls="${detailId}">${esc(it.place || t("stop.unnamed"))}</button></h2>
        ${it.country || it.countryCode ? `<span class="stop-country">${esc(stopCountry(it))}</span>` : ""}
        <svg class="stop-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="dates">
        ${datesLine(it)}
        ${n === 0 ? `<span class="nights is-halt">${t("stop.halt")}</span>` : n ? `<span class="nights">${count(n, "count.night")}</span>` : ""}
      </div>
      ${sejour ? "" : `<div class="pg-pill-row">${programPill(it)}</div>`}
    </div>
    ${sejour ? "" : programPanel(it, { firstDay: dayN || 1, moves: stopMoves(trip, idx) })}
    ${open ? `<div class="stop-detail" id="${detailId}">
    ${price}
    ${it.address ? `<div class="addr">${esc(it.address)}</div>` : ""}
    ${links.length ? `<div class="links">${links.map(linkCard).join("")}</div>` : ""}
    ${it.notes ? `<div class="notes">${esc(it.notes)}</div>` : ""}
    ${maps ? `<div class="leg-extra"><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">${t("stop.openMaps")}</a></div>` : ""}
    ${itemActions(it, idx, trip)}
    </div>` : ""}
  </article>`;
}

// Dates de l'étape ; celles qui manquent sont signalées en rouge
function datesLine(it) {
  const todo = (txt) => `<span class="to-define">${txt}</span>`;
  if (!it.arrive && !it.depart) return todo(t("status.nodate"));
  const at = (h) => (h ? `, ${esc(fmtHour(h))}` : "");
  return `${it.arrive ? esc(fmtDay(it.arrive)) + at(it.arriveTime) : todo(t("stop.arriveToDefine"))} → ${it.depart ? esc(fmtDay(it.depart)) + at(it.departTime) : todo(t("stop.departToDefine"))}`;
}

function linkCard(l) {
  const u = safeUrl(l.url);
  return `<a class="link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">
    <span class="src">${esc(source(u))}</span>
    <span class="lbl">${esc(l.label || u)}</span>
    <span class="go">↗</span>
  </a>`;
}

export function stopForm(it, isNew, { sejour = false } = {}) {
  const links = it.links && it.links.length ? it.links : [{ id: uid(), label: "", url: "" }];
  return `<form class="form" data-form="stop" data-id="${esc(it.id)}" data-new="${isNew ? 1 : 0}"${sejour ? ` data-sejour="1"` : ""}>
    <h3>${sejour ? (isNew ? t("stop.formWhere") : t("stop.formEditPlace")) : isNew ? t("stop.formNew") : t("stop.formEdit")}</h3>
    <div class="grid">
      <label class="f full">${t("stop.place")}<span class="ac"><input name="place" id="f-place-${esc(it.id)}" value="${esc(it.place)}" placeholder="${t("stop.placeHint")}" required data-place="place" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">${t("stop.arrive")}<input type="date" name="arrive" id="f-arr-${esc(it.id)}" value="${esc(it.arrive)}"></label>
      ${sejour ? `<label class="f">${t("stop.arriveTime")}<input type="time" name="arriveTime" id="f-arrt-${esc(it.id)}" value="${esc(it.arriveTime || "")}"></label>` : ""}
      <label class="f">${t("stop.depart")}<input type="date" name="depart" id="f-dep-${esc(it.id)}" value="${esc(it.depart)}" min="${esc(it.arrive)}"></label>
      ${sejour ? `<label class="f">${t("stop.departTime")}<input type="time" name="departTime" id="f-dept-${esc(it.id)}" value="${esc(it.departTime || "")}"></label>` : ""}
      <label class="f">${t("stop.price")}<input name="price" id="f-price-${esc(it.id)}" value="${esc(priceInput(it.price))}" inputmode="decimal" placeholder="${t("stop.priceHint")}"></label>
      <label class="f">${t("stop.address")}<input name="address" id="f-addr-${esc(it.id)}" value="${esc(it.address)}" placeholder="${t("stop.addressHint")}"></label>
    </div>
    <div class="computed" data-nights></div>
    <div class="f-label">
      ${t("stop.links")}
      <div class="links-edit" data-links>${links.map(linkRow).join("")}</div>
    </div>
    <div><button class="btn small" data-act="add-link" type="button">${t("stop.addLink")}</button></div>
    ${sejour ? "" : `<div class="f-label">
      ${t("stop.programLabel")}
      <div class="todos-edit" data-todos>${byDate(it.todos).map((x) => todoRow(x, it)).join("")}</div>
    </div>
    <div><button class="btn small" data-act="add-todo-row" type="button">${t("stop.addActivity")}</button></div>`}
    <label class="f">${t("stop.notes")}<textarea name="notes" id="f-notes-${esc(it.id)}" placeholder="${t("stop.notesHint")}">${esc(it.notes)}</textarea></label>
    <div class="form-actions">
      ${sejour && isNew ? "" : `<button class="btn" data-act="cancel" type="button">${t("common.cancel")}</button>`}
      <button class="btn primary" type="submit">${t("common.save")}</button>
    </div>
  </form>`;
}

export function linkRow(l) {
  return `<div class="link-edit" data-link="${esc(l.id)}">
    <input name="lbl" id="l-lbl-${esc(l.id)}" value="${esc(l.label)}" placeholder="${t("stop.linkNameHint")}" aria-label="${t("stop.linkName")}">
    <input name="url" id="l-url-${esc(l.id)}" value="${esc(l.url)}" placeholder="https://www.airbnb.fr/rooms/…" aria-label="${t("stop.linkUrl")}" inputmode="url">
    <button class="btn ghost small" data-act="rm-link" type="button" aria-label="${t("stop.removeLink")}">✕</button>
  </div>`;
}

// Une activité dans le formulaire : case « réservé », texte, retrait
export function todoRow(x, stop = {}) {
  const n = (x.tickets || []).length;
  return `<div class="todo-edit" data-todo-row="${esc(x.id)}">
    <input type="checkbox" name="todoDone" id="td-done-${esc(x.id)}"${x.done ? " checked" : ""} aria-label="${t("stop.alreadyBooked")}">
    <input name="todoText" id="td-text-${esc(x.id)}" value="${esc(x.text)}" placeholder="${t("stop.activityHint")}" maxlength="120" autocomplete="off" aria-label="${t("act.activity")}">
    ${n ? `<span class="todo-tk" title="${t("stop.ticketsHere")}">${count(n, "count.ticket")}</span>` : "<span></span>"}
    <button class="btn ghost small" data-act="rm-todo-row" type="button" aria-label="${t("stop.removeActivity")}">✕</button>
    <div class="todo-extra">
      <label class="todo-date">${t("act.date")}<input type="date" name="todoDate" id="td-date-${esc(x.id)}" value="${esc(x.date || "")}"${dateRange(stop)}></label>
      <label class="todo-date">${t("act.time")}<input type="time" name="todoTime" id="td-time-${esc(x.id)}" value="${esc(x.time || "")}"></label>
      <label class="todo-date">${t("act.priceShort")}<input name="todoPrice" id="td-price-${esc(x.id)}" value="${esc(priceInput(x.price))}" inputmode="decimal" placeholder="${t("act.priceHint")}" autocomplete="off"></label>
      ${bookBox("todoBook", "td-book-" + x.id, needsBooking(x))}
      <input name="todoMaps" id="td-maps-${esc(x.id)}" value="${esc(x.maps || "")}" placeholder="${t("stop.mapsHint")}" inputmode="url" autocomplete="off" aria-label="${t("stop.mapsLabel")}">
    </div>
  </div>`;
}

export function readStopForm(f) {
  const o = { id: f.dataset.id, type: "stop" };
  ["place", "arrive", "depart", "address", "notes"].forEach((k) => (o[k] = f[k].value.trim()));
  o.price = parsePrice(f.price.value);
  // Heures d'arrivée et de départ : seulement dans le formulaire d'un séjour (sinon reprises de l'étape, events.js)
  if (f.arriveTime) o.arriveTime = timeOrEmpty(f.arriveTime.value);
  if (f.departTime) o.departTime = timeOrEmpty(f.departTime.value);

  // Lieu choisi dans les suggestions : on garde sa position exacte et son pays
  const picked = pickedPlace(f.place);
  if (picked) {
    o.country = picked.country;
    if (picked.countryCode) o.countryCode = picked.countryCode; // fiches pays, quelle que soit la langue du nom
    o.geo = { q: [o.address, o.place].filter(Boolean).join(" | "), lat: picked.lat, lng: picked.lng };
  }
  o.links = [...f.querySelectorAll("[data-link]")]
    .map((r) => ({
      id: r.dataset.link,
      label: r.querySelector('[name="lbl"]').value.trim(),
      url: r.querySelector('[name="url"]').value.trim(),
    }))
    .filter((l) => l.url);
  // Checklist : les billets des activités sont repris à l'enregistrement (events.js)
  o.todos = [...f.querySelectorAll("[data-todo-row]")]
    .map((r) => ({
      id: r.dataset.todoRow,
      text: r.querySelector('[name="todoText"]').value.trim(),
      book: r.querySelector('[name="todoBook"]').checked,
      done: r.querySelector('[name="todoBook"]').checked && r.querySelector('[name="todoDone"]').checked, // réservé : seulement si à réserver
      maps: safeUrl(r.querySelector('[name="todoMaps"]').value),
      date: dayOrEmpty(r.querySelector('[name="todoDate"]').value),
      time: timeOrEmpty(r.querySelector('[name="todoTime"]').value),
      price: parsePrice(r.querySelector('[name="todoPrice"]').value),
    }))
    .filter((x) => x.text);
  return o;
}

export function newStop(place = "", arrive = "") {
  return { id: uid(), type: "stop", place, arrive, depart: "", address: "", notes: "", links: [], price: null, todos: [] };
}
