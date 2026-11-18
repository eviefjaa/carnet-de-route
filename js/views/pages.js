// Pages « Mon profil » et « Paramètres »

import { esc, nights, CURRENCIES } from "../utils.js";
import { state } from "../store.js";
import { prefs } from "../prefs.js";
import { isEnabled } from "../cloud.js";
import { socialProfileSection } from "./social.js";
import { t, count, getLang, LANGS } from "../i18n.js";
import { stopCountryCode } from "../i18n-data.js";

function stats() {
  const trips = Object.values(state.trips);
  const stops = trips.flatMap((trip) => trip.items.filter((i) => i.type === "stop"));
  return {
    trips: trips.length,
    stops: stops.length,
    nights: stops.reduce((s, i) => s + (nights(i.arrive, i.depart) || 0), 0),
    countries: new Set(stops.map((s) => stopCountryCode(s) || s.country).filter(Boolean)).size,
    favorites: prefs.favorites.length,
  };
}

export function profileView() {
  const s = stats();
  // Chiffre en gros, mot en dessous (« 3 » / « voyages ») : clés profile.tile.*
  const tiles = [[s.trips, "trips"], [s.stops, "stops"], [s.nights, "nights"], [s.countries, "countries"], [s.favorites, "favorites"]];

  const account = state.user
    ? `<div class="panel profile-card">
        <span class="avatar big">${esc((prefs.name || state.user.email)[0].toUpperCase())}</span>
        <div class="profile-id">
          <label class="f">${t("profile.displayName")}<input id="profileName" value="${esc(prefs.name)}" placeholder="${t("profile.displayNameHint")}" maxlength="40"></label>
          <p class="note">${esc(state.user.email)}</p>
        </div>
        <button class="btn" data-act="sign-out" type="button">${t("auth.signOut")}</button>
      </div>`
    : isEnabled()
      ? `<div class="panel">
          <h2>${t("profile.notSignedIn")}</h2>
          <p class="note">${t("profile.signInWhy")}</p>
          <div class="row-btns">
            <button class="btn primary" data-act="open-auth" data-mode="signup" type="button">${t("auth.signUp")}</button>
            <button class="btn" data-act="open-auth" data-mode="signin" type="button">${t("auth.signIn")}</button>
          </div>
        </div>`
      : "";

  return `<section class="page">
    <header class="page-head"><h1>${t("page.profile")}</h1></header>
    ${account}
    ${socialProfileSection()}
    <h2 class="section-title">${t("profile.stats")}</h2>
    <div class="stat-tiles">${tiles.map(([n, k]) => `<div class="stat-tile"><b>${n}</b><span>${count(n, `profile.tile.${k}`)}</span></div>`).join("")}</div>
    <p class="note">${t("profile.countriesNote")}</p>
  </section>`;
}

// Suppression du compte : ce qui part, ce qui reste aux autres, puis le mot de passe pour confirmer
function deleteAccountBlock() {
  if (!state.deleteAccount) {
    return `<div class="row-btns"><button class="btn ghost small danger" data-act="delete-account-open" type="button">${t("account.delete")}</button></div>`;
  }
  const busy = state.deleteAccount === "busy";
  return `<form class="delete-account" data-delete-account>
    <h3>${t("account.delete")}</h3>
    <p>${t("account.deleteAll")}</p>
    <p>${t("account.deleteShared")}</p>
    <label class="f">${t("account.passwordConfirm")}<input type="password" name="password" id="deletePassword" autocomplete="current-password" required${busy ? " disabled" : ""}></label>
    <div class="row-btns">
      <button class="btn danger" type="submit"${busy ? " disabled" : ""}>${busy ? t("account.deleting") : t("account.deleteForGood")}</button>
      ${busy ? "" : `<button class="btn" data-act="delete-account-cancel" type="button">${t("common.cancel")}</button>`}
    </div>
  </form>`;
}

export function settingsView() {
  const themes = [["auto", t("settings.themeAuto")], ["light", t("settings.themeLight")], ["dark", t("settings.themeDark")]];
  const currencies = Object.entries(CURRENCIES)
    .map(([k, v]) => `<option value="${k}"${k === prefs.currency ? " selected" : ""}>${esc(v)}</option>`)
    .join("");

  return `<section class="page">
    <header class="page-head"><h1>${t("page.settings")}</h1></header>

    <div class="panel">
      <h2>${t("settings.language")}</h2>
      <fieldset class="radios" aria-label="${t("settings.language")}">
        ${Object.entries(LANGS).map(([v, l]) => `<label class="radio"><input type="radio" name="lang" id="lang-${v}" value="${v}"${getLang() === v ? " checked" : ""}> <span lang="${v}">${l}</span></label>`).join("")}
      </fieldset>
    </div>

    <div class="panel">
      <h2>${t("settings.appearance")}</h2>
      <fieldset class="radios">
        <legend>${t("settings.theme")}</legend>
        ${themes.map(([v, l]) => `<label class="radio"><input type="radio" name="theme" id="theme-${v}" value="${v}"${prefs.theme === v ? " checked" : ""}> ${l}</label>`).join("")}
      </fieldset>
    </div>

    <div class="panel">
      <h2>${t("settings.trips")}</h2>
      <label class="f">${t("settings.defaultCurrency")}<select id="defaultCurrency">${currencies}</select></label>
    </div>

    <div class="panel">
      <h2>${t("settings.reminders")}</h2>
      <label class="radio"><input type="checkbox" id="emailReminders"${prefs.emailReminders !== false ? " checked" : ""}> ${t("settings.remindersBox")}</label>
      <p class="note">${!state.user ? t("settings.remindersNeedAccount")
        : state.user.emailVerified ? esc(t("settings.remindersTo", { email: state.user.email }))
          : esc(t("settings.remindersVerify", { email: state.user.email }))}</p>
      ${state.user && !state.user.emailVerified ? `<div class="row-btns"><button class="btn" data-act="resend-verification" type="button">${t("settings.resendVerify")}</button></div>` : ""}
    </div>

    <div class="panel">
      <h2>${t("settings.data")}</h2>
      <p class="note">${state.user ? t("settings.dataAccount") : t("settings.dataLocal")} ${t("settings.dataCopy")}</p>
      <div class="row-btns"><button class="btn" data-act="export" type="button">${t("settings.export")}</button></div>
    </div>

    ${isEnabled() ? `<div class="panel">
      <h2>${t("settings.account")}</h2>
      ${state.user
        ? `<p class="note">${esc(t("settings.signedInAs", { email: state.user.email }))}</p><div class="row-btns"><button class="btn" data-act="sign-out" type="button">${t("auth.signOut")}</button></div>
          ${deleteAccountBlock()}`
        : `<p class="note">${t("settings.notSignedIn")}</p><div class="row-btns"><button class="btn primary" data-act="open-auth" data-mode="signin" type="button">${t("auth.signIn")}</button></div>`}
    </div>` : ""}
  </section>`;
}
