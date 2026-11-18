// Pages sociales : fil d'actualité, Découvrir (et recherche de personnes), profil d'une
// personne, publication d'un itinéraire ; sections « Publier » d'un voyage et « Profil public »

import { esc, MODES, safeUrl, fmtMoney } from "../utils.js";
import { t, count, locale } from "../i18n.js";
import { editText } from "../changes.js";
import { computeBudget } from "../budget.js";
import { state } from "../store.js";
import { prefs, savePrefs, isFavoritePost } from "../prefs.js";
import { invitationsBlock } from "./share.js";
import { selectButtons, selectAttrs, selectBox, selectBar } from "./select.js";
import { isEnabled } from "../cloud.js";
import * as social from "../social.js";
import { COUNTRIES } from "../data/countries.js";
import { fmtHour } from "../utils.js";

const me = () => (state.user ? state.user.uid : null);
const loadingNote = () => `<p class="note">${t("common.loading")}</p>`;
const errorNote = (text = t("social.loadError")) => `<p class="note">${text}</p>`;
const avatar = (p, big = false) => `<span class="avatar${big ? " big" : ""}">${esc(((p && p.name) || "?")[0].toUpperCase())}</span>`;
const fmtDate = (ms) => new Date(ms).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });

const signInPanel = (text) => `<div class="panel">
    <p class="note">${text}</p>
    <div class="row-btns"><button class="btn primary" data-act="open-auth" data-mode="signin" type="button">${t("auth.signIn")}</button></div>
  </div>`;

// Cœur « favori » d'un itinéraire publié (pas sur ses propres itinéraires)
export function postFavButton(p, small = false) {
  if (p.owner === me()) return "";
  const on = isFavoritePost(p.id);
  const label = on ? t("fav.remove") : t("fav.add");
  return `<button class="fav${on ? " on" : ""}${small ? " small" : ""}" data-act="fav-post" data-post="${esc(p.id)}" type="button" aria-pressed="${on}" aria-label="${label}" title="${label}">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
    ${small ? "" : `<span>${on ? t("fav.in") : t("fav.add")}</span>`}
  </button>`;
}

// ---------- Carte d'une publication (dans les listes) ----------
function flagsOf(trip) {
  const codes = new Set(trip.country ? [trip.country] : []);
  (trip.items || []).forEach((i) => {
    const c = i.type === "stop" && COUNTRIES.find((x) => x.name === i.country);
    if (c) codes.add(c.code);
  });
  return [...codes].filter((c) => /^[A-Z]{2}$/.test(c)).slice(0, 4).join(" · ");
}

export function postCard(p) {
  const trip = p.trip || {};
  const stops = (trip.items || []).filter((i) => i.type === "stop");
  const places = stops.map((s) => s.place).filter(Boolean);
  const route = places.length > 4 ? [...places.slice(0, 3), `+${places.length - 3}`] : places;
  return `<article class="trip-card post-card">
    <div class="tc-top">
      <a class="post-author" href="#personne-${esc(p.owner)}">${avatar({ name: p.ownerName })}<span>${esc(p.ownerName)} <span class="handle">@${esc(p.ownerHandle)}</span></span></a>
      <span class="tc-flags" aria-hidden="true">${flagsOf(trip)}</span>
      ${postFavButton(p, true)}
    </div>
    <h2><a class="tc-link" href="#publication-${esc(p.id)}">${esc(p.title)}</a></h2>
    ${route.length ? `<p class="tc-route">${route.map(esc).join(" <span>→</span> ")}</p>` : ""}
    <p class="tc-dates">${trip.kind === "sejour" ? t("trip.kindSejour") : count(stops.length, "count.stop")}${trip.days ? ` · ${count(trip.days, "count.day")}` : ""}${budgetTotal(trip) ? ` · ${esc(budgetTotal(trip))}` : ""} · ${esc(fmtDate(p.publishedAt))}</p>
    ${p.owner === me() ? `<span class="vis-badge is-published">${esc(t("post.published", { who: social.VISIBILITIES[p.visibility] || "" }))}</span>` : ""}
  </article>`;
}

// Total du budget publié, formaté (vide s'il n'est pas montré ou nul)
const budgetTotal = (trip) => {
  const b = trip.budget;
  const sum = b ? b.lodging + b.transport + (b.activities || 0) : 0;
  return sum ? fmtMoney(sum, b.currency) : "";
};

// Ma publication en mode sélection : toucher la carte la coche, sans l'ouvrir
function selectablePostCard(p) {
  const trip = p.trip || {};
  const stops = (trip.items || []).filter((i) => i.type === "stop");
  const places = stops.map((s) => s.place).filter(Boolean);
  const route = places.length > 4 ? [...places.slice(0, 3), `+${places.length - 3}`] : places;
  const on = state.selected.has(p.id);
  return `<article class="trip-card post-card is-selectable${on ? " is-selected" : ""}" ${selectAttrs(p.id)}>
    ${selectBox(p.id, p.title)}
    <div class="tc-top"><span class="tc-flags" aria-hidden="true">${flagsOf(trip)}</span></div>
    <h2>${esc(p.title)}</h2>
    ${route.length ? `<p class="tc-route">${route.map(esc).join(" <span>→</span> ")}</p>` : ""}
    <p class="tc-dates">${trip.kind === "sejour" ? t("trip.kindSejour") : count(stops.length, "count.stop")}${trip.days ? ` · ${count(trip.days, "count.day")}` : ""} · ${esc(fmtDate(p.publishedAt))}</p>
    <span class="vis-badge is-published">${esc(t("post.published", { who: social.VISIBILITIES[p.visibility] || "" }))}</span>
  </article>`;
}

