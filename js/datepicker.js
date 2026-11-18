// Calendrier et liste des heures du site, sur ordinateur (souris) seulement
//
// Les champs restent de vrais champs date, heure ou date et heure : le code qui les lit, la saisie
// au clavier dans le champ et les bornes (min, max) ne changent pas. Un clic sur le champ ouvre
// ce calendrier à la place de celui du navigateur ; Alt + ↓ (ou F4) l'ouvre au clavier.
// Téléphone et tablette gardent le sélecteur du système, plus pratique au doigt.

import { esc, fmtHour } from "./utils.js";
import { t, locale } from "./i18n.js";

const FIELDS = 'input[type="date"], input[type="time"], input[type="datetime-local"]';
// Noms des mois et des jours dans la langue choisie ; la semaine commence le lundi dans les deux langues
const monthName = (d) => d.toLocaleDateString(locale(), { month: "long", year: "numeric" });
const dayNames = () => Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(locale(), { weekday: "short" })); // 1er janvier 2024 : un lundi
const STEP = 30; // minutes entre deux heures de la liste (une autre heure se tape dans le champ)

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null);
const longDay = (s) => parse(s).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

let box = null; // calendrier ouvert
let cur = null; // { id, kind, date, time, month: Date (1er du mois affiché), min, max }

const field = () => (cur && document.getElementById(cur.id)) || null; // le champ, même après un réaffichage

export function bindDatePicker() {
  // Clic sur un champ date ou heure : notre calendrier, pas celui du navigateur
  document.addEventListener("mousedown", (e) => {
    if (box && box.contains(e.target)) return;
    const input = e.target instanceof Element && e.target.closest(FIELDS);
    if (!input || !finePointer() || input.disabled || input.readOnly) return close();
    e.preventDefault(); // le navigateur n'ouvre pas son propre calendrier
    input.focus({ preventScroll: true });
    if (cur && cur.id === input.id) return close();
    open(input, false);
  }, true);
  // Le clic qui suit ne doit pas non plus ouvrir le sélecteur du navigateur (Firefox, Safari)
  document.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.matches(FIELDS) && finePointer()) e.preventDefault();
  }, true);
  document.addEventListener("keydown", (e) => {
    const input = e.target instanceof Element && e.target.matches(FIELDS) ? e.target : null;
    if (input && finePointer() && ((e.altKey && e.key === "ArrowDown") || e.key === "F4")) {
      e.preventDefault();
      open(input, true);
    } else if (box && e.key === "Escape") {
      e.preventDefault();
      close(true);
    }
  }, true);
  // La page défile ou change de taille : le calendrier suit son champ (fermé si le champ a disparu)
  const follow = (e) => {
    if (!box || (e && box.contains(e.target))) return;
    const input = field();
    if (input) place(input);
    else close();
  };
  document.addEventListener("scroll", follow, true);
  window.addEventListener("resize", () => follow());
  window.addEventListener("hashchange", () => close());
}

function open(input, byKeyboard) {
  if (!input.id) input.id = "dp-" + Math.random().toString(36).slice(2, 8);
  const kind = input.type === "datetime-local" ? "datetime" : input.type;
  // Trajet repris d'un itinéraire : une date sans heure, gardée à part (views/transport.js)
  const value = input.value || input.dataset.day || "";
  const date = kind === "time" ? "" : value.slice(0, 10);
  const time = kind === "date" ? "" : kind === "time" ? value : value.slice(11, 16);
  const start = parse(date) || parse((input.min || "").slice(0, 10)) || new Date();
  cur = { id: input.id, kind, date, time, month: new Date(start.getFullYear(), start.getMonth(), 1),
    min: (input.min || "").slice(0, 10), max: (input.max || "").slice(0, 10) };
  if (!box) {
    box = document.createElement("div");
    box.className = "dp";
    box.addEventListener("click", onClick);
    box.addEventListener("keydown", onKey);
    document.body.appendChild(box);
  }
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", kind === "time" ? t("dp.pickTime") : kind === "datetime" ? t("dp.pickDateTime") : t("dp.pickDate"));
  draw();
  place(input);
  if (byKeyboard) (box.querySelector('.dp-day[tabindex="0"], .dp-time[tabindex="0"]') || box).focus();
}

export function close(refocus = false) {
  if (!box) return;
  const input = field();
  box.remove();
  box = null;
  cur = null;
  if (refocus && input) input.focus();
}

// Sous le champ, ou au-dessus s'il n'y a pas la place
function place(input) {
  const r = input.getBoundingClientRect();
  const h = box.offsetHeight, w = box.offsetWidth;
  const below = r.bottom + 6 + h <= innerHeight || r.top - 6 - h < 0;
  box.style.top = `${below ? r.bottom + 6 : r.top - 6 - h}px`;
  box.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
}

function draw() {
  const { kind } = cur;
  const parts = [];
  if (kind !== "time") parts.push(calendar());
  if (kind !== "date") parts.push(times());
  box.innerHTML = `<div class="dp-body">${parts.join("")}</div>
    <div class="dp-foot">
      ${kind !== "time" && inRange(iso(new Date())) ? `<button class="dp-link" data-dp="today" type="button">${t("dp.today")}</button>` : ""}
      <button class="dp-link" data-dp="clear" type="button">${t("dp.clear")}</button>
    </div>`;
  const sel = box.querySelector(".dp-time.is-sel") || box.querySelector('.dp-time[data-time="09:00"]');
  if (sel) sel.parentElement.scrollTop = sel.offsetTop - 60;
}

