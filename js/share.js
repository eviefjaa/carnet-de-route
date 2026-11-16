// Partage d'un voyage : invitations et voyageurs
//
// Par e-mail : l'invitation est enregistrée dans le voyage, puis la messagerie de l'utilisateur
// s'ouvre avec un e-mail prêt à envoyer. La personne invitée rejoint le voyage en se connectant
// avec cette adresse (une fois l'adresse confirmée).
// Par nom ou pseudo (personnes de mon réseau) : l'invitation vise le compte, sans e-mail.
// La personne la voit dans Mes voyages et ses notifications.

import * as cloud from "./cloud.js";
import * as social from "./social.js";
import { state, currentTrip, flush, patchTrip, forgetTrip } from "./store.js";
import { go } from "./router.js";
import { prefs } from "./prefs.js";
import { render } from "./views/trip.js";
import { inviteSuggestions } from "./views/share.js";
import { toast } from "./toast.js";
import { esc } from "./utils.js";

const isEmail = (s) => /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(s);

// Suggestions pour le texte du champ (réseau déjà chargé, sinon rien)
const suggestionsFor = (q) => {
  const net = social.peek("network");
  const t = currentTrip();
  return net.status === "ok" && t && state.user ? inviteSuggestions(net.data, q, t, state.user.uid) : [];
};

export async function inviteFromForm(f) {
  const id = state.currentId;
  const t = currentTrip();
  const typed = f.who.value.trim();
  const email = typed.toLowerCase();
  if (!t || !state.user) return;
  if (!isEmail(email)) {
    // « Inviter » avec un nom ou un pseudo : la personne si elle est la seule à correspondre,
    // ou si son pseudo est exactement celui tapé
    const list = suggestionsFor(typed).filter((p) => !p.invited);
    const exact = list.find((p) => p.handle === email.replace(/^@/, ""));
    const p = exact || (list.length === 1 ? list[0] : null);
    if (p) return inviteAccount(p);
    return toast(/.@/.test(typed) ? "Adresse e-mail invalide." : "Choisissez une personne dans la liste, ou tapez une adresse e-mail complète.");
  }
  if (Object.values(t.emails || {}).some((e) => e.toLowerCase() === email)) return toast("Cette personne fait déjà partie du voyage.");

  if (!(t.invites || []).includes(email)) {
    try {
      await flush(); // le voyage doit exister dans le compte avant d'inviter
      await cloud.invite(id, email);
    } catch {
      return toast("Invitation impossible pour le moment. Vérifiez votre connexion.");
    }
    patchTrip(id, { invites: [...(currentTrip()?.invites || []), email] });
  }
  state.inviteOpen = false;
  render();
  openInviteMail(email, t, id);
}

// Inviter une personne de mon réseau (les règles vérifient l'abonnement)
let inviting = false;
export async function inviteAccount(p) {
  const id = state.currentId;
  const t = currentTrip();
  if (!t || !state.user || inviting) return;
  if ((t.inviteUids || []).includes(p.uid)) return toast(`@${p.handle} est déjà invité(e).`);
  inviting = true;
  try {
    await flush(); // le voyage doit exister dans le compte avant d'inviter
    await cloud.inviteUid(id, p.uid);
  } catch {
    return toast("Invitation impossible pour le moment. Vérifiez votre connexion.");
  } finally {
    inviting = false;
  }
  patchTrip(id, { inviteUids: [...(currentTrip()?.inviteUids || []), p.uid] });
  state.inviteOpen = false;
  render();
  toast(`Invitation envoyée à @${p.handle} : elle la verra dans Mes voyages et ses notifications.`);
}

// Le créateur annule une invitation par compte
export async function cancelInviteUid(uid) {
  const id = state.currentId;
  try {
    await cloud.cancelInviteUid(id, uid);
  } catch {
    return toast("Impossible d'annuler l'invitation. Vérifiez votre connexion.");
  }
  patchTrip(id, { inviteUids: (currentTrip()?.inviteUids || []).filter((u) => u !== uid) });
  toast("Invitation annulée");
  render();
}

// ---------- Suggestions sous le champ d'invitation (comme js/autocomplete.js) ----------
let input = null;  // champ d'invitation en cours
let list = null;   // liste affichée
let items = [];    // personnes proposées
let active = -1;   // personne surlignée au clavier