const postGrid = (posts, empty) =>
  posts.length ? `<div class="trip-grid">${posts.map(postCard).join("")}</div>` : `<p class="note">${empty}</p>`;

// ---------- Fil d'actualité ----------
export function feedView() {
  const head = `<header class="page-head"><h1>${t("page.feed")}</h1><p class="lead">${t("meta.feed")}</p></header>`;
  if (!isEnabled()) return `<section class="page">${head}${errorNote(t("social.disabled"))}</section>`;
  if (!state.user) return `<section class="page">${head}${signInPanel(t("feed.signIn"))}</section>`;
  const e = social.load("feed", social.feed);
  const body = e.status === "loading" ? loadingNote()
    : e.status === "error" ? errorNote()
    : !e.data.following
      ? `<div class="empty"><h2>${t("feed.noOne")}</h2>
          <p class="note">${t("feed.findPeople")}</p>
          <a class="btn primary" href="#decouvrir">${t("page.discover")}</a></div>`
      : postGrid(e.data.posts, t("feed.nothing"));
  return `<section class="page">${head}${body}</section>`;
}

// ---------- Découvrir ----------
export function discoverView() {
  const e = isEnabled() ? social.load("discover", social.discover) : { status: "error" };
  const body = e.status === "loading" ? loadingNote()
    : e.status === "error" ? errorNote()
    : postGrid(e.data, t("discover.nothing"));
  return `<section class="page">
    <header class="page-head"><h1>${t("page.discover")}</h1><p class="lead">${t("discover.lead")}</p></header>
    <div class="explore-tools">
      <input type="search" id="peopleSearch" class="search" placeholder="${t("discover.searchHint")}" aria-label="${t("discover.searchLabel")}" autocomplete="off">
      <div id="peopleResults" class="people-results" aria-live="polite"></div>
    </div>
    ${body}
  </section>`;
}

// Résultats de recherche (insérés sans réafficher la page, pour garder la saisie)
export function peopleList(list, emptyText = t("discover.noOne")) {
  if (!list.length) return `<p class="note">${emptyText}</p>`;
  return `<ul class="people">${list.map((p) => `<li>
      <a class="person" href="#personne-${esc(p.uid)}">${avatar(p)}<span><b>${esc(p.name)}</b> <span class="handle">@${esc(p.handle)}</span></span></a>
    </li>`).join("")}</ul>`;
}

// ---------- Profil d'une personne ----------
function followButton(profile, status) {
  if (!isEnabled()) return "";
  if (!state.user) return `<button class="btn primary" data-act="open-auth" data-mode="signin" type="button">${t("follow.signIn")}</button>`;
  if (profile.uid === me()) return `<a class="btn" href="#profil">${t("follow.editMine")}</a>`;
  const attrs = `data-uid="${esc(profile.uid)}"`;
  if (status === "accepted") return `<span class="follow-state">${t("follow.following")}</span><button class="btn small" data-act="unfollow" ${attrs} type="button">${t("follow.unfollow")}</button>`;
  if (status === "pending") return `<span class="follow-state">${t("follow.requested")}</span><button class="btn small" data-act="unfollow" ${attrs} type="button">${t("follow.cancelRequest")}</button>`;
  return `<button class="btn primary" data-act="follow" ${attrs} data-visibility="${esc(profile.visibility)}" type="button">${profile.visibility === "private" ? t("follow.request") : t("follow.follow")}</button>`;
}

export function personView(id) {
  const e = social.load("person:" + id, async () => {
    const profile = await social.getProfile(id);
    if (!profile) return null;
    const status = state.user && id !== me() ? await social.followStatus(id) : null;
    const posts = await social.postsOf(id, status);
    return { profile, status, posts };
  });
  const back = `<a class="back" href="#decouvrir">${t("discover.back")}</a>`;
  if (e.status === "loading") return `<section class="page">${back}${loadingNote()}</section>`;
  if (e.status === "error") return `<section class="page">${back}${errorNote()}</section>`;
  if (!e.data) return `<section class="page">${back}<p>${t("person.notFound")}</p></section>`;

  const { profile: p, status, posts } = e.data;
  const hidden = p.uid !== me() && status !== "accepted" && p.visibility === "private";
  return `<section class="page">
    ${back}
    <header class="person-head">
      ${avatar(p, true)}
      <div class="person-id">
        <h1>${esc(p.name)}</h1>
        <p class="handle">@${esc(p.handle)}${p.visibility === "private" ? ` · <span class="vis-badge">${t("person.private")}</span>` : ""}</p>
        ${p.bio ? `<p class="person-bio">${esc(p.bio)}</p>` : ""}
      </div>
      <div class="row-btns follow-btns">${followButton(p, status)}</div>
    </header>
    <h2 class="section-title">${t("person.itineraries")}</h2>
    ${postGrid(posts, hidden ? t("person.privateNote") : t("person.nothing"))}
  </section>`;
}

