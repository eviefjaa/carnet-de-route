// « Choisir une destination » : catalogue de pays, fiche détaillée et favoris

import { esc } from "../utils.js";
import { state } from "../store.js";
import { isFavorite } from "../prefs.js";
import { COUNTRIES, CONTINENTS, TAGS, countryByCode } from "../data/countries.js";
import { URGENCES, URGENCES_VERIFIED } from "../data/urgences.js";
import { t, count, getLang, locale } from "../i18n.js";
import { countryName } from "../i18n-data.js";

// Coût sur place : symbole et libellé (clés budget.level1…3)
const budgetSign = (n) => "€".repeat(n);
const budgetLabel = (n) => t(`budget.level${n}`);
const continentName = (c) => t(`continent.${c}`);
// Article Wikipédia dans la langue choisie
const wikiUrl = (x) => `https://${getLang() === "en" ? "en" : "fr"}.wikipedia.org/wiki/${encodeURIComponent(countryName(x.code).replace(/ /g, "_"))}`;

// Frise historique et incontournables détaillés : fichier chargé à la première fiche pays ouverte
// En anglais, les textes des fiches (countries.en.js, urgences.en.js) sont chargés à la première
// page de destinations, et les fiches détaillées en anglais avec la française. Fichier anglais
// absent, hors ligne ou pays manquant : le texte français s'affiche (jamais une fiche vide).
let details = null, loading = null;
let detailsEn = null, loadingDetailsEn = null;
let textsEn = null, loadingTextsEn = null;
const english = () => getLang() === "en";
export const detailsReady = () => !!details && (!english() || !!detailsEn);
export const textsReady = () => !english() || !!textsEn;
export function loadDetails() {
  loading ||= import("../data/country-details.js")
    .then((m) => (details = m.DETAILS))
    .catch(() => (details = {})); // hors ligne : la fiche garde sa version courte
  if (!english()) return loading;
  loadingDetailsEn ||= import("../data/country-details.en.js")
    .then((m) => (detailsEn = m.DETAILS))
    .catch(() => (detailsEn = {}));
  return Promise.all([loading, loadingDetailsEn, loadTexts()]);
}
export function loadTexts() {
  if (!english()) return Promise.resolve();
  loadingTextsEn ||= Promise.all([import("../data/countries.en.js"), import("../data/urgences.en.js")])
    .then(([c, u]) => (textsEn = { countries: Object.fromEntries(c.COUNTRIES.map((x) => [x.code, x])), urgences: u.LABELS }))
    .catch(() => (textsEn = { countries: {}, urgences: {} }));
  return loadingTextsEn;
}

// Textes d'un pays dans la langue choisie (codes, envies, budget : toujours ceux de countries.js)
const TEXT_FIELDS = ["capital", "language", "best", "tagline", "description", "history"];
export function localCountry(x) {
  const e = english() && textsEn && textsEn.countries[x.code];
  if (!e) return x;
  const o = { ...x };
  TEXT_FIELDS.forEach((k) => { if (typeof e[k] === "string" && e[k]) o[k] = e[k]; });
  if (Array.isArray(e.highlights) && e.highlights.length) o.highlights = e.highlights;
  return o;
}
const localDetails = (code) => (english() && detailsEn && detailsEn[code]) || (details && details[code]);

export function favButton(code, small = false) {
  const on = isFavorite(code);
  return `<button class="fav${on ? " on" : ""}${small ? " small" : ""}" data-act="fav" data-code="${code}" type="button"
    aria-pressed="${on}" aria-label="${on ? t("fav.remove") : t("fav.add")}" title="${on ? t("fav.remove") : t("fav.add")}">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
    ${small ? "" : `<span>${on ? t("fav.in") : t("fav.add")}</span>`}
  </button>`;
}

