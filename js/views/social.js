// Pages sociales : fil d'actualité, Découvrir (et recherche de personnes), profil d'une
// personne, publication d'un itinéraire ; sections « Publier » d'un voyage et « Profil public »

import { esc, plural, MODES, safeUrl, fmtMoney } from "../utils.js";
import { computeBudget } from "../budget.js";
import { state } from "../store.js";
import { prefs, savePrefs, isFavoritePost } from "../prefs.js";
import { invitationsBlock } from "./share.js";
import { selectButtons, selectAttrs, selectBox, selectBar } from "./select.js";
import { isEnabled } from "../cloud.js";
import * as social from "../social.js";
import { COUNTRIES } from "../data/countries.js";

const me = () => (state.user ? state.user.uid : null);
const loadingNote = `<p class="note">Chargement…</p>`;
const errorNote = (text = "Impossible de charger cette page. Vérifiez votre connexion puis rechargez.") => `<p class="note">${text}</p>`;
const avatar = (p, big = false) => `<span class="avatar${big ? " big" : ""}">${esc(((p && p.name) || "?")[0].toUpperCase())}</span>`;
const fmtDate = (ms) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const signInPanel = (text) => `<div class="panel">
    <p class="note">${text}</p>
    <div class="row-btns"><button class="btn primary" data-act="open-auth" data-mode="signin" type="button">Se connecter</button></div>
  </div>`;

// Cœur « favori » d'un itinéraire publié (pas sur ses propres itinéraires)
export function postFavButton(p, small = false) {
  if (p.owner === me()) return "";
  const on = isFavoritePost(p.id);
  const label = on ? "Retirer des favoris" : "Ajouter aux favoris";
  return `<button class="fav${on ? " on" : ""}${small ? " small" : ""}" data-act="fav-post" data-post="${esc(p.id)}" type="button" aria-pressed="${on}" aria-label="${label}" title="${label}">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>
    ${small ? "" : `<span>${on ? "Dans mes favoris" : "Ajouter aux favoris"}</span>`}
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
    <p class="tc-dates">${trip.kind === "sejour" ? "Séjour" : plural(stops.length, "étape")}${trip.days ? ` · ${plural(trip.days, "jour")}` : ""}${budgetTotal(trip) ? ` · ${esc(budgetTotal(trip))}` : ""} · ${esc(fmtDate(p.publishedAt))}</p>
    ${p.owner === me() ? `<span class="vis-badge is-published">Publié · ${esc(social.VISIBILITIES[p.visibility] || "")}</span>` : ""}
  </article>`;
}

// Total du budget publié, formaté (vide s'il n'est pas montré ou nul)
const budgetTotal = (trip) => {
  const b = trip.budget;
  return b && b.lodging + b.transport ? fmtMoney(b.lodging + b.transport, b.currency) : "";
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
    <p class="tc-dates">${trip.kind === "sejour" ? "Séjour" : plural(stops.length, "étape")}${trip.days ? ` · ${plural(trip.days, "jour")}` : ""} · ${esc(fmtDate(p.publishedAt))}</p>
    <span class="vis-badge is-published">Publié · ${esc(social.VISIBILITIES[p.visibility] || "")}</span>
  </article>`;
}

const postGrid = (posts, empty) =>
  posts.length ? `<div class="trip-grid">${posts.map(postCard).join("")}</div>` : `<p class="note">${empty}</p>`;

// ---------- Fil d'actualité ----------
export function feedView() {
  const head = `<header class="page-head"><h1>Fil d'actualité</h1><p class="lead">Les derniers itinéraires des voyageurs que vous suivez.</p></header>`;
  if (!isEnabled()) return `<section class="page">${head}${errorNote("Les comptes ne sont pas activés sur ce site.")}</section>`;
  if (!state.user) return `<section class="page">${head}${signInPanel("Connectez-vous pour suivre des voyageurs et voir leurs itinéraires ici.")}</section>`;
  const e = social.load("feed", social.feed);
  const body = e.status === "loading" ? loadingNote
    : e.status === "error" ? errorNote()
    : !e.data.following
      ? `<div class="empty"><h2>Vous ne suivez personne pour l'instant</h2>
          <p class="note">Trouvez des voyageurs et des itinéraires qui vous inspirent.</p>
          <a class="btn primary" href="#decouvrir">Découvrir</a></div>`
      : postGrid(e.data.posts, "Les personnes que vous suivez n'ont encore rien publié.");
  return `<section class="page">${head}${body}</section>`;
}