// ---------- Publication ----------
export function postView(id) {
  const e = social.load("post:" + id, () => social.getPost(id));
  const back = `<a class="back" href="#decouvrir">${t("discover.back")}</a>`;
  if (e.status === "loading") return `<section class="page">${back}${loadingNote()}</section>`;
  if (e.status === "error" || !e.data) {
    return `<section class="page">${back}<div class="empty">
      <h2>${t("post.notFound")}</h2>
      <p class="note">${t("post.notFoundText")}${state.user ? "" : ` ${t("post.notFoundSignIn")}`}</p>
    </div></section>`;
  }

  const p = e.data;
  const trip = p.trip || { items: [] };
  const items = trip.items || [];
  const stops = items.filter((i) => i.type === "stop");
  const mine = p.owner === me();
  const options = Object.entries(social.VISIBILITIES)
    .map(([k, v]) => `<option value="${k}"${p.visibility === k ? " selected" : ""}>${esc(v)}</option>`).join("");
  const del = state.confirm === "post:" + p.id
    ? `<div class="confirm">${t("post.deleteAsk")}
        <button class="btn small danger" data-act="delete-post-yes" data-post="${esc(p.id)}" type="button">${t("common.delete")}</button>
        <button class="btn small" data-act="cancel-confirm" type="button">${t("common.cancel")}</button></div>`
    : `<button class="btn ghost small danger" data-act="delete-post" data-post="${esc(p.id)}" type="button">${t("post.delete")}</button>`;

  return `<section class="page post">
    ${back}
    <header class="hero">
      <a class="post-author" href="#personne-${esc(p.owner)}">${avatar({ name: p.ownerName })}<span>${esc(p.ownerName)} <span class="handle">@${esc(p.ownerHandle)}</span></span></a>
      <h1>${esc(p.title)}</h1>
      <div class="stats">
        ${trip.kind === "sejour" ? `<span><b>${t("trip.kindSejour")}</b></span>` : `<span>${count(stops.length, "trip.statStops")}</span>`}
        ${trip.days ? `<span><b>${count(trip.days, "count.day")}</b></span>` : ""}
        ${trip.nights ? `<span><b>${count(trip.nights, "count.night")}</b></span>` : ""}
        ${budgetTotal(trip) ? `<span><b>${esc(budgetTotal(trip))}</b></span>` : ""}
      </div>
      <p class="sync-note">${esc(t("post.publishedOn", { date: fmtDate(p.publishedAt) }))}${mine ? "" : ` · ${t("post.readOnly")}`}</p>
      ${mine ? `<div class="post-owner">
          <label class="currency">${t("post.visibleTo")} <select data-post-visibility="${esc(p.id)}">${options}</select></label>
          ${del}
        </div>` : ""}
      <div class="row-btns post-actions">
        ${postFavButton(p)}
        ${stops.length && state.forkOpen !== p.id ? `<button class="btn small" data-act="fork-open" data-post="${esc(p.id)}" type="button">${t("fork.button")}</button>` : ""}
        ${p.visibility === "public" ? `<button class="btn small" data-act="copy-link" type="button">${t("post.copyLink")}</button>` : ""}
      </div>
      ${stops.length && state.forkOpen === p.id ? forkForm(p) : ""}
    </header>
    ${stops.some((s) => s.geo) ? `<section class="map-box" aria-label="${t("post.mapLabel")}"><div id="mapSlot"></div></section>` : ""}
    <section class="route" aria-label="${t("trip.itinerary")}">${items.map((it, i) => readOnlyItem(it, stopRecos(p, i))).join("")}</section>
    ${budgetTotal(trip) ? publicBudgetSection(trip.budget) : ""}
    ${recosSection(p)}
    ${commentsSection(p)}
  </section>`;
}

// Créer son voyage à partir de l'itinéraire : nom et date de départ, rien d'autre à remplir
function forkForm(p) {
  return `<form class="fork panel" data-fork-form="${esc(p.id)}">
    <h2>${t("fork.title")}</h2>
    <p class="note">${esc(t("fork.copy", { handle: p.ownerHandle }))}${state.user ? "" : ` ${t("fork.local")}`}</p>
    <div class="grid">
      <label class="f">${t("trip.nameLabel")}<input name="name" value="${esc(p.title)}" maxlength="200" required></label>
      <label class="f">${t("fork.start")}<input type="date" name="start"></label>
    </div>
    <p class="note">${t("fork.datesNote")}</p>
    <div class="row-btns">
      <button class="btn primary" type="submit">${t("fork.create")}</button>
      <button class="btn" data-act="fork-close" type="button">${t("common.cancel")}</button>
    </div>
  </form>`;
}