export function countryCard(fr) {
  const x = localCountry(fr);
  // Recherche dans le nom affiché et le nom français (un lien ou une habitude d'une langue à l'autre)
  const search = [countryName(x.code), fr.name, x.capital, fr.capital, continentName(x.continent), ...x.highlights].join(" ").toLowerCase();
  return `<article class="country-card" data-continent="${esc(x.continent)}" data-tags="${x.tags.join(" ")}" data-search="${esc(search)}">
    <span class="cc-code" aria-hidden="true">${esc(x.code)}</span>
    <div class="cc-body">
      <h3><a class="cc-link" href="#destination-${x.code}">${esc(countryName(x.code))}</a></h3>
      <p class="cc-meta">${esc(continentName(x.continent))} · ${budgetSign(x.budget)}</p>
      <p class="cc-tagline">${esc(x.tagline)}</p>
      <div class="cc-tags">${x.tags.slice(0, 3).map((k) => `<span class="tag">${esc(TAGS[k])}</span>`).join("")}</div>
    </div>
    ${favButton(x.code, true)}
  </article>`;
}

// Pays par ordre alphabétique de leur nom affiché (tri de la langue : « Égypte » avec les E)
const byName = () => [...COUNTRIES].sort((a, b) => countryName(a.code).localeCompare(countryName(b.code), locale()));

export function exploreView() {
  const f = state.explore;
  const chip = (filter, value, label) =>
    `<button class="chip${f[filter] === value ? " on" : ""}" data-act="chip" data-filter="${filter}" data-value="${esc(value)}" type="button" aria-pressed="${f[filter] === value}">${esc(label)}</button>`;

  return `<section class="page">
    <header class="page-head">
      <h1>${t("page.explore")}</h1>
      <p class="lead">${t("explore.lead", { n: COUNTRIES.length })}</p>
    </header>
    <div class="explore-tools">
      <input type="search" id="exploreSearch" class="search" value="${esc(f.q)}" placeholder="${t("explore.searchHint")}" aria-label="${t("explore.searchLabel")}">
      <div class="chips" role="group" aria-label="${t("explore.continent")}">${chip("continent", "", t("explore.allContinents"))}${CONTINENTS.map((c) => chip("continent", c, continentName(c))).join("")}</div>
      <div class="chips" role="group" aria-label="${t("explore.tag")}">${chip("tag", "", t("explore.allTags"))}${Object.entries(TAGS).map(([k, v]) => chip("tag", k, v)).join("")}</div>
    </div>
    <p class="note" id="exploreCount"></p>
    <div class="country-grid">${byName().map(countryCard).join("")}</div>
    <p class="note" id="exploreEmpty" hidden>${t("explore.empty")}</p>
  </section>`;
}

const countText = (n) => count(n, "count.destination");

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
  const countEl = document.getElementById("exploreCount");
  if (countEl) countEl.textContent = countText(shown);
}