// ---------- Découvrir ----------
export function discoverView() {
  const e = isEnabled() ? social.load("discover", social.discover) : { status: "error" };
  const body = e.status === "loading" ? loadingNote
    : e.status === "error" ? errorNote()
    : postGrid(e.data, "Aucun itinéraire public pour l'instant. Soyez le premier à publier le vôtre !");
  return `<section class="page">
    <header class="page-head"><h1>Découvrir</h1><p class="lead">Les derniers itinéraires publiés par la communauté.</p></header>
    <div class="explore-tools">
      <input type="search" id="peopleSearch" class="search" placeholder="Rechercher une personne : nom ou @pseudo" aria-label="Rechercher une personne" autocomplete="off">
      <div id="peopleResults" class="people-results" aria-live="polite"></div>
    </div>
    ${body}
  </section>`;
}

// Résultats de recherche (insérés sans réafficher la page, pour garder la saisie)
export function peopleList(list, emptyText = "Personne trouvé(e).") {
  if (!list.length) return `<p class="note">${emptyText}</p>`;
  return `<ul class="people">${list.map((p) => `<li>
      <a class="person" href="#personne-${esc(p.uid)}">${avatar(p)}<span><b>${esc(p.name)}</b> <span class="handle">@${esc(p.handle)}</span></span></a>
    </li>`).join("")}</ul>`;
}

// ---------- Profil d'une personne ----------
function followButton(profile, status) {
  if (!isEnabled()) return "";
  if (!state.user) return `<button class="btn primary" data-act="open-auth" data-mode="signin" type="button">Se connecter pour s'abonner</button>`;
  if (profile.uid === me()) return `<a class="btn" href="#profil">Modifier mon profil</a>`;
  const attrs = `data-uid="${esc(profile.uid)}"`;
  if (status === "accepted") return `<span class="follow-state">Abonné(e)</span><button class="btn small" data-act="unfollow" ${attrs} type="button">Se désabonner</button>`;
  if (status === "pending") return `<span class="follow-state">Demande envoyée</span><button class="btn small" data-act="unfollow" ${attrs} type="button">Annuler la demande</button>`;
  return `<button class="btn primary" data-act="follow" ${attrs} data-visibility="${esc(profile.visibility)}" type="button">${profile.visibility === "private" ? "Demander à s'abonner" : "S'abonner"}</button>`;
}

export function personView(id) {
  const e = social.load("person:" + id, async () => {
    const profile = await social.getProfile(id);
    if (!profile) return null;
    const status = state.user && id !== me() ? await social.followStatus(id) : null;
    const posts = await social.postsOf(id, status);
    return { profile, status, posts };
  });
  const back = `<a class="back" href="#decouvrir">← Découvrir</a>`;
  if (e.status === "loading") return `<section class="page">${back}${loadingNote}</section>`;
  if (e.status === "error") return `<section class="page">${back}${errorNote()}</section>`;
  if (!e.data) return `<section class="page">${back}<p>Ce profil n'existe pas.</p></section>`;

  const { profile: p, status, posts } = e.data;
  const hidden = p.uid !== me() && status !== "accepted" && p.visibility === "private";
  return `<section class="page">
    ${back}
    <header class="person-head">
      ${avatar(p, true)}
      <div class="person-id">
        <h1>${esc(p.name)}</h1>
        <p class="handle">@${esc(p.handle)}${p.visibility === "private" ? ` · <span class="vis-badge">Compte privé</span>` : ""}</p>
        ${p.bio ? `<p class="person-bio">${esc(p.bio)}</p>` : ""}
      </div>
      <div class="row-btns follow-btns">${followButton(p, status)}</div>
    </header>
    <h2 class="section-title">Itinéraires</h2>
    ${postGrid(posts, hidden ? "Ce compte est privé : abonnez-vous pour voir les itinéraires réservés à ses abonnés." : "Aucun itinéraire visible pour l'instant.")}
  </section>`;
}