// Élément de l'itinéraire, en lecture seule
// recos : recommandations rattachées à cette étape (affichées dans sa carte)
function readOnlyItem(it, recos = []) {
  if (it.type === "transport") {
    return `<article class="item transport">
      <span class="mode">${esc(MODES[it.mode] || t("leg.generic"))}</span>
      <div class="leg">
        <div class="leg-places">${esc(it.from || t("stop.depart"))} → ${esc(it.to || t("stop.arrive"))}</div>
        ${it.duration ? `<div class="leg-times"><span class="dur">${esc(it.duration)}</span></div>` : ""}
      </div>
    </article>`;
  }
  const todos = it.todos || [];
  return `<article class="item stop">
    <div class="stop-head">
      ${it.day ? `<span class="day">${t("stop.dayBadge", { n: +it.day })}</span>` : ""}
      <h2>${esc(it.place || t("post.stop"))}</h2>
      ${it.country ? `<span class="stop-country">${esc(it.country)}</span>` : ""}
    </div>
    ${it.nights === 0 ? `<div class="dates"><span class="nights is-halt">${t("stop.halt")}</span></div>` : it.nights ? `<div class="dates"><span class="nights">${count(+it.nights, "count.night")}</span></div>` : ""}
    ${(it.program || []).length ? programSection(it.program)
      : todos.length ? `<section class="checklist"><div class="cl-head"><h3>${t("post.todo")}</h3></div>
      <ul class="post-todos">${todos.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
    ${recos.length ? `<section class="stop-recos"><div class="cl-head"><h3>${t("reco.title")}</h3></div>
      <ul class="reco-list">${recos.map((r) => recoCard(r, true)).join("")}</ul></section>` : ""}
  </article>`;
}

// Programme d'un séjour publié : un bloc par jour, activités par heure
function programSection(program) {
  const days = [...new Set(program.map((a) => a.day))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  const byTime = (a, b) => (a.time || "99").localeCompare(b.time || "99");
  return `<section class="post-program"><div class="cl-head"><h3>${t("program.title")}</h3></div>
    ${days.map((d) => `<div class="sj-day${d ? "" : " is-loose"}">
      <div class="sj-day-head"><h3>${d ? t("program.day", { n: +d }) : t("post.noDay")}</h3></div>
      <ul class="sj-acts">${program.filter((a) => a.day === d).sort(byTime).map((a) => `<li class="sj-act is-public">
        <div class="sj-act-main">${a.time ? `<time class="sj-time">${esc(fmtHour(a.time))}</time>` : ""}<span class="sj-text">${esc(a.text)}</span></div>
        ${a.how ? `<p class="sj-how"><span><b>${t("program.getThere")}</b> ${esc(a.how)}</span></p>` : ""}
      </li>`).join("")}</ul>
    </div>`).join("")}
  </section>`;
}

// Budget publié, en lecture seule : total, puis coût par destination
function publicBudgetSection(b) {
  const m = (n) => esc(fmtMoney(n, b.currency));
  const sum = (r) => r.lodging + r.transport + r.activities;
  const rows = b.rows.filter(sum);
  return `<section class="budget" aria-label="${t("budget.title")}">
    <div class="budget-head"><h2>${t("budget.title")}</h2></div>
    <div class="budget-total">
      <span class="b-big">${m(sum(b))}</span>
      <span class="note">${t("budget.split", { lodging: m(b.lodging), transport: m(b.transport), activities: m(b.activities) })}</span>
    </div>
    ${rows.length ? `<div class="table-scroll">
      <table class="budget-table">
        <thead><tr><th scope="col">${t("budget.colPlace")}</th><th scope="col">${t("budget.colLodging")}</th><th scope="col">${t("budget.colTransport")}</th><th scope="col">${t("budget.colActivities")}</th><th scope="col">${t("budget.colTotal")}</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <th scope="row">${esc(r.place)}</th>
          <td>${r.lodging ? m(r.lodging) : "–"}</td>
          <td>${r.transport ? m(r.transport) : "–"}</td>
          <td>${r.activities ? m(r.activities) : "–"}</td>
          <td class="b-total">${m(sum(r))}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>` : ""}
    <p class="note">${t("post.budgetNote")}${b.missing ? ` ${count(+b.missing, "post.budgetMissing")}` : ""}</p>
  </section>`;
}

// Données de la carte d'une publication déjà chargée (ou null)
export function loadedPostTrip(id) {
  const e = social.load("post:" + id, () => social.getPost(id));
  return e.status === "ok" && e.data ? e.data.trip : null;
}

// ---------- Publier un voyage (sous l'en-tête du voyage) ----------
// Montrer le budget : au choix, décoché par défaut (seulement s'il y a des prix)
function budgetChoice(trip) {
  const { total } = computeBudget(trip);
  if (!total.total) return "";
  const cur = /^[A-Z]{3}$/.test(trip.currency || "") ? trip.currency : "EUR";
  return `<label class="radio publish-budget"><input type="checkbox" name="budget">
    <span>${esc(t("publish.showBudget", { total: fmtMoney(total.total, cur) }))}</span></label>`;
}

export function publishPanel(trip) {
  if (!isEnabled() || !state.user) return "";
  if (!state.publishOpen) {
    return `<div class="hero-actions"><button class="btn small" data-act="open-publish" type="button">${t("publish.title")}</button></div>`;
  }
  if (!state.profile) {
    return `<div class="publish panel">
      <h2>${t("publish.title")}</h2>
      <p class="note">${t("publish.needProfile")}</p>
      <div class="row-btns"><a class="btn primary" href="#profil">${t("profile.create")}</a>
        <button class="btn" data-act="close-publish" type="button">${t("common.cancel")}</button></div>
    </div>`;
  }
  const def = state.profile.visibility === "private" ? "followers" : "public";
  return `<form class="publish panel" data-publish-form>
    <h2>${t("publish.title")}</h2>
    <label class="f">${t("publish.postTitle")}<input name="title" value="${esc(trip.name)}" maxlength="200" required></label>
    <fieldset class="radios"><legend>${t("post.visibleTo")}</legend>
      ${Object.entries(social.VISIBILITIES).map(([k, v]) => `<label class="radio"><input type="radio" name="visibility" value="${k}"${k === def ? " checked" : ""}> ${esc(v)}${k === "public" ? ` ${t("publish.publicNote")}` : ""}</label>`).join("")}
    </fieldset>
    ${budgetChoice(trip)}
    <p class="note">${t("publish.what")}</p>
    <div class="f-label">${t("publish.recos")}
      <p class="note">${t("publish.recosNote")}</p>
      <div class="recos-edit" data-recos></div>
    </div>
    <div><button class="btn small" data-act="add-reco-row" type="button">${t("publish.addReco")}</button></div>
    <div class="row-btns">
      <button class="btn primary" type="submit">${t("publish.submit")}</button>
      <button class="btn" data-act="close-publish" type="button">${t("common.cancel")}</button>
    </div>
  </form>`;
}

// Lien vers une page de liste : nom, nombre et flèche (« urgent » : nombre en rouge)
const chevronRight = `<svg class="link-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
const listLink = (hash, title, n, urgent = false) => `<li><a class="list-link" href="#${hash}">
    <span>${esc(title)}</span>
    <span class="fold-count${urgent ? " is-urgent" : ""}">${n}</span>
    ${chevronRight}
  </a></li>`;

// Pages des listes de Mon profil
export const NETWORK_PAGES = {
  get demandes() { return t("network.requests"); },
  get abonnes() { return t("network.followers"); },
  get abonnements() { return t("network.following"); },
  get "mes-publications"() { return t("page.publications"); },
};

// ---------- Profil public, abonnés et publications (page Mon profil) ----------
export function socialProfileSection() {
  if (!isEnabled() || !state.user) return "";
  const p = state.profile;
  const form = `<form class="panel" data-profile-form>
    <h2>${t("profile.public")}</h2>
    <p class="note">${p ? t("profile.yours", { link: `<a href="#personne-${esc(me())}">@${esc(p.handle)}</a>` })
      : t("profile.createWhy")}</p>
    <label class="f">${t("profile.name")}<input name="name" value="${esc(p ? p.name : "")}" maxlength="40" required placeholder="${t("profile.nameHint")}"></label>
    <label class="f">${t("profile.handle")}<input name="handle" value="${esc(p ? p.handle : "")}" maxlength="20" required placeholder="${t("profile.handleHint")}" autocomplete="off" autocapitalize="none"></label>
    <label class="f">${t("profile.bio")}<textarea name="bio" maxlength="160" placeholder="${t("profile.bioHint")}">${esc(p ? p.bio : "")}</textarea></label>
    <fieldset class="radios"><legend>${t("settings.account")}</legend>
      <label class="radio"><input type="radio" name="visibility" value="public"${!p || p.visibility === "public" ? " checked" : ""}> ${t("profile.publicAccount")}</label>
      <label class="radio"><input type="radio" name="visibility" value="private"${p && p.visibility === "private" ? " checked" : ""}> ${t("profile.privateAccount")}</label>
    </fieldset>
    <div class="row-btns"><button class="btn primary" type="submit">${p ? t("common.save") : t("profile.create")}</button></div>
  </form>`;
  if (!p) return form;

  const net = social.load("network", social.myNetwork);
  const mine = social.load("mine", () => social.postsOf(me()));
  const n = (e, f) => (e.status === "ok" ? f(e.data) : "…");
  const requests = net.status === "ok" ? net.data.requests.length : 0;

  return `${form}
    <ul class="panel list-links">
      ${requests ? listLink("demandes", t("network.requests"), requests, true) : ""}
      ${listLink("abonnes", t("network.followers"), n(net, (d) => d.followers.length))}
      ${listLink("abonnements", t("network.following"), n(net, (d) => d.following.filter((f) => f.status === "accepted").length))}
      ${listLink("mes-publications", t("page.publications"), n(mine, (d) => d.length))}
    </ul>`;
}

// Titre et description de l'onglet pour un profil ou une publication déjà chargés
export function socialTitle() {
  if (state.view === "person") {
    const e = social.peek("person:" + state.personId);
    const p = e.status === "ok" && e.data && e.data.profile;
    return p ? [`${p.name} (@${p.handle})`, p.bio || t("meta.personOf", { name: p.name })] : [t("meta.person.title"), t("meta.person")];
  }
  const e = social.peek("post:" + state.postId);
  const p = e.status === "ok" && e.data;
  return p ? [p.title, t("meta.postBy", { name: p.ownerName })] : [t("trip.itinerary"), t("meta.post")];
}

// ---------- Recommandations ----------
// Une recommandation dans le panneau de publication (étapes du voyage proposées)
export function recoRow(trip) {
  const id = Math.random().toString(36).slice(2, 8);
  const stops = trip.items.map((it, i) => (it.type === "stop" ? `<option value="${i}">${esc(it.place || t("post.stop"))}</option>` : "")).join("");
  return `<div class="reco-edit" data-reco-row>
    <div class="grid">
      <label class="f">${t("reco.kind")}<select name="recoKind" id="rk-${id}">${Object.entries(social.RECO_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
      <label class="f">${t("profile.name")}<input name="recoName" id="rn-${id}" maxlength="100" placeholder="${t("reco.nameHint")}" required></label>
      <label class="f">${t("reco.where")}<input name="recoWhere" id="rw-${id}" maxlength="120" placeholder="${t("reco.whereHint")}"></label>
      <label class="f">${t("post.stop")}<select name="recoStop" id="rs-${id}"><option value="">${t("reco.wholeTrip")}</option>${stops}</select></label>
      <label class="f full">${t("reco.why")}<textarea name="recoNote" id="ro-${id}" maxlength="500" placeholder="${t("reco.whyHint")}"></textarea></label>
      <label class="f full">${t("reco.link")}<input name="recoUrl" id="ru-${id}" inputmode="url" placeholder="https://…"></label>
    </div>
    <div><button class="btn ghost small" data-act="rm-reco-row" type="button">${t("reco.remove")}</button></div>
  </div>`;
}

// Étape d'une recommandation (index dans l'itinéraire), si elle existe toujours
const recoStop = (p, r) => {
  const items = (p.trip && p.trip.items) || [];
  return Number.isInteger(r.stop) && items[r.stop] && items[r.stop].type === "stop" ? r.stop : null;
};
const stopRecos = (p, i) => (p.recos || []).filter((r) => recoStop(p, r) === i);

// Une recommandation ; withKind : son type en petit (dans une étape, où elles ne sont pas regroupées)
function recoCard(r, withKind = false) {
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.name, r.where].filter(Boolean).join(", "))}`;
  const url = safeUrl(r.url);
  return `<li class="reco">
    ${withKind ? `<span class="reco-tag">${esc(social.RECO_KINDS[r.kind] || "")}</span>` : ""}
    <h4>${esc(r.name)}</h4>
    ${r.where ? `<p class="reco-where">${esc(r.where)}</p>` : ""}
    ${r.note ? `<p class="reco-note">${esc(r.note)}</p>` : ""}
    <p class="reco-links"><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">${t("country.seeOnMap")}</a>
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow ugc">${t("reco.site")}</a>` : ""}</p>
  </li>`;
}

// Recommandations pour tout le voyage (sans étape), regroupées par type, après l'itinéraire
function recosSection(p) {
  const all = p.recos || [];
  const recos = all.filter((r) => recoStop(p, r) === null);
  if (!recos.length) return "";
  const groups = Object.entries(social.RECO_KINDS)
    .map(([kind, label]) => [label, recos.filter((r) => r.kind === kind)])
    .filter(([, list]) => list.length);
  return `<section class="recos" aria-label="${t("reco.title")}">
    <h2>${recos.length < all.length ? t("reco.forWholeTrip") : t("reco.title")}</h2>
    ${groups.map(([label, list]) => `<h3 class="reco-kind">${esc(label)}</h3>
      <ul class="reco-list">${list.map((r) => recoCard(r)).join("")}</ul>`).join("")}
  </section>`;
}

// ---------- Commentaires ----------
const fmtDateTime = (ms) => new Date(ms).toLocaleString(locale(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function commentsSection(p) {
  const e = social.load("comments:" + p.id, () => social.listComments(p.id));
  const list = e.status === "ok" ? e.data : [];
  // Réponses rangées sous leur commentaire ; celles dont le commentaire a disparu restent visibles
  const ids = new Set(list.map((c) => c.id));
  const top = list.filter((c) => !c.replyTo || !ids.has(c.replyTo));
  const repliesOf = (c) => list.filter((r) => r.replyTo === c.id);
  const items = top.map((c) => `<li class="comment">
      ${commentBody(p, c)}
      ${repliesOf(c).length || state.replyTo === c.id ? `<ul class="comment-replies">
        ${repliesOf(c).map((r) => `<li class="comment is-reply">${commentBody(p, r, c)}</li>`).join("")}
        ${state.replyTo === c.id ? `<li>${replyForm(p, c)}</li>` : ""}
      </ul>` : ""}
    </li>`).join("");

  const form = !isEnabled() ? ""
    : !state.user ? `<p class="note">${t("comments.signIn")} <button class="link-btn" data-act="open-auth" data-mode="signin" type="button">${t("auth.signIn")}</button></p>`
    : !state.profile ? `<p class="note">${t("comments.needProfile")} <a href="#profil">${t("profile.create")}</a></p>`
    : `<form class="comment-form" data-comment-form="${esc(p.id)}">
        <label class="f">${t("comments.yours")}<textarea name="text" maxlength="1000" required placeholder="${t("comments.hint")}"></textarea></label>
        <div><button class="btn primary small" type="submit">${t("comments.submit")}</button></div>
      </form>`;

  return `<section class="comments" aria-label="${t("comments.title")}">
    <h2>${t("comments.title")}${list.length ? ` (${list.length})` : ""}</h2>
    ${e.status === "loading" ? loadingNote() : e.status === "error" ? errorNote(t("comments.loadError")) : list.length ? `<ul class="comment-list">${items}</ul>` : `<p class="note">${t("comments.none")}</p>`}
    ${form}
  </section>`;
}

// Un commentaire ou une réponse ; parent : le commentaire auquel la réponse est rattachée
function commentBody(p, c, parent = null) {
  const canDelete = state.user && (c.author === me() || p.owner === me());
  const n = c.likedBy.length;
  const liked = state.user && c.likedBy.includes(me());
  const heart = `<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="${liked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  // On n'aime pas son propre commentaire ; sans compte, on voit seulement le nombre
  const like = !state.user || c.author === me()
    ? (n ? `<span class="comment-like is-static" aria-label="${esc(count(n, "comments.likes"))}">${heart}${n}</span>` : "")
    : `<button class="comment-like${liked ? " is-on" : ""}" data-act="like-comment" data-post="${esc(p.id)}" data-comment="${esc(c.id)}" type="button"
        aria-pressed="${liked}" aria-label="${esc(t(liked ? "comments.unlike" : "comments.like") + (n ? ` (${count(n, "comments.likes")})` : ""))}">${heart}${n || ""}</button>`;
  // Répondre à une réponse : la réponse va sous le même commentaire, sur un seul niveau
  const target = parent || c;
  const reply = state.user && state.profile
    ? `<button class="link-btn" data-act="reply-comment" data-comment="${esc(target.id)}" type="button">${t("comments.reply")}</button>` : "";
  const del = !canDelete ? "" : state.confirm === "comment:" + c.id
    ? `<div class="confirm">${t("comments.deleteAsk")}
        <button class="btn small danger" data-act="delete-comment-yes" data-post="${esc(p.id)}" data-comment="${esc(c.id)}" type="button">${t("common.delete")}</button>
        <button class="btn small" data-act="cancel-confirm" type="button">${t("common.cancel")}</button></div>`
    : `<button class="link-btn" data-act="delete-comment" data-comment="${esc(c.id)}" type="button">${t("common.delete")}</button>`;
  return `<div class="comment-head">
      <a class="post-author" href="#personne-${esc(c.author)}">${avatar({ name: c.authorName })}<span>${esc(c.authorName)} <span class="handle">@${esc(c.authorHandle)}</span></span></a>
      <span class="comment-date">${esc(fmtDateTime(c.createdAt))}</span>
    </div>
    <p class="comment-text">${esc(c.text)}</p>
    <div class="comment-actions">${like}${reply}${del}</div>`;
}

