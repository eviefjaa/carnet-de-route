// « Choisir une destination » : catalogue de pays, fiche détaillée et favoris

import { esc } from "../utils.js";
import { state } from "../store.js";
import { isFavorite } from "../prefs.js";
import { COUNTRIES, CONTINENTS, TAGS, countryByCode, wikiUrl } from "../data/countries.js";

const BUDGET = { 1: ["€", "Bon marché"], 2: ["€€", "Moyen"], 3: ["€€€", "Cher"] };

// Frise historique et incontournables détaillés : fichier chargé à la première fiche pays ouverte
let details = null;
let loading = null;
export const detailsReady = () => !!details;
export function loadDetails() {
  loading ||= import("../data/country-details.js")
    .then((m) => (details = m.DETAILS))
    .catch(() => (details = {})); // hors ligne : la fiche garde sa version courte
  return loading;
}

export function favButton(code, small = false) {
  const on = isFavorite(code);
  return `<button class="fav${on ? " on" : ""}${small ? " small" : ""}" data-act="fav" data-code="${code}" type="button"
    aria-pressed="${on}" aria-label="${on ? "Retirer des favoris" : "Ajouter aux favoris"}" title="${on ? "Retirer des favoris" : "Ajouter aux favoris"}">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
    ${small ? "" : `<span>${on ? "Dans mes favoris" : "Ajouter aux favoris"}</span>`}
  </button>`;
}

export function countryCard(x) {
  const search = [x.name, x.capital, x.continent, ...x.highlights].join(" ").toLowerCase();
  return `<article class="country-card" data-continent="${esc(x.continent)}" data-tags="${x.tags.join(" ")}" data-search="${esc(search)}">
    <span class="cc-code" aria-hidden="true">${esc(x.code)}</span>
    <div class="cc-body">
      <h3><a class="cc-link" href="#destination-${x.code}">${esc(x.name)}</a></h3>
      <p class="cc-meta">${esc(x.continent)} · ${BUDGET[x.budget][0]}</p>
      <p class="cc-tagline">${esc(x.tagline)}</p>
      <div class="cc-tags">${x.tags.slice(0, 3).map((t) => `<span class="tag">${esc(TAGS[t])}</span>`).join("")}</div>
    </div>
    ${favButton(x.code, true)}
  </article>`;
}

export function exploreView() {
  const f = state.explore;
  const chip = (filter, value, label) =>
    `<button class="chip${f[filter] === value ? " on" : ""}" data-act="chip" data-filter="${filter}" data-value="${esc(value)}" type="button" aria-pressed="${f[filter] === value}">${esc(label)}</button>`;

  return `<section class="page">
    <header class="page-head">
      <h1>Choisir une destination</h1>
      <p class="lead">${COUNTRIES.length} pays pour vous inspirer, avec leur histoire et les lieux à ne pas manquer.</p>
    </header>
    <div class="explore-tools">
      <input type="search" id="exploreSearch" class="search" value="${esc(f.q)}" placeholder="Rechercher un pays, une ville, un lieu…" aria-label="Rechercher une destination">
      <div class="chips" role="group" aria-label="Continent">${chip("continent", "", "Tous les continents")}${CONTINENTS.map((c) => chip("continent", c, c)).join("")}</div>
      <div class="chips" role="group" aria-label="Envie">${chip("tag", "", "Toutes les envies")}${Object.entries(TAGS).map(([k, v]) => chip("tag", k, v)).join("")}</div>
    </div>
    <p class="note" id="exploreCount"></p>
    <div class="country-grid">${COUNTRIES.map(countryCard).join("")}</div>
    <p class="note" id="exploreEmpty" hidden>Aucun pays ne correspond. Essayez un autre continent ou une autre envie.</p>
  </section>`;
}

// Filtre les cartes sans tout réafficher (garde la saisie et le défilement)
export function filterCountries() {
  const { q, continent, tag } = state.explore;
  const words = q.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll(".country-card").forEach((card) => {
    const ok =
      (!continent || card.dataset.continent === continent) &&
      (!tag || card.dataset.tags.split(" ").includes(tag)) &&
      (!words || card.dataset.search.includes(words));
    card.hidden = !ok;
    if (ok) shown++;
  });
  const empty = document.getElementById("exploreEmpty");
  if (empty) empty.hidden = shown > 0;
  const count = document.getElementById("exploreCount");
  if (count) count.textContent = `${shown} destination${shown > 1 ? "s" : ""}`;
}

