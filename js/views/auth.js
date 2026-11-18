// Écran de connexion / création de compte et bouton de compte dans la barre du haut

import { esc } from "../utils.js";
import { state, sync } from "../store.js";
import { isEnabled } from "../cloud.js";
import { t } from "../i18n.js";

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
       <button class="btn ghost small" data-act="sign-out" type="button">${t("auth.signOut")}</button>`
    : `<button class="btn primary" data-act="open-auth" type="button">${t("auth.signIn")}</button>`;
  if (html === lastBar && box.childElementCount) return;
  lastBar = html;
  box.innerHTML = html;
}

// « Enregistré dans le compte » / « Enregistrement… » / « Non synchronisé »
const SYNC_KEYS = { saved: "sync.saved", pending: "sync.pending", error: "sync.error" };

function syncBadge() {
  const label = SYNC_KEYS[sync.status] ? t(SYNC_KEYS[sync.status]) : "";
  if (!label) return "";
  return sync.status === "error"
    ? `<button class="sync-badge is-error" data-act="retry-sync" type="button" title="${esc(sync.error)} ${t("sync.clickRetry")}">${label} · ${t("sync.retry")}</button>`
    : `<span class="sync-badge is-${sync.status}" role="status">${label}</span>`;
}

// Texte sous le nom d'un voyage
export function syncNote(travellers) {
  if (!state.user) return t("sync.local");
  if (sync.status === "error") return `${t("sync.error")}. ${sync.error}`;
  if (sync.status === "pending") return t("sync.pendingLong");
  return travellers > 1 ? t("sync.savedShared", { n: travellers }) : t("sync.saved");
}

export function authScreen() {
  const titles = { signin: t("auth.signIn"), signup: t("auth.signUp"), reset: t("auth.reset") };
  const intro = { signin: t("auth.introSignIn"), signup: t("auth.introSignUp"), reset: t("auth.introReset") };

  return `<section class="auth">
    ${mode !== "reset" ? `<div class="auth-tabs" role="tablist">
      <button class="auth-tab${mode === "signin" ? " on" : ""}" data-act="auth-mode" data-mode="signin" type="button" role="tab" aria-selected="${mode === "signin"}">${t("auth.signIn")}</button>
      <button class="auth-tab${mode === "signup" ? " on" : ""}" data-act="auth-mode" data-mode="signup" type="button" role="tab" aria-selected="${mode === "signup"}">${t("auth.signUp")}</button>
    </div>` : ""}
    <h2>${titles[mode]}</h2>
    <p class="note">${intro[mode]}</p>
    <form class="auth-form" data-auth="${mode}" novalidate>
      <label class="f">${t("auth.email")}<input type="email" name="email" id="auth-email" autocomplete="email" required></label>
      ${mode !== "reset" ? `<label class="f">${t("auth.password")}<input type="password" name="password" id="auth-password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" minlength="6" required></label>` : ""}
      ${mode === "signup" ? `<label class="f">${t("auth.confirm")}<input type="password" name="confirm" id="auth-confirm" autocomplete="new-password" minlength="6" required></label>
        <p class="note">${t("auth.minLength")}</p>` : ""}
      <p class="auth-error" id="auth-error" role="alert" hidden></p>
      <button class="btn primary auth-submit" type="submit">${mode === "signin" ? t("auth.signIn") : mode === "signup" ? t("auth.createMine") : t("auth.sendLink")}</button>
    </form>
    <div class="auth-links">
      ${mode === "signin" ? `<button class="link-btn" data-act="auth-mode" data-mode="reset" type="button">${t("auth.forgot")}</button>` : ""}
      ${mode === "reset" ? `<button class="link-btn" data-act="auth-mode" data-mode="signin" type="button">${t("auth.backToSignIn")}</button>` : ""}
      <button class="link-btn" data-act="close-auth" type="button">${t("auth.noAccount")}</button>
    </div>
  </section>`;
}

// Juste après la création du compte : confirmer son adresse e-mail (aussi possible plus tard dans Paramètres)
export function verifyScreen() {
  return `<section class="auth verify">
    <h2>${t("verify.title")}</h2>
    <p>${t("verify.sent", { email: `<b>${esc(state.user.email)}</b>` })}</p>
    <p class="note">${t("verify.why")}</p>
    <p class="auth-error" id="verify-msg" role="alert" hidden></p>
    <button class="btn primary auth-submit" data-act="verify-check" type="button">${t("verify.done")}</button>
    <div class="auth-links">
      <button class="link-btn" data-act="resend-verification" type="button">${t("verify.resend")}</button>
      <button class="link-btn" data-act="verify-later" type="button">${t("verify.later")}</button>
    </div>
  </section>`;
}
