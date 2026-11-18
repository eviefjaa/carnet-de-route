// Section « Voyageurs » d'un voyage : qui en fait partie, invitations en attente, inviter par e-mail
// ou, par son nom ou son pseudo, une personne de son réseau

import { esc } from "../utils.js";
import { state, isOwner } from "../store.js";
import { isEnabled } from "../cloud.js";
import * as social from "../social.js";
import { t, count, locale } from "../i18n.js";

// Accents et majuscules ignorés
const plain = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Personnes de mon réseau à proposer pour ce voyage : abonnements acceptés dans les deux sens,
// sans doublon, sans moi ni les voyageurs déjà là (les personnes déjà invitées sont marquées).
// Rien tant que le texte ressemble à une adresse e-mail (un « @ » après le début).
export function inviteSuggestions(net, q, trip, me, max = 8) {
  const text = plain(q).replace(/^@/, "");
  if (!net || text.length < 2 || /.@/.test(String(q).trim())) return [];
  const people = [
    ...(net.following || []).filter((f) => f.status === "accepted"),
    ...(net.followers || []).filter((f) => f.status === "accepted"),
  ].map((f) => f.profile).filter((p) => p && p.uid && p.handle);
  const members = new Set(trip.members || []);
  const invited = new Set(trip.inviteUids || []);
  const seen = new Set();
  return people
    .filter((p) => !seen.has(p.uid) && seen.add(p.uid) && p.uid !== me && !members.has(p.uid))
    .filter((p) => plain(p.name).includes(text) || plain(p.handle).includes(text))
    .sort((a, b) => a.name.localeCompare(b.name, locale()))
    .slice(0, max)
    .map((p) => ({ uid: p.uid, name: p.name, handle: p.handle, invited: invited.has(p.uid) }));
}

// Nom et pseudo d'un compte invité (son profil se lit comme une carte de visite)
function invitedName(uid) {
  const e = social.load("profile:" + uid, () => social.getProfile(uid));
  if (e.status === "loading") return "…";
  return e.data ? `${esc(e.data.name)} <span class="handle">@${esc(e.data.handle)}</span>` : t("share.deletedAccount");
}

// Nombre de voyageurs (1 pour un voyage pas partagé)
export const travellers = (trip) => (trip.members || []).length || 1;

export function shareSection(trip) {
  if (!isEnabled()) return "";
  if (!state.user) {
    return `<section class="share" aria-label="${t("share.title")}">
      <h2>${t("share.title")}</h2>
      <p class="note">${t("share.signIn")}</p>
      <div><button class="btn small" data-act="open-auth" data-mode="signin" type="button">${t("auth.signIn")}</button></div>
    </section>`;
  }

  const me = state.user.uid;
  const owner = isOwner(trip);
  const emails = trip.emails || {};
  const members = (trip.members || [me]).map((uid) => `<li>
      <span class="sh-who">${esc(emails[uid] || (uid === me ? state.user.email : t("share.traveller")))}${uid === me ? ` <span class="sh-me">${t("share.you")}</span>` : ""}</span>
      ${uid === (trip.owner || me) ? `<span class="sh-badge">${t("share.creator")}</span>` : ""}
      ${owner && uid !== me ? `<button class="cl-del" data-act="remove-member" data-uid="${esc(uid)}" type="button" aria-label="${esc(t("share.removeNamed", { who: emails[uid] || t("share.thisTraveller") }))}" title="${t("share.remove")}">✕</button>` : ""}
    </li>`).join("");
  const invites = (trip.invites || []).map((email) => `<li class="sh-pending">
      <span class="sh-who">${esc(email)}</span>
      <span class="sh-badge">${t("share.invited")}</span>
      <button class="link-btn" data-act="resend-invite" data-email="${esc(email)}" type="button">${t("share.resend")}</button>
      ${owner ? `<button class="cl-del" data-act="cancel-invite" data-email="${esc(email)}" type="button" aria-label="${esc(t("share.cancelInviteOf", { email }))}" title="${t("share.cancelInvite")}">✕</button>` : ""}
    </li>`).join("");
  // Invitations par compte : pas d'e-mail, donc pas de « Renvoyer »
  const inviteUids = (trip.inviteUids || []).filter((u) => typeof u === "string").map((uid) => `<li class="sh-pending">
      <span class="sh-who">${invitedName(uid)}</span>
      <span class="sh-badge">${t("share.invited")}</span>
      ${owner ? `<button class="cl-del" data-act="cancel-invite-uid" data-uid="${esc(uid)}" type="button" aria-label="${t("share.cancelInvite")}" title="${t("share.cancelInvite")}">✕</button>` : ""}
    </li>`).join("");
  // Mon réseau, chargé dès l'ouverture du formulaire (et gardé en cache) pour les suggestions
  if (state.inviteOpen && state.profile) social.load("network", social.myNetwork);

  // Icône « ajouter une personne » : ouvre le champ d'invitation
  const addButton = state.inviteOpen ? "" : `<button class="cl-add sh-add" data-act="open-invite" type="button" aria-label="${t("share.invitePerson")}" title="${t("share.invitePerson")}">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>
      </svg>
    </button>`;

  return `<section class="share" aria-label="${t("share.title")}">
    <div class="sh-head"><h2>${t("share.title")}</h2>${addButton}</div>
    <ul class="sh-list">${members}${invites}${inviteUids}</ul>
    ${state.inviteOpen ? `<form class="cl-form" data-invite-form>
      <span class="ac sh-ac"><input name="who" id="inviteWho" placeholder="${t("share.whoHint")}" aria-label="${t("share.whoLabel")}"
        data-invite-input autocomplete="off" autocapitalize="none" role="combobox" aria-autocomplete="list" aria-expanded="false" required></span>
      <button class="btn primary small" type="submit">${t("share.invite")}</button>
      <button class="btn ghost small" data-act="close-invite" type="button">${t("common.close")}</button>
    </form>
    <p class="note">${state.profile ? t("share.helpProfile") : t("share.helpNoProfile")}
      ${t("share.canEdit")}</p>` : ""}
  </section>`;
}

// Invitations à des voyages en attente : rien n'est rejoint sans un clic sur « Rejoindre »
export function invitationsBlock() {
  const list = state.user ? state.invitations : [];
  if (!list.length) return "";
  return `<section class="panel invitations" aria-label="${t("invites.label")}">
    <h2>${count(list.length, "invites.title")}</h2>
    <ul class="people">${list.map((i) => `<li>
      <span class="invite-text"><b>${esc(i.name)}</b>${i.from ? `<span class="note">${esc(t("invites.from", { who: i.from }))}</span>` : ""}</span>
      <span class="row-btns">
        <button class="btn small primary" data-act="invite-join" data-trip="${esc(i.id)}" type="button">${t("invites.join")}</button>
        <button class="btn small" data-act="invite-decline" data-trip="${esc(i.id)}" type="button">${t("invites.decline")}</button>
      </span>
    </li>`).join("")}</ul>
    <p class="note">${t("invites.note")}</p>
  </section>`;
}