export function countryView(code) {
  const x = countryByCode(code);
  if (!x) {
    return `<section class="page"><a class="back" href="#destinations">← Toutes les destinations</a>
      <p>Cette destination n'existe pas.</p></section>`;
  }
  const d = details && details[x.code];
  const facts = [
    ["Capitale", x.capital],
    ["Langue", x.language],
    ["Monnaie", x.currency],
    ["Meilleure période", x.best],
    ["Coût sur place", `${BUDGET[x.budget][0]} · ${BUDGET[x.budget][1]}`],
    ["Continent", x.continent],
  ];

  return `<section class="page country">
    <a class="back" href="#destinations">← Toutes les destinations</a>
    <header class="country-head">
      <span class="country-code" aria-hidden="true">${esc(x.code)}</span>
      <div>
        <h1>${esc(x.name)}</h1>
        <p class="lead">${esc(x.tagline)}</p>
        <div class="cc-tags">${x.tags.map((t) => `<span class="tag">${esc(TAGS[t])}</span>`).join("")}</div>
      </div>
    </header>
    <div class="country-actions">
      <button class="btn primary" data-act="trip-from-country" data-code="${x.code}" type="button">Créer un voyage dans ce pays</button>
      ${favButton(x.code)}
    </div>
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    <div class="country-text">
      <section><h2>Présentation</h2><p>${esc(x.description)}</p></section>
      <section>
        <h2>Un peu d'histoire</h2>
        <p>${esc(x.history)}</p>
        ${d && d.timeline ? timeline(d.timeline) : ""}
      </section>
      <section>
        <h2>À ne pas manquer</h2>
        ${d && d.highlights
          ? highlightCards(d.highlights, x)
          : `<ul class="highlights">${x.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`}
      </section>
    </div>
    <p class="note"><a href="${wikiUrl(x)}" target="_blank" rel="noopener noreferrer">En savoir plus sur Wikipédia ↗</a></p>
  </section>`;
}

// Grandes périodes de l'histoire du pays
function timeline(periods) {
  return `<ol class="timeline">${periods.map((p) => `<li>
      <span class="tl-period">${esc(p.period)}</span>
      <div class="tl-body"><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
    </li>`).join("")}</ol>`;
}

// Incontournables, avec un lien pour les situer sur une carte
function highlightCards(list, country) {
  return `<ol class="hl-grid">${list.map((h) => {
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([h.name, h.region, country.name].filter(Boolean).join(", "))}`;
    return `<li class="hl-card">
      <h3>${esc(h.name)}</h3>
      ${h.region ? `<p class="hl-region">${esc(h.region)}</p>` : ""}
      <p>${esc(h.text)}</p>
      <a class="hl-map" href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Voir sur la carte ↗</a>
    </li>`;
  }).join("")}</ol>`;
}

// postsSection : itinéraires publiés mis en favori (views/social.js), vide s'il n'y en a pas
export function favoritesView(codes, postsSection = "") {
  const list = codes.map(countryByCode).filter(Boolean);
  if (!list.length && !postsSection) {
    return `<section class="page">
      <header class="page-head"><h1>Favoris</h1></header>
      <div class="empty">
        <h2>Aucun favori pour l'instant</h2>
        <p class="note">Touchez le cœur sur une destination ou sur un itinéraire publié pour le retrouver ici.</p>
        <div class="row-btns"><a class="btn primary" href="#destinations">Choisir une destination</a><a class="btn" href="#decouvrir">Découvrir des itinéraires</a></div>
      </div>
    </section>`;
  }
  return `<section class="page">
    <header class="page-head">
      <h1>Favoris</h1>
      <p class="lead">Les destinations et les itinéraires qui vous font rêver.</p>
    </header>
    ${list.length ? `<h2 class="section-title">Destinations</h2><div class="country-grid">${list.map(countryCard).join("")}</div>` : ""}
    ${postsSection}
  </section>`;
}
