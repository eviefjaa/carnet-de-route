// Section « Voyageurs » d'un voyage : qui en fait partie, invitations en attente, inviter par e-mail

import { esc } from "../utils.js";
import { state, isOwner } from "../store.js";
import { isEnabled } from "../cloud.js";

// Nombre de voyageurs (1 pour un voyage pas partagé)
export const travellers = (t) => (t.members || []).length || 1;

export function shareSection(t) {
  if (!isEnabled()) return "";
  if (!state.user) {
    return `<section class="share" aria-label="Voyageurs">
      <h2>Voyageurs</h2>
      <p class="note">Connectez-vous pour inviter des personnes à préparer ce voyage avec vous.</p>
      <div><button class="btn small" data-act="open-auth" data-mode="signin" type="button">Se connecter</button></div>
    </section>`;
  }

  const me = state.user.uid;
  const owner = isOwner(t);
  const emails = t.emails || {};
  const members = (t.members || [me]).map((uid) => `<li>
      <span class="sh-who">${esc(emails[uid] || (uid === me ? state.user.email : "Voyageur"))}${uid === me ? " <span class=\"sh-me\">(vous)</span>" : ""}</span>
      ${uid === (t.owner || me) ? `<span class="sh-badge">Créateur</span>` : ""}
      ${owner && uid !== me ? `<button class="cl-del" data-act="remove-member" data-uid="${esc(uid)}" type="button" aria-label="Retirer ${esc(emails[uid] || "ce voyageur")} du voyage" title="Retirer du voyage">✕</button>` : ""}
    </li>`).join("");
  const invites = (t.invites || []).map((email) => `<li class="sh-pending">
      <span class="sh-who">${esc(email)}</span>
      <span class="sh-badge">Invité(e)</span>
      <button class="link-btn" data-act="resend-invite" data-email="${esc(email)}" type="button">Renvoyer</button>
      ${owner ? `<button class="cl-del" data-act="cancel-invite" data-email="${esc(email)}" type="button" aria-label="Annuler l'invitation de ${esc(email)}" title="Annuler l'invitation">✕</button>` : ""}
    </li>`).join("");

  // Icône « ajouter une personne » : ouvre le champ d'invitation
  const addButton = state.inviteOpen ? "" : `<button class="cl-add sh-add" data-act="open-invite" type="button" aria-label="Inviter une personne" title="Inviter une personne">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>
      </svg>
    </button>`;

  return `<section class="share" aria-label="Voyageurs">
    <div class="sh-head"><h2>Voyageurs</h2>${addButton}</div>
    <ul class="sh-list">${members}${invites}</ul>
    ${state.inviteOpen ? `<form class="cl-form" data-invite-form>
      <input type="email" name="email" placeholder="Adresse e-mail" aria-label="Adresse e-mail de la personne à inviter" autocomplete="email" required>
      <button class="btn primary small" type="submit">Inviter</button>
      <button class="btn ghost small" data-act="close-invite" type="button">Fermer</button>
    </form>
    <p class="note">Votre messagerie s'ouvre avec un e-mail d'invitation prêt à envoyer. Les personnes invitées peuvent modifier le voyage.</p>` : ""}
  </section>`;
}