// postsSection : idées d'itinéraires publiés dans ce pays (views/social.js), vide s'il n'y en a pas
export function countryView(code, postsSection = "") {
  const fr = countryByCode(code);
  if (!fr) {
    return `<section class="page"><a class="back" href="#destinations">${t("explore.back")}</a>
      <p>${t("explore.notFound")}</p></section>`;
  }
  const x = localCountry(fr);
  const d = localDetails(x.code);
  const facts = [
    [t("country.capital"), x.capital],
    [t("country.language"), x.language],
    [t("country.currency"), x.currency],
    [t("country.best"), x.best],
    [t("country.cost"), `${budgetSign(x.budget)} · ${budgetLabel(x.budget)}`],
    [t("country.continent"), continentName(x.continent)],
  ];

  return `<section class="page country">
    <a class="back" href="#destinations">${t("explore.back")}</a>
    <header class="country-head">
      <span class="country-code" aria-hidden="true">${esc(x.code)}</span>
      <div>
        <h1>${esc(countryName(x.code))}</h1>
        <p class="lead">${esc(x.tagline)}</p>
        <div class="cc-tags">${x.tags.map((k) => `<span class="tag">${esc(TAGS[k])}</span>`).join("")}</div>
      </div>
    </header>
    <div class="country-actions">
      <button class="btn primary" data-act="trip-from-country" data-code="${x.code}" type="button">${t("country.createTrip")}</button>
      ${favButton(x.code)}
    </div>
    ${postsSection}
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
    ${urgencesSection(x)}
    <div class="country-text">
      <section><h2>${t("country.about")}</h2><p>${esc(x.description)}</p></section>
      <section>
        <h2>${t("country.history")}</h2>
        <p>${esc(x.history)}</p>
        ${d && d.timeline ? timeline(d.timeline) : ""}
      </section>
      <section>
        <h2>${t("country.highlights")}</h2>
        ${d && d.highlights
          ? highlightCards(d.highlights, x)
          : `<ul class="highlights">${x.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>`}
      </section>
    </div>
    <p class="note"><a href="${esc(wikiUrl(x))}" target="_blank" rel="noopener noreferrer">${t("country.wiki")}</a></p>
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
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([h.name, h.region, countryName(country.code)].filter(Boolean).join(", "))}`;
    return `<li class="hl-card">
      <h3>${esc(h.name)}</h3>
      ${h.region ? `<p class="hl-region">${esc(h.region)}</p>` : ""}
      <p>${esc(h.text)}</p>
      <a class="hl-map" href="${esc(maps)}" target="_blank" rel="noopener noreferrer">${t("country.seeOnMap")}</a>
    </li>`;
  }).join("")}</ol>`;
}

// postsSection : itinéraires publiés mis en favori (views/social.js), vide s'il n'y en a pas
// Numéros d'urgence du pays (données vérifiées sur des sources officielles : js/data/urgences.js)
function urgencesSection(x) {
  const u = URGENCES[x.code];
  if (!u) return "";
  const labelsEn = (english() && textsEn && textsEn.urgences[x.code]) || [];
  // Simple liste (pas de bouton d'appel)
  const line = (label, number, main = false) => number
    ? `<li${main ? ' class="is-main"' : ""}><span>${esc(label)}</span><b class="urgence-num">${esc(number)}</b></li>` : "";
  // Un service joignable au numéro général n'est pas répété (911 aux États-Unis…)
  const own = (n) => (n && n !== u.general ? n : "");
  const rows = [
    line(t("sos.general"), u.general, true),
    line(t("sos.police"), own(u.police)),
    line(t("sos.ambulance"), own(u.ambulance)),
    line(t("sos.fire"), own(u.pompiers)),
    ...(u.autres || []).map((a, i) => line(labelsEn[i] || a.label, a.number)),
  ].join("");
  if (!rows) return "";
  const [y, m] = URGENCES_VERIFIED.split("-").map(Number);
  const when = new Date(y, m - 1, 1).toLocaleDateString(locale(), { month: "long", year: "numeric" });
  return `<section class="panel urgences" aria-label="${t("sos.title")}">
    <h2>${t("sos.title")}</h2>
    <ul class="urgences-list">${rows}</ul>
    <p class="note">${esc(t("sos.note", { when }))}${u.conseils ? ` ${t("sos.embassy", { link: `<a href="${esc(u.conseils)}" target="_blank" rel="noopener noreferrer">${t("sos.advice")}</a>` })}` : ""}</p>
  </section>`;
}

export function favoritesView(codes, postsSection = "") {
  const list = codes.map(countryByCode).filter(Boolean);
  if (!list.length && !postsSection) {
    return `<section class="page">
      <header class="page-head"><h1>${t("page.favorites")}</h1></header>
      <div class="empty">
        <h2>${t("fav.emptyTitle")}</h2>
        <p class="note">${t("fav.emptyText")}</p>
        <div class="row-btns"><a class="btn primary" href="#destinations">${t("page.explore")}</a><a class="btn" href="#decouvrir">${t("fav.discover")}</a></div>
      </div>
    </section>`;
  }
  return `<section class="page">
    <header class="page-head">
      <h1>${t("page.favorites")}</h1>
      <p class="lead">${t("fav.lead")}</p>
    </header>
    ${list.length ? `<h2 class="section-title">${t("fav.destinations")}</h2><div class="country-grid">${list.map(countryCard).join("")}</div>` : ""}
    ${postsSection}
  </section>`;
}