const inRange = (d) => (!cur.min || d >= cur.min) && (!cur.max || d <= cur.max);

function calendar() {
  const m = cur.month;
  const first = (m.getDay() + 6) % 7; // lundi en premier
  const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const today = iso(new Date());
  // Un seul jour joignable par Tab (le choisi, sinon aujourd'hui, sinon le premier possible) ; les flèches font le reste
  const days = Array.from({ length: count }, (_, i) => iso(new Date(m.getFullYear(), m.getMonth(), i + 1)));
  const tab = [cur.date, today].find((s) => days.includes(s) && inRange(s)) || days.find(inRange);
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(`<span></span>`);
  for (let d = 1; d <= count; d++) {
    const s = iso(new Date(m.getFullYear(), m.getMonth(), d));
    const cls = ["dp-day", s === cur.date ? "is-sel" : "", s === today ? "is-today" : ""].filter(Boolean).join(" ");
    cells.push(`<button class="${cls}" data-day="${s}" type="button" tabindex="${s === tab ? 0 : -1}" aria-label="${esc(longDay(s))}"${s === cur.date ? ` aria-pressed="true"` : ""}${inRange(s) ? "" : " disabled"}>${d}</button>`);
  }
  return `<div class="dp-cal">
    <div class="dp-head">
      <button class="dp-nav" data-dp="prev" type="button" aria-label="${t("dp.prev")}">‹</button>
      <b aria-live="polite">${esc(monthName(m))}</b>
      <button class="dp-nav" data-dp="next" type="button" aria-label="${t("dp.next")}">›</button>
    </div>
    <div class="dp-week" aria-hidden="true">${dayNames().map((d) => `<span>${esc(d)}</span>`).join("")}</div>
    <div class="dp-grid">${cells.join("")}</div>
  </div>`;
}

function times() {
  const list = [];
  for (let m = 0; m < 24 * 60; m += STEP) list.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  if (cur.time && !list.includes(cur.time)) list.push(cur.time); // heure tapée à la main : dans la liste aussi
  list.sort();
  const ask = cur.kind === "datetime" && cur.date && !cur.time;
  const tab = cur.time || "09:00"; // une seule heure joignable par Tab
  return `<div class="dp-times-box">
    <b class="dp-times-title${ask ? " is-ask" : ""}">${ask ? t("dp.askTime") : t("act.time")}</b>
    <div class="dp-times" role="listbox" aria-label="${t("dp.times")}">${list.map((h) => `<button class="dp-time${h === cur.time ? " is-sel" : ""}" data-time="${h}" type="button" role="option" aria-selected="${h === cur.time}" tabindex="${h === tab ? 0 : -1}">${fmtHour(h)}</button>`).join("")}</div>
  </div>`;
}

function onClick(e) {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.dp === "prev" || b.dataset.dp === "next") {
    cur.month = new Date(cur.month.getFullYear(), cur.month.getMonth() + (b.dataset.dp === "next" ? 1 : -1), 1);
    draw();
    box.querySelector(`[data-dp="${b.dataset.dp}"]`).focus();
  } else if (b.dataset.dp === "clear") {
    commit("");
  } else if (b.dataset.dp === "today") {
    pickDay(iso(new Date()));
  } else if (b.dataset.day) {
    pickDay(b.dataset.day);
  } else if (b.dataset.time) {
    pickTime(b.dataset.time);
  }
}

function pickDay(day) {
  cur.date = day;
  if (cur.kind === "date") return commit(day);
  if (cur.time) return commit(`${day}T${cur.time}`);
  // Date et heure : il manque l'heure, on la demande sans rien inventer
  cur.month = new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, 1);
  draw();
  (box.querySelector('.dp-time[data-time="09:00"]') || box.querySelector(".dp-time")).focus();
}

function pickTime(time) {
  cur.time = time;
  if (cur.kind === "time") return commit(time);
  if (!cur.date) { draw(); return; } // l'heure d'abord : on attend la date
  commit(`${cur.date}T${time}`);
}

// Valeur dans le champ, comme une saisie : les formulaires réagissent (nuits, durée…)
function commit(value) {
  const input = field();
  close(true);
  if (!input) return;
  input.value = value;
  if (!value && input.dataset.day) delete input.dataset.day;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

// Clavier : flèches d'un jour (ou d'une heure) à l'autre, Page ↑ / ↓ d'un mois, Entrée pour choisir
function onKey(e) {
  const el = e.target;
  if (el.classList.contains("dp-day")) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let d = parse(el.dataset.day);
    if (e.key in moves) d.setDate(d.getDate() + moves[e.key]);
    else if (e.key === "PageUp" || e.key === "PageDown") d.setMonth(d.getMonth() + (e.key === "PageDown" ? 1 : -1));
    else if (e.key === "Home") d = new Date(cur.month);
    else return;
    e.preventDefault();
    if (d.getMonth() !== cur.month.getMonth() || d.getFullYear() !== cur.month.getFullYear()) {
      cur.month = new Date(d.getFullYear(), d.getMonth(), 1);
      draw();
    }
    box.querySelector(`.dp-day[data-day="${iso(d)}"]`)?.focus();
  } else if (el.classList.contains("dp-time") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
    e.preventDefault();
    (e.key === "ArrowDown" ? el.nextElementSibling : el.previousElementSibling)?.focus();
  }
}
