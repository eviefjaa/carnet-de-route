// Écran de connexion / création de compte et bouton de compte dans la barre du haut

import { esc } from "../utils.js";
import { state, sync } from "../store.js";
import { isEnabled } from "../cloud.js";

let mode = "signin"; // "signin" | "signup" | "reset"
export const setAuthMode = (m) => (mode = m);
export const authMode = () => mode;

// Barre réaffichée seulement si elle change : sinon un bouton touché à ce moment-là disparaît sous le doigt
let lastBar = null;
export function renderAccountBar() {
  const box = document.getElementById("account");
  if (!box) return;
  const html = !isEnabled() ? "" : state.user
    ? `${syncBadge()}<span class="account-email" title="${esc(state.user.email)}">${esc(state.user.email)}</span>
       <button class="btn ghost small" data-act="sign-out" type="button">Se déconnecter</button>`
    : `<button class="btn primary" data-act="open-auth" type="button">Se connecter</button>`;
  if (html === lastBar && box.childElementCount) return;
  lastBar = html;
  box.innerHTML = html;
}

// « Enregistré dans le compte » / « Enregistrement… » / « Non synchronisé »
const SYNC_LABELS = { saved: "Enregistré dans le compte", pending: "Enregistrement…", error: "Non synchronisé" };

function syncBadge() {
  const label = SYNC_LABELS[sync.status];
  if (!label) return "";
  return sync.status === "error"
    ? `<button class="sync-badge is-error" data-act="retry-sync" type="button" title="${esc(sync.error)} Cliquez pour réessayer.">${label} · Réessayer</button>`
    : `<span class="sync-badge is-${sync.status}" role="status">${label}</span>`;
}

// Texte sous le nom d'un voyage
export function syncNote(travellers) {
  if (!state.user) return "Enregistré sur cet appareil uniquement";
  if (sync.status === "error") return "Non synchronisé. " + sync.error;
  if (sync.status === "pending") return "Enregistrement dans le compte…";
  return travellers > 1 ? `Enregistré dans le compte · partagé entre ${travellers} voyageurs` : "Enregistré dans le compte";
}

export function authScreen() {
  const titles = { signin: "Se connecter", signup: "Créer un compte", reset: "Mot de passe oublié" };
  const intro = {
    signin: "Retrouvez vos voyages sur tous vos appareils.",
    signup: "Vos voyages seront enregistrés dans votre compte et synchronisés entre vos appareils.",
    reset: "Indiquez votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.",
  };

  return `<section class="auth">
    ${mode !== "reset" ? `<div class="auth-tabs" role="tablist">
      <button class="auth-tab${mode === "signin" ? " on" : ""}" data-act="auth-mode" data-mode="signin" type="button" role="tab" aria-selected="${mode === "signin"}">Se connecter</button>
      <button class="auth-tab${mode === "signup" ? " on" : ""}" data-act="auth-mode" data-mode="signup" type="button" role="tab" aria-selected="${mode === "signup"}">Créer un compte</button>
    </div>` : ""}
    <h2>${titles[mode]}</h2>
    <p class="note">${intro[mode]}</p>
    <form class="auth-form" data-auth="${mode}" novalidate>
      <label class="f">E-mail<input type="email" name="email" id="auth-email" autocomplete="email" required></label>
      ${mode !== "reset" ? `<label class="f">Mot de passe<input type="password" name="password" id="auth-password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" minlength="6" required></label>` : ""}
      ${mode === "signup" ? `<label class="f">Confirmer le mot de passe<input type="password" name="confirm" id="auth-confirm" autocomplete="new-password" minlength="6" required></label>
        <p class="note">6 caractères minimum.</p>` : ""}
      <p class="auth-error" id="auth-error" role="alert" hidden></p>
      <button class="btn primary auth-submit" type="submit">${mode === "signin" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}</button>
    </form>
    <div class="auth-links">
      ${mode === "signin" ? `<button class="link-btn" data-act="auth-mode" data-mode="reset" type="button">Mot de passe oublié ?</button>` : ""}
      ${mode === "reset" ? `<button class="link-btn" data-act="auth-mode" data-mode="signin" type="button">Retour à la connexion</button>` : ""}
      <button class="link-btn" data-act="close-auth" type="button">Continuer sans compte</button>
    </div>
  </section>`;
}

// Juste après la création du compte : confirmer son adresse e-mail (aussi possible plus tard dans Paramètres)
export function verifyScreen() {
  return `<section class="auth verify">
    <h2>Confirmez votre adresse e-mail</h2>
    <p>Nous venons d'envoyer un lien à <b>${esc(state.user.email)}</b>. Ouvrez-le pour confirmer votre adresse, puis revenez ici. Pensez à regarder dans les spams.</p>
    <p class="note">Une adresse confirmée permet de recevoir les rappels de réservation et de rejoindre les voyages auxquels on vous invite.</p>
    <p class="auth-error" id="verify-msg" role="alert" hidden></p>
    <button class="btn primary auth-submit" data-act="verify-check" type="button">J'ai confirmé mon adresse</button>
    <div class="auth-links">
      <button class="link-btn" data-act="resend-verification" type="button">Renvoyer l'e-mail</button>
      <button class="link-btn" data-act="verify-later" type="button">Plus tard</button>
    </div>
  </section>`;
}
