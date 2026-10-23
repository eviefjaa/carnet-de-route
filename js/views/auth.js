// Écran de connexion / création de compte et bouton de compte dans la barre du haut

import { esc } from "../utils.js";
import { state, sync } from "../store.js";
import { isEnabled } from "../cloud.js";

let mode = "signin"; // "signin" | "signup" | "reset"
export const setAuthMode = (m) => (mode = m);
export const authMode = () => mode;

export function renderAccountBar() {
  const box = document.getElementById("account");
  if (!box) return;
  if (!isEnabled()) { box.innerHTML = ""; return; }
  box.innerHTML = state.user
    ? `${syncBadge()}<span class="account-email" title="${esc(state.user.email)}">${esc(state.user.email)}</span>
       <button class="btn ghost small" data-act="sign-out" type="button">Se déconnecter</button>`
    : `<button class="btn primary" data-act="open-auth" type="button">Se connecter</button>`;
}

// « Enregistré dans le compte » / « Enregistrement… » / « Non synchronisé »
const SYNC_LABELS = { saved: "✓ Enregistré dans le compte", pending: "Enregistrement…", error: "⚠ Non synchronisé" };

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
  if (sync.status === "error") return "⚠ " + sync.error;
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