// ---------- Publication ----------
export function postView(id) {
  const e = social.load("post:" + id, () => social.getPost(id));
  const back = `<a class="back" href="#decouvrir">← Découvrir</a>`;
  if (e.status === "loading") return `<section class="page">${back}${loadingNote}</section>`;
  if (e.status === "error" || !e.data) {
    return `<section class="page">${back}<div class="empty">
      <h2>Itinéraire introuvable</h2>
      <p class="note">Il a peut-être été supprimé, ou il n'est visible que par certaines personnes.${state.user ? "" : " Connectez-vous si vous êtes abonné(e) à son auteur."}</p>
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
    ? `<div class="confirm">Supprimer cette publication ? Votre voyage, lui, n'est pas touché.
        <button class="btn small danger" data-act="delete-post-yes" data-post="${esc(p.id)}" type="button">Supprimer</button>
        <button class="btn small" data-act="cancel-confirm" type="button">Annuler</button></div>`
    : `<button class="btn ghost small danger" data-act="delete-post" data-post="${esc(p.id)}" type="button">Supprimer la publication</button>`;

  return `<section class="page post">
    ${back}
    <header class="hero">
      <a class="post-author" href="#personne-${esc(p.owner)}">${avatar({ name: p.ownerName })}<span>${esc(p.ownerName)} <span class="handle">@${esc(p.ownerHandle)}</span></span></a>
      <h1>${esc(p.title)}</h1>
      <div class="stats">
        ${trip.kind === "sejour" ? `<span><b>Séjour</b></span>` : `<span><b>${stops.length}</b> étape${stops.length > 1 ? "s" : ""}</span>`}
        ${trip.days ? `<span><b>${plural(trip.days, "jour")}</b></span>` : ""}
        ${trip.nights ? `<span><b>${plural(trip.nights, "nuit")}</b></span>` : ""}
        ${budgetTotal(trip) ? `<span><b>${esc(budgetTotal(trip))}</b></span>` : ""}
      </div>
      <p class="sync-note">Publié le ${esc(fmtDate(p.publishedAt))}${mine ? "" : " · lecture seule"}</p>
      ${mine ? `<div class="post-owner">
          <label class="currency">Visible par <select data-post-visibility="${esc(p.id)}">${options}</select></label>
          ${del}
        </div>` : ""}
      <div class="row-btns post-actions">
        ${postFavButton(p)}
        ${p.visibility === "public" ? `<button class="btn small" data-act="copy-link" type="button">Copier le lien de partage</button>` : ""}
      </div>
    </header>
    ${stops.some((s) => s.geo) ? `<section class="map-box" aria-label="Carte de l'itinéraire"><div id="mapSlot"></div></section>` : ""}
    <section class="route" aria-label="Itinéraire">${items.map((it, i) => readOnlyItem(it, stopRecos(p, i))).join("")}</section>
    ${budgetTotal(trip) ? publicBudgetSection(trip.budget) : ""}
    ${recosSection(p)}
    ${commentsSection(p)}
  </section>`;
}

// Élément de l'itinéraire, en lecture seule
// recos : recommandations rattachées à cette étape (affichées dans sa carte)
function readOnlyItem(it, recos = []) {
  if (it.type === "transport") {
    return `<article class="item transport">
      <span class="mode">${esc(MODES[it.mode] || "Trajet")}</span>
      <div class="leg">
        <div class="leg-places">${esc(it.from || "Départ")} → ${esc(it.to || "Arrivée")}</div>
        ${it.duration ? `<div class="leg-times"><span class="dur">${esc(it.duration)}</span></div>` : ""}
      </div>
    </article>`;
  }
  const todos = it.todos || [];
  return `<article class="item stop">
    <div class="stop-head">
      ${it.day ? `<span class="day">JOUR ${+it.day}</span>` : ""}
      <h2>${esc(it.place || "Étape")}</h2>
      ${it.country ? `<span class="stop-country">${esc(it.country)}</span>` : ""}
    </div>
    ${it.nights === 0 ? `<div class="dates"><span class="nights is-halt">Arrêt</span></div>` : it.nights ? `<div class="dates"><span class="nights">${plural(+it.nights, "nuit")}</span></div>` : ""}
    ${(it.program || []).length ? programSection(it.program)
      : todos.length ? `<section class="checklist"><div class="cl-head"><h3>À faire</h3></div>
      <ul class="post-todos">${todos.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>` : ""}
    ${recos.length ? `<section class="stop-recos"><div class="cl-head"><h3>Recommandations</h3></div>
      <ul class="reco-list">${recos.map((r) => recoCard(r, true)).join("")}</ul></section>` : ""}
  </article>`;
}

// Programme d'un séjour publié : un bloc par jour, activités par heure
function programSection(program) {
  const days = [...new Set(program.map((a) => a.day))].sort((a, b) => (a ?? 1e9) - (b ?? 1e9));
  const byTime = (a, b) => (a.time || "99").localeCompare(b.time || "99");
  return `<section class="post-program"><div class="cl-head"><h3>Programme</h3></div>
    ${days.map((d) => `<div class="sj-day${d ? "" : " is-loose"}">
      <div class="sj-day-head"><h3>${d ? `Jour ${+d}` : "Sans jour précis"}</h3></div>
      <ul class="sj-acts">${program.filter((a) => a.day === d).sort(byTime).map((a) => `<li class="sj-act is-public">
        <div class="sj-act-main">${a.time ? `<time class="sj-time">${esc(a.time.replace(":", " h "))}</time>` : ""}<span class="sj-text">${esc(a.text)}</span></div>
        ${a.how ? `<p class="sj-how"><span><b>Y aller :</b> ${esc(a.how)}</span></p>` : ""}
      </li>`).join("")}</ul>
    </div>`).join("")}
  </section>`;
}

// Budget publié, en lecture seule : total, puis coût par destination
function publicBudgetSection(b) {
  const m = (n) => esc(fmtMoney(n, b.currency));
  const rows = b.rows.filter((r) => r.lodging + r.transport);
  return `<section class="budget" aria-label="Budget">
    <div class="budget-head"><h2>Budget</h2></div>
    <div class="budget-total">
      <span class="b-big">${m(b.lodging + b.transport)}</span>
      <span class="note">dont ${m(b.lodging)} d'hébergement et ${m(b.transport)} de transport</span>
    </div>
    ${rows.length ? `<div class="table-scroll">
      <table class="budget-table">
        <thead><tr><th scope="col">Destination</th><th scope="col">Hébergement</th><th scope="col">Transport</th><th scope="col">Total</th></tr></thead>
        <tbody>${rows.map((r) => `<tr>
          <th scope="row">${esc(r.place)}</th>
          <td>${r.lodging ? m(r.lodging) : "–"}</td>
          <td>${r.transport ? m(r.transport) : "–"}</td>
          <td class="b-total">${m(r.lodging + r.transport)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>` : ""}
    <p class="note">Hébergement et transport seulement, d'après les prix notés par l'auteur.${b.missing ? ` ${+b.missing} prix n'${b.missing > 1 ? "étaient" : "était"} pas encore renseigné${b.missing > 1 ? "s" : ""}.` : ""}</p>
  </section>`;
}

// Données de la carte d'une publication déjà chargée (ou null)
export function loadedPostTrip(id) {
  const e = social.load("post:" + id, () => social.getPost(id));
  return e.status === "ok" && e.data ? e.data.trip : null;
}

// ---------- Publier un voyage (sous l'en-tête du voyage) ----------
// Montrer le budget : au choix, décoché par défaut (seulement s'il y a des prix)
function budgetChoice(t) {
  const { total } = computeBudget(t);
  if (!total.total) return "";
  const cur = /^[A-Z]{3}$/.test(t.currency || "") ? t.currency : "EUR";
  return `<label class="radio publish-budget"><input type="checkbox" name="budget">
    <span>Montrer le budget : ${esc(fmtMoney(total.total, cur))}, avec le coût de chaque destination (hébergement et transport)</span></label>`;
}

export function publishPanel(t) {
  if (!isEnabled() || !state.user) return "";
  if (!state.publishOpen) {
    return `<div class="hero-actions"><button class="btn small" data-act="open-publish" type="button">Publier l'itinéraire</button></div>`;
  }
  if (!state.profile) {
    return `<div class="publish panel">
      <h2>Publier l'itinéraire</h2>
      <p class="note">Pour publier, créez d'abord votre profil : un nom et un pseudo.</p>
      <div class="row-btns"><a class="btn primary" href="#profil">Créer mon profil</a>
        <button class="btn" data-act="close-publish" type="button">Annuler</button></div>
    </div>`;
  }
  const def = state.profile.visibility === "private" ? "followers" : "public";
  return `<form class="publish panel" data-publish-form>
    <h2>Publier l'itinéraire</h2>
    <label class="f">Titre<input name="title" value="${esc(t.name)}" maxlength="200" required></label>
    <fieldset class="radios"><legend>Visible par</legend>
      ${Object.entries(social.VISIBILITIES).map(([k, v]) => `<label class="radio"><input type="radio" name="visibility" value="${k}"${k === def ? " checked" : ""}> ${esc(v)}${k === "public" ? " (même sans compte, avec le lien)" : ""}</label>`).join("")}
    </fieldset>
    ${budgetChoice(t)}
    <p class="note"><b>Publié :</b> les étapes, les activités, la carte (positions arrondies à environ 2 km) et les trajets, avec leurs lieux de départ et d'arrivée tels que vous les avez écrits. « Jour 1, Jour 2… » remplacent les dates.<br>
      <b>Jamais publié :</b> dates, prix (sauf le budget si vous le montrez), notes, adresses d'hébergement, liens et numéros de réservation, billets, co-voyageurs.<br>
      La publication est une copie : vos modifications du voyage ne s'y reportent pas, et personne ne peut la modifier.</p>
    <div class="f-label">Recommandations (facultatif)
      <p class="note">Vos bonnes adresses : un restaurant, un hébergement, un lieu à voir. Elles seront visibles par les mêmes personnes que l'itinéraire.</p>
      <div class="recos-edit" data-recos></div>
    </div>
    <div><button class="btn small" data-act="add-reco-row" type="button">+ Ajouter une recommandation</button></div>
    <div class="row-btns">
      <button class="btn primary" type="submit">Publier</button>
      <button class="btn" data-act="close-publish" type="button">Annuler</button>
    </div>
  </form>`;
}

// Lien vers une page de liste : nom, nombre et flèche (« urgent » : nombre en rouge)
const chevronRight = `<svg class="link-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;
const listLink = (hash, title, count, urgent = false) => `<li><a class="list-link" href="#${hash}">
    <span>${esc(title)}</span>
    <span class="fold-count${urgent ? " is-urgent" : ""}">${count}</span>
    ${chevronRight}
  </a></li>`;

// Pages des listes de Mon profil
export const NETWORK_PAGES = {
  demandes: "Demandes d'abonnement",
  abonnes: "Abonnés",
  abonnements: "Abonnements",
  "mes-publications": "Mes publications",
};

// ---------- Profil public, abonnés et publications (page Mon profil) ----------
export function socialProfileSection() {
  if (!isEnabled() || !state.user) return "";
  const p = state.profile;
  const form = `<form class="panel" data-profile-form>
    <h2>Profil public</h2>
    <p class="note">${p ? `Votre profil : <a href="#personne-${esc(me())}">@${esc(p.handle)}</a>. Votre adresse e-mail n'y apparaît jamais.`
      : "Créez votre profil pour publier vos itinéraires et suivre d'autres voyageurs. Votre adresse e-mail n'y apparaît jamais."}</p>
    <label class="f">Nom<input name="name" value="${esc(p ? p.name : "")}" maxlength="40" required placeholder="Ex. Evie"></label>
    <label class="f">Pseudo (lettres minuscules, chiffres, point, tiret bas)<input name="handle" value="${esc(p ? p.handle : "")}" maxlength="20" required placeholder="ex. evie.voyage" autocomplete="off" autocapitalize="none"></label>
    <label class="f">Bio<textarea name="bio" maxlength="160" placeholder="Quelques mots sur vous et vos voyages">${esc(p ? p.bio : "")}</textarea></label>
    <fieldset class="radios"><legend>Compte</legend>
      <label class="radio"><input type="radio" name="visibility" value="public"${!p || p.visibility === "public" ? " checked" : ""}> Public : tout le monde peut s'abonner</label>
      <label class="radio"><input type="radio" name="visibility" value="private"${p && p.visibility === "private" ? " checked" : ""}> Privé : vous acceptez chaque abonnement</label>
    </fieldset>
    <div class="row-btns"><button class="btn primary" type="submit">${p ? "Enregistrer" : "Créer mon profil"}</button></div>
  </form>`;
  if (!p) return form;

  const net = social.load("network", social.myNetwork);
  const mine = social.load("mine", () => social.postsOf(me()));
  const n = (e, f) => (e.status === "ok" ? f(e.data) : "…");
  const requests = net.status === "ok" ? net.data.requests.length : 0;

  return `${form}
    <ul class="panel list-links">
      ${requests ? listLink("demandes", "Demandes d'abonnement", requests, true) : ""}
      ${listLink("abonnes", "Abonnés", n(net, (d) => d.followers.length))}
      ${listLink("abonnements", "Abonnements", n(net, (d) => d.following.filter((f) => f.status === "accepted").length))}
      ${listLink("mes-publications", "Mes publications", n(mine, (d) => d.length))}
    </ul>`;
}

// Titre et description de l'onglet pour un profil ou une publication déjà chargés
export function socialTitle() {
  if (state.view === "person") {
    const e = social.peek("person:" + state.personId);
    const p = e.status === "ok" && e.data && e.data.profile;
    return p ? [`${p.name} (@${p.handle})`, p.bio || `Les itinéraires de ${p.name} sur Croquilo.`] : ["Profil", "Profil d'un voyageur sur Croquilo."];
  }
  const e = social.peek("post:" + state.postId);
  const p = e.status === "ok" && e.data;
  return p ? [p.title, `Itinéraire publié par ${p.ownerName} sur Croquilo.`] : ["Itinéraire", "Itinéraire publié sur Croquilo."];
}

// ---------- Recommandations ----------
// Une recommandation dans le panneau de publication (étapes du voyage proposées)
export function recoRow(trip) {
  const id = Math.random().toString(36).slice(2, 8);
  const stops = trip.items.map((it, i) => (it.type === "stop" ? `<option value="${i}">${esc(it.place || "Étape")}</option>` : "")).join("");
  return `<div class="reco-edit" data-reco-row>
    <div class="grid">
      <label class="f">Type<select name="recoKind" id="rk-${id}">${Object.entries(social.RECO_KINDS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("")}</select></label>
      <label class="f">Nom<input name="recoName" id="rn-${id}" maxlength="100" placeholder="Ex. Chez Jo" required></label>
      <label class="f">Où<input name="recoWhere" id="rw-${id}" maxlength="120" placeholder="Ville, quartier ou adresse"></label>
      <label class="f">Étape<select name="recoStop" id="rs-${id}"><option value="">Tout le voyage</option>${stops}</select></label>
      <label class="f full">Pourquoi<textarea name="recoNote" id="ro-${id}" maxlength="500" placeholder="Ce qui vous a plu, ce qu'il faut commander, à quelle heure y aller…"></textarea></label>
      <label class="f full">Lien (facultatif)<input name="recoUrl" id="ru-${id}" inputmode="url" placeholder="https://…"></label>
    </div>
    <div><button class="btn ghost small" data-act="rm-reco-row" type="button">Retirer cette recommandation</button></div>
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
    <p class="reco-links"><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Voir sur la carte ↗</a>
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow ugc">Site ↗</a>` : ""}</p>
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
  return `<section class="recos" aria-label="Recommandations">
    <h2>${recos.length < all.length ? "Pour tout le voyage" : "Recommandations"}</h2>
    ${groups.map(([label, list]) => `<h3 class="reco-kind">${esc(label)}</h3>
      <ul class="reco-list">${list.map((r) => recoCard(r)).join("")}</ul>`).join("")}
  </section>`;
}

// ---------- Commentaires ----------
const fmtDateTime = (ms) => new Date(ms).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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
    : !state.user ? `<p class="note">Connectez-vous pour commenter. <button class="link-btn" data-act="open-auth" data-mode="signin" type="button">Se connecter</button></p>`
    : !state.profile ? `<p class="note">Pour commenter, créez d'abord votre profil (un nom et un pseudo), que votre compte soit public ou privé. <a href="#profil">Créer mon profil</a></p>`
    : `<form class="comment-form" data-comment-form="${esc(p.id)}">
        <label class="f">Votre commentaire<textarea name="text" maxlength="1000" required placeholder="Une question, un conseil, un merci…"></textarea></label>
        <div><button class="btn primary small" type="submit">Publier le commentaire</button></div>
      </form>`;

  return `<section class="comments" aria-label="Commentaires">
    <h2>Commentaires${list.length ? ` (${list.length})` : ""}</h2>
    ${e.status === "loading" ? loadingNote : e.status === "error" ? errorNote("Impossible de charger les commentaires.") : list.length ? `<ul class="comment-list">${items}</ul>` : `<p class="note">Aucun commentaire pour l'instant.</p>`}
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
    ? (n ? `<span class="comment-like is-static" aria-label="${n} j'aime">${heart}${n}</span>` : "")
    : `<button class="comment-like${liked ? " is-on" : ""}" data-act="like-comment" data-post="${esc(p.id)}" data-comment="${esc(c.id)}" type="button"
        aria-pressed="${liked}" aria-label="${liked ? "Je n'aime plus" : "J'aime"} ce commentaire${n ? ` (${n} j'aime)` : ""}">${heart}${n || ""}</button>`;
  // Répondre à une réponse : la réponse va sous le même commentaire, sur un seul niveau
  const target = parent || c;
  const reply = state.user && state.profile
    ? `<button class="link-btn" data-act="reply-comment" data-comment="${esc(target.id)}" type="button">Répondre</button>` : "";
  const del = !canDelete ? "" : state.confirm === "comment:" + c.id
    ? `<div class="confirm">Supprimer ce commentaire ?
        <button class="btn small danger" data-act="delete-comment-yes" data-post="${esc(p.id)}" data-comment="${esc(c.id)}" type="button">Supprimer</button>
        <button class="btn small" data-act="cancel-confirm" type="button">Annuler</button></div>`
    : `<button class="link-btn" data-act="delete-comment" data-comment="${esc(c.id)}" type="button">Supprimer</button>`;
  return `<div class="comment-head">
      <a class="post-author" href="#personne-${esc(c.author)}">${avatar({ name: c.authorName })}<span>${esc(c.authorName)} <span class="handle">@${esc(c.authorHandle)}</span></span></a>
      <span class="comment-date">${esc(fmtDateTime(c.createdAt))}</span>
    </div>
    <p class="comment-text">${esc(c.text)}</p>
    <div class="comment-actions">${like}${reply}${del}</div>`;
}

function replyForm(p, c) {
  return `<form class="comment-form" data-comment-form="${esc(p.id)}" data-reply-to="${esc(c.id)}" data-reply-author="${esc(c.author)}">
    <label class="f">Répondre à ${esc(c.authorName)}<textarea name="text" maxlength="1000" required placeholder="Votre réponse…"></textarea></label>
    <div class="row-btns"><button class="btn primary small" type="submit">Répondre</button>
      <button class="btn small" data-act="reply-cancel" type="button">Annuler</button></div>
  </form>`;
}

// ---------- Notifications ----------
// Nouveautés du menu : notifications pas encore vues, plus invitations en attente de réponse
export const unreadNotifications = () =>
  !state.user ? 0
    : (state.notifs ? state.notifs.list.filter((n) => n.at > (prefs.notifSeen || 0)).length : 0) + state.invitations.length;

// La page ouverte : tout est lu (la mise en avant reste visible jusqu'au prochain affichage)
export function markNotificationsSeen() {
  if (!unreadNotifications()) return;
  prefs.notifSeen = Date.now();
  savePrefs();
}

function ago(ms) {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} jours`;
  return new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function notifLine(n, seen) {
  const who = `<b>${esc(n.name)}</b>`;
  const [text, href] =
    n.type === "reply" ? [`${who} a répondu à votre commentaire${n.postTitle ? ` sur « ${esc(n.postTitle)} »` : ""} : <span class="notif-quote">${esc(n.text.length > 90 ? n.text.slice(0, 90) + "…" : n.text)}</span>`, `#publication-${n.postId}`]
    : n.type === "comment" ? [`${who} a commenté « ${esc(n.postTitle)} » : <span class="notif-quote">${esc(n.text.length > 90 ? n.text.slice(0, 90) + "…" : n.text)}</span>`, `#publication-${n.postId}`]
    : n.type === "request" ? [`${who} demande à s'abonner à vous. Vous pouvez accepter ou refuser dans Mon profil.`, "#profil"]
    : n.type === "accepted" ? [`${who} a accepté votre demande d'abonnement.`, `#personne-${n.who}`]
    : n.type === "joined" ? [`${who} a rejoint votre voyage « ${esc(n.tripName)} ».`, `#voyage-${n.tripId}`]
    : n.type === "favorite" ? [`${who} a ajouté « ${esc(n.postTitle)} » à ses favoris.`, `#publication-${n.postId}`]
    : [`${who} s'est abonné(e) à vous.`, `#personne-${n.who}`];
  const fresh = n.at > seen;
  return `<li class="notif${fresh ? " is-new" : ""}">
    <a href="${esc(href)}">${avatar({ name: n.name })}
      <span class="notif-text"><span class="notif-msg">${text}</span><span class="notif-time">${esc(ago(n.at))}${fresh ? " · nouveau" : ""}</span></span>
    </a>
  </li>`;
}

export function notificationsView() {
  const head = `<header class="page-head"><h1>Notifications</h1><p class="lead">Commentaires, favoris, abonnements et voyageurs qui rejoignent vos voyages.</p></header>`;
  if (!isEnabled()) return `<section class="page">${head}${errorNote("Les comptes ne sont pas activés sur ce site.")}</section>`;
  if (!state.user) return `<section class="page">${head}${signInPanel("Connectez-vous pour voir qui commente vos itinéraires et qui s'abonne à vous.")}</section>`;
  if (!state.notifs) return `<section class="page">${head}${loadingNote}</section>`;
  const list = state.notifs.list;
  const seen = prefs.notifSeen || 0;
  return `<section class="page">${head}
    ${invitationsBlock()}
    ${list.length
      ? `<ul class="notifs">${list.map((n) => notifLine(n, seen)).join("")}</ul>`
      : state.invitations.length ? "" : `<p class="note">Rien pour l'instant. Les commentaires sur vos itinéraires, vos nouveaux abonnés et les voyageurs qui rejoignent vos voyages apparaîtront ici.</p>`}
  </section>`;
}

// Page d'une liste de Mon profil : demandes, abonnés, abonnements ou publications
export function networkView(tab) {
  const title = NETWORK_PAGES[tab] || "Mon profil";
  const head = `${tab === "mes-publications" ? "" : `<a class="back" href="#profil">← Mon profil</a>`}<header class="page-head"><h1>${esc(title)}</h1>${tab === "mes-publications" ? `<p class="lead">Les copies figées de vos voyages que vous avez publiées. Vos voyages, eux, restent modifiables dans Mes voyages.</p>` : ""}</header>`;
  if (!state.user) return `<section class="page">${head}${signInPanel("Connectez-vous pour voir vos abonnés et vos publications.")}</section>`;

  const person = (f, buttons) => `<li>
      <a class="person" href="#personne-${esc(f.profile.uid)}">${avatar(f.profile)}<span><b>${esc(f.profile.name)}</b>${f.profile.handle ? ` <span class="handle">@${esc(f.profile.handle)}</span>` : ""}</span></a>
      <span class="row-btns">${buttons}</span>
    </li>`;
  const list = (items, empty, buttons) => (items.length ? `<ul class="people panel">${items.map((f) => person(f, buttons(f))).join("")}</ul>` : `<p class="note">${empty}</p>`);

  if (tab === "mes-publications") {
    const mine = social.load("mine", () => social.postsOf(me()));
    if (mine.status !== "ok") return `<section class="page">${head}${mine.status === "loading" ? loadingNote : errorNote()}</section>`;
    const posts = mine.data;
    const sel = state.selecting && posts.length > 0;
    const n = posts.filter((p) => state.selected.has(p.id)).length;
    // En-tête avec le bouton « Sélectionner » (pour supprimer plusieurs publications)
    const top = `<header class="page-head trips-head">
        <div><h1>${esc(title)}</h1></div>
        ${selectButtons(posts.map((p) => p.id))}
      </header>
      <p class="lead">Les copies figées de vos voyages que vous avez publiées. Vos voyages, eux, restent modifiables dans Mes voyages.</p>`;
    const body = !posts.length ? `<p class="note">Vous n'avez rien publié. Ouvrez un voyage et choisissez « Publier l'itinéraire ».</p>`
      : sel ? `<div class="trip-grid">${posts.map(selectablePostCard).join("")}</div>
          ${selectBar(n, {
            word: "publication", feminine: true,
            hint: "Touchez les publications à supprimer",
            question: `Supprimer ${plural(n, "publication")}, avec ${n > 1 ? "leurs" : "ses"} commentaires ? Vos voyages ne sont pas touchés.`,
            yesAct: "select-delete-posts-yes",
          })}`
      : postGrid(posts, "");
    return `<section class="page${sel ? " is-selecting" : ""}">${top}${body}</section>`;
  }

  const net = social.load("network", social.myNetwork);
  if (net.status !== "ok") return `<section class="page">${head}${net.status === "loading" ? loadingNote : errorNote()}</section>`;
  const d = net.data;
  const body =
    tab === "demandes" ? list(d.requests, "Aucune demande en attente.", (f) => `<button class="btn small primary" data-act="accept-follower" data-uid="${esc(f.follower)}" type="button">Accepter</button>
        <button class="btn small" data-act="remove-follower" data-uid="${esc(f.follower)}" type="button">Refuser</button>`)
    : tab === "abonnes" ? list(d.followers, "Personne ne vous suit encore.", (f) => `<button class="btn small" data-act="remove-follower" data-uid="${esc(f.follower)}" type="button">Retirer</button>`)
    : list(d.following, "Vous ne suivez personne. Trouvez des voyageurs dans Découvrir.", (f) => `${f.status === "pending" ? `<span class="follow-state">En attente</span>` : ""}
        <button class="btn small" data-act="unfollow" data-uid="${esc(f.followed)}" type="button">${f.status === "pending" ? "Annuler" : "Se désabonner"}</button>`);
  return `<section class="page">${head}${body}</section>`;
}

// Fiche pays : 3 ou 4 itinéraires de voyageurs, les plus mis en favori, comme idées
// (rien pendant le chargement ni s'il n'y en a pas : la fiche reste la même)
export function countryPostsSection(code) {
  if (!isEnabled()) return "";
  const e = social.load("country-posts:" + code, () => social.topPostsIn(code));
  if (e.status !== "ok" || !e.data.length) return "";
  return `<section class="country-posts" aria-labelledby="country-posts-title">
    <h2 id="country-posts-title">Idées de voyage</h2>
    <p class="note">Des itinéraires publiés par des voyageurs dans ce pays, les plus mis en favori d'abord.</p>
    <div class="trip-grid idea-row">${e.data.map(postCard).join("")}</div>
    <p class="note"><a href="#decouvrir">Voir tous les itinéraires dans Découvrir</a></p>
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
  const body = e.status === "loading" ? loadingNote : e.status === "error" ? errorNote()
    : `${postGrid(e.data.found, "")}
      ${e.data.missing.length ? `<p class="note">${e.data.missing.length > 1 ? `${e.data.missing.length} itinéraires ne sont plus disponibles` : "Un itinéraire n'est plus disponible"} (supprimé, ou plus visible pour vous).
        <button class="link-btn" data-act="forget-missing-posts" data-posts="${esc(e.data.missing.join(","))}" type="button">Les retirer des favoris</button></p>` : ""}`;
  return `<h2 class="section-title">Itinéraires</h2>${body}`;
}