export function bindInviteSuggest() {
  document.addEventListener("input", (e) => {
    if (!e.target.matches || !e.target.matches("input[data-invite-input]")) return;
    input = e.target;
    items = suggestionsFor(input.value);
    active = -1;
    items.length ? show() : close();
  });
  document.addEventListener("keydown", (e) => {
    if (!list || e.target !== input) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      show();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // choisit la personne au lieu d'envoyer le formulaire
      pick(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
  document.addEventListener("focusout", (e) => {
    if (e.target === input) setTimeout(close, 150);
  });
}

function show() {
  const box = input && input.closest(".ac");
  if (!box) return;
  if (!list || list.parentNode !== box) {
    if (list) list.remove();
    list = document.createElement("ul");
    list.className = "ac-list sh-suggest";
    list.setAttribute("role", "listbox");
    list.id = input.id + "-list";
    box.appendChild(list);
    input.setAttribute("aria-controls", list.id);
    // mousedown (souris et doigt) : le champ garde le focus
    list.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li[data-i]");
      if (!li) return;
      e.preventDefault();
      pick(+li.dataset.i);
    });
  }
  input.setAttribute("aria-expanded", "true");
  if (active >= 0) input.setAttribute("aria-activedescendant", `${list.id}-${active}`);
  else input.removeAttribute("aria-activedescendant");
  list.innerHTML = items.map((p, i) => `<li role="option" data-i="${i}" id="${list.id}-${i}" aria-selected="${i === active}"${p.invited ? ` aria-disabled="true"` : ""}
      class="${[i === active ? "on" : "", p.invited ? "is-invited" : ""].join(" ").trim()}">
      <span class="avatar">${esc((p.name || "?")[0].toUpperCase())}</span>
      <span class="ac-main"><b>${esc(p.name)}</b><span class="ac-sub">@${esc(p.handle)}</span></span>
      ${p.invited ? `<span class="ac-kind">Déjà invité(e)</span>` : ""}
    </li>`).join("");
}

function pick(i) {
  const p = items[i];
  if (!p) return;
  if (p.invited) return toast(`@${p.handle} est déjà invité(e).`);
  close();
  inviteAccount(p);
}

function close() {
  if (list) list.remove();
  list = null;
  items = [];
  active = -1;
  if (input) {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
}

export function resendInvite(email) {
  const t = currentTrip();
  if (t) openInviteMail(email, t, state.currentId);
}

// Ouvre la messagerie avec l'e-mail d'invitation déjà rempli
function openInviteMail(email, t, id) {
  const link = location.origin + location.pathname + "#voyage-" + encodeURIComponent(id);
  const who = prefs.name || state.user.email;
  const name = t.name || "Sans titre";
  const subject = `Invitation au voyage « ${name} »`;
  const body = [
    "Bonjour,",
    "",
    `${who} vous invite à préparer le voyage « ${name} » sur Hippalos.`,
    "",
    "Pour le rejoindre :",
    `1. Ouvrez ce lien : ${link}`,
    `2. Créez un compte (ou connectez-vous) avec cette adresse : ${email}`,
    "3. Confirmez votre adresse avec le lien reçu par e-mail.",
    "4. Dans Mes voyages, acceptez l'invitation avec « Rejoindre ».",
    "",
    "À bientôt !",
  ].join("\n");
  location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  toast("Votre messagerie s'ouvre : il ne reste qu'à envoyer l'e-mail.");
}

// Le créateur annule une invitation
export async function cancelInvite(email) {
  const id = state.currentId;
  try {
    await cloud.cancelInvite(id, email);
  } catch {
    return toast("Impossible d'annuler l'invitation. Vérifiez votre connexion.");
  }
  patchTrip(id, { invites: (currentTrip()?.invites || []).filter((e) => e !== email) });
  toast("Invitation annulée");
  render();
}

// Le créateur retire un voyageur
export async function removeMember(uid) {
  const id = state.currentId;
  try {
    await cloud.removeMember(id, uid);
  } catch {
    return toast("Impossible de retirer cette personne. Vérifiez votre connexion.");
  }
  const t = currentTrip();
  if (t) {
    const emails = { ...t.emails };
    delete emails[uid];
    patchTrip(id, { members: t.members.filter((m) => m !== uid), emails });
  }
  toast("Personne retirée du voyage");
  render();
}

// Un voyageur (pas le créateur) quitte le voyage : il disparaît de sa liste seulement
// quiet : pas de message (suppression de plusieurs voyages, qui affiche son propre bilan)
export async function leaveTrip(id, quiet = false) {
  try {
    await flush();
    await cloud.removeMember(id, state.user.uid);
  } catch {
    if (!quiet) toast("Impossible de quitter le voyage. Vérifiez votre connexion.");
    return false;
  }
  forgetTrip(id);
  if (!quiet) toast("Vous avez quitté le voyage");
  render();
  return true;
}

// Réponse à une invitation : rejoindre le voyage, ou refuser (l'invitation disparaît)
export async function answerInvitation(tripId, join) {
  const inv = state.invitations.find((i) => i.id === tripId);
  try {
    if (join) await cloud.joinTrip(tripId, inv);
    else await cloud.declineInvite(tripId, inv);
  } catch {
    return toast("Réponse impossible pour le moment. Vérifiez votre connexion.");
  }
  state.invitations = state.invitations.filter((i) => i.id !== tripId);
  if (join) {
    toast(`Vous avez rejoint « ${inv ? inv.name : "le voyage"} »`);
    go("voyage-" + tripId); // le voyage arrive par la synchronisation en direct
  } else {
    toast("Invitation refusée");
  }
  render();
}