function replyForm(p, c) {
  return `<form class="comment-form" data-comment-form="${esc(p.id)}" data-reply-to="${esc(c.id)}" data-reply-author="${esc(c.author)}">
    <label class="f">${esc(t("comments.replyTo", { name: c.authorName }))}<textarea name="text" maxlength="1000" required placeholder="${t("comments.replyHint")}"></textarea></label>
    <div class="row-btns"><button class="btn primary small" type="submit">${t("comments.reply")}</button>
      <button class="btn small" data-act="reply-cancel" type="button">${t("common.cancel")}</button></div>
  </form>`;
}

// ---------- Notifications ----------
// Nouveautés du menu : notifications pas encore vues, plus invitations en attente de réponse
export const unreadNotifications = () =>
  !state.user ? 0 : social.allNotifications().filter((n) => n.at > (prefs.notifSeen || 0)).length + state.invitations.length;

// La page ouverte : tout est lu (la mise en avant reste visible jusqu'au prochain affichage)
export function markNotificationsSeen() {
  if (!unreadNotifications()) return;
  prefs.notifSeen = Date.now();
  savePrefs();
}

function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return t("ago.now");
  if (min < 60) return t("ago.min", { n: min });
  const h = Math.round(min / 60);
  if (h < 24) return t("ago.hours", { n: h });
  const d = Math.round(h / 24);
  if (d === 1) return t("ago.yesterday");
  if (d < 7) return t("ago.days", { n: d });
  return new Date(ms).toLocaleDateString(locale(), { day: "numeric", month: "long" });
}

