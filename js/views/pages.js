// Pages « Mon profil » et « Paramètres »

import { esc, nights, CURRENCIES } from "../utils.js";
import { state } from "../store.js";
import { prefs } from "../prefs.js";
import { isEnabled } from "../cloud.js";

function stats() {
  const trips = Object.values(state.trips);
  const stops = trips.flatMap((t) => t.items.filter((i) => i.type === "stop"));
  return {
    trips: trips.length,
    stops: stops.length,
    nights: stops.reduce((s, i) => s + (nights(i.arrive, i.depart) || 0), 0),
    countries: new Set(stops.map((s) => s.country).filter(Boolean)).size,
    favorites: prefs.favorites.length,
  };
}

export function profileView() {
  const s = stats();
  const tiles = [
    [s.trips, "voyage", "voyages"],
    [s.stops, "étape", "étapes"],
    [s.nights, "nuit", "nuits"],
    [s.countries, "pays", "pays"],
    [s.favorites, "favori", "favoris"],
  ];

  const account = state.user
    ? `<div class="panel profile-card">
        <span class="avatar big">${esc((prefs.name || state.user.email)[0].toUpperCase())}</span>
        <div class="profile-id">
          <label class="f">Nom affiché<input id="profileName" value="${esc(prefs.name)}" placeholder="Votre prénom" maxlength="40"></label>
          <p class="note">${esc(state.user.email)}</p>
        </div>
        <button class="btn" data-act="sign-out" type="button">Se déconnecter</button>
      </div>`
    : isEnabled()
      ? `<div class="panel">
          <h2>Vous n'êtes pas connecté(e)</h2>
          <p class="note">Créez un compte pour retrouver vos voyages et vos favoris sur tous vos appareils.</p>
          <div class="row-btns">
            <button class="btn primary" data-act="open-auth" data-mode="signup" type="button">Créer un compte</button>
            <button class="btn" data-act="open-auth" data-mode="signin" type="button">Se connecter</button>
          </div>
        </div>`
      : "";

  return `<section class="page">
    <header class="page-head"><h1>Mon profil</h1></header>
    ${account}
    <h2 class="section-title">Mes statistiques</h2>
    <div class="stat-tiles">${tiles.map(([n, one, many]) => `<div class="stat-tile"><b>${n}</b><span>${n > 1 ? many : one}</span></div>`).join("")}</div>
    <p class="note">Les pays sont comptés à partir des étapes choisies dans les suggestions de lieux.</p>
  </section>`;
}

export function settingsView() {
  const themes = [["auto", "Automatique (comme l'appareil)"], ["light", "Clair"], ["dark", "Sombre"]];
  const currencies = Object.entries(CURRENCIES)
    .map(([k, v]) => `<option value="${k}"${k === prefs.currency ? " selected" : ""}>${esc(v)}</option>`)
    .join("");

  return `<section class="page">
    <header class="page-head"><h1>Paramètres</h1></header>

    <div class="panel">
      <h2>Apparence</h2>
      <fieldset class="radios">
        <legend>Thème</legend>
        ${themes.map(([v, l]) => `<label class="radio"><input type="radio" name="theme" id="theme-${v}" value="${v}"${prefs.theme === v ? " checked" : ""}> ${l}</label>`).join("")}
      </fieldset>
    </div>

    <div class="panel">
      <h2>Voyages</h2>
      <label class="f">Devise par défaut des nouveaux voyages<select id="defaultCurrency">${currencies}</select></label>
    </div>

    <div class="panel">
      <h2>Mes données</h2>
      <p class="note">${state.user ? "Vos voyages sont enregistrés dans votre compte." : "Vos voyages sont enregistrés uniquement dans ce navigateur."} Vous pouvez en télécharger une copie à tout moment.</p>
      <div class="row-btns"><button class="btn" data-act="export" type="button">Télécharger mes voyages (fichier JSON)</button></div>
    </div>

    ${isEnabled() ? `<div class="panel">
      <h2>Compte</h2>
      ${state.user
        ? `<p class="note">Connecté(e) avec ${esc(state.user.email)}.</p><div class="row-btns"><button class="btn" data-act="sign-out" type="button">Se déconnecter</button></div>`
        : `<p class="note">Vous n'êtes pas connecté(e).</p><div class="row-btns"><button class="btn primary" data-act="open-auth" data-mode="signin" type="button">Se connecter</button></div>`}
    </div>` : ""}
  </section>`;
}
