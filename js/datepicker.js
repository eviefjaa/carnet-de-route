// Calendrier et choix de l'heure du site, sur ordinateur (souris) seulement
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
const MIN_STEP = 5; // minutes proposées de 5 en 5 ; une autre minute se tape dans la case de l'heure

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : null);
const longDay = (s) => parse(s).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

let box = null; // calendrier ouvert
let cur = null; // { id, kind, date, h, m (heure et minutes, "" si pas choisies), bad, month: Date (1er du mois affiché), min, max }

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
  const [h = "", m = ""] = /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5).split(":") : [];
  cur = { id: input.id, kind, date, h, m, bad: false, month: new Date(start.getFullYear(), start.getMonth(), 1),
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
  // Heure seule : la case de l'heure prête à taper ; au clavier, le jour ou l'heure choisis
  if (kind === "time") box.querySelector(".dp-time-input").focus();
  else if (byKeyboard) (box.querySelector('.dp-day[tabindex="0"]') || box).focus();
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
  // Chaque colonne montre l'heure ou la minute choisie (sinon 9 h et 00)
  box.querySelectorAll(".dp-col").forEach((col) => {
    const sel = col.querySelector('[tabindex="0"]');
    if (sel) col.scrollTop = sel.offsetTop - 50;
  });
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

// Heure : une case où la taper (« 5h55 », « 0555 », « 17:30 », Entrée pour valider) et deux colonnes,
// les heures puis les minutes de 5 en 5. Choisir l'heure écrit déjà la valeur ; choisir les minutes la valide.
function times() {
  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const mins = Array.from({ length: 60 / MIN_STEP }, (_, i) => pad(i * MIN_STEP));
  if (cur.m && !mins.includes(cur.m)) mins.push(cur.m), mins.sort(); // minute tapée à la main : dans la liste aussi
  const ask = cur.kind === "datetime" && cur.date && !cur.h;
  const title = cur.bad ? t("dp.badTime") : ask ? t("dp.askTime") : t("act.time");
  const col = (name, list, sel, tab, label, head) => `<div class="dp-colbox"><span class="dp-colhead" aria-hidden="true">${head}</span><div class="dp-col" role="listbox" aria-label="${label}">${list.map((v) =>
    `<button class="dp-time${v === sel ? " is-sel" : ""}" data-${name}="${v}" type="button" role="option" aria-selected="${v === sel}" tabindex="${v === tab ? 0 : -1}">${v}</button>`).join("")}</div></div>`;
  return `<div class="dp-times-box">
    <b class="dp-times-title${cur.bad ? " is-bad" : ask ? " is-ask" : ""}" id="dp-time-title">${title}</b>
    <input class="dp-time-input" id="dp-time-input" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"
      value="${cur.h ? esc(fmtHour(`${cur.h}:${cur.m || "00"}`)) : ""}" placeholder="${t("dp.timeHint")}" aria-label="${t("dp.typeTime")}" aria-describedby="dp-time-title"${cur.bad ? ` aria-invalid="true"` : ""}>
    <div class="dp-cols">${col("hour", hours, cur.h, cur.h || "09", t("dp.hours"), t("dp.hShort"))}${col("min", mins, cur.m, cur.m || "00", t("dp.minutes"), t("dp.minShort"))}</div>
  </div>`;
}

// « 5 », « 5h », « 5h55 », « 05 h 55 », « 05:55 », « 17.30 », « 555 », « 1730 », « 5:55 pm » → « HH:MM » ; sinon null
export function parseTime(s) {
  let x = String(s || "").toLowerCase().replace(/\s+/g, "");
  const pm = /pm$/.test(x), am = /am$/.test(x);
  x = x.replace(/[ap]m$/, "");
  let r = x.match(/^(\d{1,2})(?:[h:.](\d{2})?)?$/);
  if (!r && /^\d{3,4}$/.test(x)) r = [x, x.slice(0, -2), x.slice(-2)];
  if (!r) return null;
  let h = +r[1];
  const m = r[2] === undefined ? 0 : +r[2];
  if (pm || am) { if (h < 1 || h > 12) return null; h = (h % 12) + (pm ? 12 : 0); }
  return h < 24 && m < 60 ? `${pad(h)}:${pad(m)}` : null;
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
  } else if (b.dataset.hour) {
    pickTime(b.dataset.hour, cur.m || "00", false);
  } else if (b.dataset.min) {
    pickTime(cur.h, b.dataset.min, true);
  }
}

function pickDay(day) {
  cur.date = day;
  if (cur.kind === "date") return commit(day);
  if (cur.h) return commit(`${day}T${cur.h}:${cur.m || "00"}`);
  // Date et heure : il manque l'heure, on la demande sans rien inventer (la case est prête à taper)
  cur.month = new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, 1);
  draw();
  box.querySelector(".dp-time-input").focus();
}

// Heure ou minutes choisies : la valeur est écrite dès qu'on a la date (ou s'il n'y a pas de date à choisir) ;
// done : les minutes, ou une heure tapée, ferment le calendrier. Sans heure, une minute attend l'heure.
function pickTime(h, m, done) {
  cur.bad = false;
  cur.m = m;
  if (!h) { draw(); focusCol("hour"); return; }
  cur.h = h;
  const value = cur.kind === "time" ? `${h}:${m}` : cur.date ? `${cur.date}T${h}:${m}` : "";
  if (value && done) return commit(value);
  if (value) write(value);
  draw();
  if (!done) focusCol("min");
}

const focusCol = (name) => box.querySelector(`[data-${name}][tabindex="0"]`)?.focus();

// Valeur dans le champ, comme une saisie : les formulaires réagissent (nuits, durée…)
function commit(value) {
  const input = field();
  close(true);
  if (input) set(input, value);
}

// Même chose, calendrier laissé ouvert (l'heure est choisie, les minutes pas encore)
function write(value) {
  const input = field();
  if (input) set(input, value);
}

function set(input, value) {
  input.value = value;
  if (!value && input.dataset.day) delete input.dataset.day;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

// Clavier : flèches d'un jour (ou d'une heure) à l'autre, Page ↑ / ↓ d'un mois, Entrée pour choisir ;
// dans la case de l'heure, Entrée valide ce qui est tapé
function onKey(e) {
  const el = e.target;
  if (el.classList.contains("dp-time-input")) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const time = parseTime(el.value);
    if (!time) {
      cur.bad = true;
      draw();
      box.querySelector(".dp-time-input").focus();
      return;
    }
    const [h, m] = time.split(":");
    pickTime(h, m, true);
    if (box) box.querySelector(".dp-time-input").focus(); // pas encore de date : on reste dans la case
  } else if (el.classList.contains("dp-day")) {
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
  } else if (el.classList.contains("dp-time") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    e.preventDefault();
    focusCol(e.key === "ArrowRight" ? "min" : "hour");
  }
}
