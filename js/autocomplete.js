// Suggestions de lieux pendant la saisie
//
// S'applique à tous les champs qui portent l'attribut data-place
// ("place" = villes, régions, pays ; "any" = aussi gares, aéroports, ports).
// Quand on choisit une suggestion, le champ garde ses coordonnées
// (data-lat, data-lng, data-country) pour placer le lieu sur la carte.

import { esc } from "./utils.js";
import { searchPlaces } from "./places.js";

let input = null;      // champ en cours
let list = null;       // liste de suggestions affichée
let items = [];        // suggestions
let active = -1;       // suggestion surlignée au clavier
let timer = null;
let controller = null;

export function bindAutocomplete() {
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("focusout", (e) => {
    if (e.target === input) setTimeout(close, 150);
  });
}

function onInput(e) {
  const el = e.target;
  if (!el.matches || !el.matches("input[data-place]")) return;

  // Saisie manuelle : on oublie le lieu choisi précédemment
  delete el.dataset.picked;
  delete el.dataset.lat;
  delete el.dataset.lng;
  delete el.dataset.country;

  input = el;
  clearTimeout(timer);
  if (el.value.trim().length < 2) return close();
  timer = setTimeout(() => search(el), 250);
}

async function search(el) {
  if (controller) controller.abort();
  controller = new AbortController();
  const q = el.value;
  try {
    const results = await searchPlaces(q, el.dataset.place, controller.signal);
    if (el !== input || el.value !== q) return; // la saisie a changé entre-temps
    items = results;
    active = -1;
    show(el);
  } catch (err) {
    if (err.name !== "AbortError") close();
  }
}

function show(el) {
  const box = el.closest(".ac");
  if (!box) return;
  if (!list || list.parentNode !== box) {
    if (list) list.remove(); // liste restée sous un autre champ
    list = document.createElement("ul");
    list.className = "ac-list";
    list.setAttribute("role", "listbox");
    list.id = el.id + "-list";
    box.appendChild(list);
    el.setAttribute("aria-controls", list.id);
    list.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li[data-i]");
      if (!li) return;
      e.preventDefault(); // garde le focus dans le champ
      pick(+li.dataset.i);
    });
  }
  el.setAttribute("aria-expanded", "true");

  list.innerHTML = items.length
    ? items.map((r, i) => `<li role="option" data-i="${i}" id="${list.id}-${i}" aria-selected="${i === active}" class="${i === active ? "on" : ""}">
        <span class="ac-main"><b>${esc(r.name)}</b>${r.sub ? `<span class="ac-sub">${esc(r.sub)}</span>` : ""}</span>
        <span class="ac-kind">${esc(r.kind)}</span>
      </li>`).join("")
    : `<li class="ac-empty">Aucun lieu trouvé. Vous pouvez garder votre saisie.</li>`;
}

function onKeydown(e) {
  if (!list || e.target !== input) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!items.length) return;
    e.preventDefault();
    active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    show(input);
    input.setAttribute("aria-activedescendant", `${list.id}-${active}`);
  } else if (e.key === "Enter" && active >= 0) {
    e.preventDefault(); // choisit la suggestion au lieu d'envoyer le formulaire
    pick(active);
  } else if (e.key === "Escape") {
    close();
  }
}

function pick(i) {
  const r = items[i];
  if (!r || !input) return;
  input.value = r.name;
  input.dataset.picked = r.name;
  input.dataset.lat = r.lat;
  input.dataset.lng = r.lng;
  input.dataset.country = r.country;
  close();
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function close() {
  if (list) list.remove();
  list = null;
  items = [];
  active = -1;
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
}

// Lieu choisi dans les suggestions pour ce champ (ou null si saisi à la main)
export function pickedPlace(el) {
  if (!el || el.dataset.picked !== el.value || !el.dataset.lat) return null;
  return { lat: +el.dataset.lat, lng: +el.dataset.lng, country: el.dataset.country || "" };
}