function notifLine(n, seen) {
  // Textes du dictionnaire ; tout ce qui vient des utilisateurs est échappé avant d'y être inséré
  const who = `<b>${esc(n.name)}</b>`;
  const quote = (s) => `<span class="notif-quote">${esc(s.length > 90 ? s.slice(0, 90) + "…" : s)}</span>`;
  const [text, href] =
    n.type === "reply" ? [n.postTitle ? t("notif.replyOn", { who, title: esc(n.postTitle), quote: quote(n.text) }) : t("notif.reply", { who, quote: quote(n.text) }), `#publication-${n.postId}`]
    : n.type === "comment" ? [t("notif.comment", { who, title: esc(n.postTitle), quote: quote(n.text) }), `#publication-${n.postId}`]
    : n.type === "request" ? [t("notif.request", { who }), "#profil"]
    : n.type === "accepted" ? [t("notif.accepted", { who }), `#personne-${n.who}`]
    : n.type === "joined" ? [t("notif.joined", { who, trip: esc(n.tripName) }), `#voyage-${n.tripId}`]
    : n.type === "edited" ? [t("notif.edited", { who, trip: esc(n.tripName), what: esc(editText(n.what, n.more)) }), `#voyage-${n.tripId}`]
    : n.type === "favorite" ? [t("notif.favorite", { who, title: esc(n.postTitle) }), `#publication-${n.postId}`]
    : [t("notif.follow", { who }), `#personne-${n.who}`];
  const fresh = n.at > seen;
  return `<li class="notif${fresh ? " is-new" : ""}">
    <a href="${esc(href)}">${avatar({ name: n.name })}
      <span class="notif-text"><span class="notif-msg">${text}</span><span class="notif-time">${esc(ago(n.at))}${fresh ? ` · ${t("notif.new")}` : ""}</span></span>
    </a>
  </li>`;
}

export function notificationsView() {
  const head = `<header class="page-head"><h1>${t("page.notifications")}</h1><p class="lead">${t("notif.lead")}</p></header>`;
  if (!isEnabled()) return `<section class="page">${head}${errorNote(t("social.disabled"))}</section>`;
  if (!state.user) return `<section class="page">${head}${signInPanel(t("notif.signIn"))}</section>`;
  if (!state.notifs) return `<section class="page">${head}${loadingNote()}</section>`;
  const list = social.allNotifications();
  const seen = prefs.notifSeen || 0;
  return `<section class="page">${head}
    ${invitationsBlock()}
    ${list.length
      ? `<ul class="notifs">${list.map((n) => notifLine(n, seen)).join("")}</ul>`
      : state.invitations.length ? "" : `<p class="note">${t("notif.none")}</p>`}
  </section>`;
}

// Page d'une liste de Mon profil : demandes, abonnés, abonnements ou publications
export function networkView(tab) {
  const title = NETWORK_PAGES[tab] || t("page.profile");
  const head = `${tab === "mes-publications" ? "" : `<a class="back" href="#profil">${t("network.back")}</a>`}<header class="page-head"><h1>${esc(title)}</h1>${tab === "mes-publications" ? `<p class="lead">${t("network.postsLead")}</p>` : ""}</header>`;
  if (!state.user) return `<section class="page">${head}${signInPanel(t("network.signIn"))}</section>`;

  const person = (f, buttons) => `<li>
      <a class="person" href="#personne-${esc(f.profile.uid)}">${avatar(f.profile)}<span><b>${esc(f.profile.name)}</b>${f.profile.handle ? ` <span class="handle">@${esc(f.profile.handle)}</span>` : ""}</span></a>
      <span class="row-btns">${buttons}</span>
    </li>`;
  const list = (items, empty, buttons) => (items.length ? `<ul class="people panel">${items.map((f) => person(f, buttons(f))).join("")}</ul>` : `<p class="note">${empty}</p>`);

  if (tab === "mes-publications") {
    const mine = social.load("mine", () => social.postsOf(me()));
    if (mine.status !== "ok") return `<section class="page">${head}${mine.status === "loading" ? loadingNote() : errorNote()}</section>`;
    const posts = mine.data;
    const sel = state.selecting && posts.length > 0;
    const n = posts.filter((p) => state.selected.has(p.id)).length;
    // En-tête avec le bouton « Sélectionner » (pour supprimer plusieurs publications)
    const top = `<header class="page-head trips-head">
        <div><h1>${esc(title)}</h1></div>
        ${selectButtons(posts.map((p) => p.id))}
      </header>
      <p class="lead">${t("network.postsLead")}</p>`;
    const body = !posts.length ? `<p class="note">${t("network.noPosts")}</p>`
      : sel ? `<div class="trip-grid">${posts.map(selectablePostCard).join("")}</div>
          ${selectBar(n, {
            picked: "network.picked",
            hint: t("network.selHint"),
            question: esc(count(n, "network.selQuestion")),
            yesAct: "select-delete-posts-yes",
          })}`
      : postGrid(posts, "");
    return `<section class="page${sel ? " is-selecting" : ""}">${top}${body}</section>`;
  }

  const net = social.load("network", social.myNetwork);
  if (net.status !== "ok") return `<section class="page">${head}${net.status === "loading" ? loadingNote() : errorNote()}</section>`;
  const d = net.data;
  const body =
    tab === "demandes" ? list(d.requests, t("network.noRequests"), (f) => `<button class="btn small primary" data-act="accept-follower" data-uid="${esc(f.follower)}" type="button">${t("network.accept")}</button>
        <button class="btn small" data-act="remove-follower" data-uid="${esc(f.follower)}" type="button">${t("invites.decline")}</button>`)
    : tab === "abonnes" ? list(d.followers, t("network.noFollowers"), (f) => `<button class="btn small" data-act="remove-follower" data-uid="${esc(f.follower)}" type="button">${t("ticket.remove")}</button>`)
    : list(d.following, t("network.noFollowing"), (f) => `${f.status === "pending" ? `<span class="follow-state">${t("network.pending")}</span>` : ""}
        <button class="btn small" data-act="unfollow" data-uid="${esc(f.followed)}" type="button">${f.status === "pending" ? t("common.cancel") : t("follow.unfollow")}</button>`);
  return `<section class="page">${head}${body}</section>`;
}

// Fiche pays : 3 ou 4 itinéraires de voyageurs, les plus mis en favori, comme idées
// (rien pendant le chargement ni s'il n'y en a pas : la fiche reste la même)
export function countryPostsSection(code) {
  if (!isEnabled()) return "";
  const e = social.load("country-posts:" + code, () => social.topPostsIn(code));
  if (e.status !== "ok" || !e.data.length) return "";
  return `<section class="country-posts" aria-labelledby="country-posts-title">
    <h2 id="country-posts-title">${t("ideas.title")}</h2>
    <p class="note">${t("ideas.note")}</p>
    <div class="trip-grid idea-row">${e.data.map(postCard).join("")}</div>
    <p class="note"><a href="#decouvrir">${t("ideas.all")}</a></p>
  </section>`;
}

// Page Favoris : les itinéraires publiés mis en favori
export function favoritePostsSection() {
  const ids = prefs.favoritePosts;
  if (!ids.length) return "";
  const e = social.load("fav-posts:" + ids.join(","), async () => {
    const posts = await Promise.all(ids.map((id) => social.getPost(id).catch(() => null)));
    return { found: posts.filter(Boolean), missing: ids.filter((id, i) => !posts[i]) };
  });
  const body = e.status === "loading" ? loadingNote() : e.status === "error" ? errorNote()
    : `${postGrid(e.data.found, "")}
      ${e.data.missing.length ? `<p class="note">${count(e.data.missing.length, "fav.missing")}
        <button class="link-btn" data-act="forget-missing-posts" data-posts="${esc(e.data.missing.join(","))}" type="button">${t("fav.forget")}</button></p>` : ""}`;
  return `<h2 class="section-title">${t("person.itineraries")}</h2>${body}`;
}
