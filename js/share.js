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
import { t } from "./i18n.js";

const isEmail = (s) => /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(s);

// Suggestions pour le texte du champ (réseau déjà chargé, sinon rien)
const suggestionsFor = (q) => {
  const net = social.peek("network");
  const trip = currentTrip();
  return net.status === "ok" && trip && state.user ? inviteSuggestions(net.data, q, trip, state.user.uid) : [];
};

export async function inviteFromForm(f) {
  const id = state.currentId;
  const trip = currentTrip();
  const typed = f.who.value.trim();
  const email = typed.toLowerCase();
  if (!trip || !state.user) return;
  if (!isEmail(email)) {
    // « Inviter » avec un nom ou un pseudo : la personne si elle est la seule à correspondre,
    // ou si son pseudo est exactement celui tapé
    const list = suggestionsFor(typed).filter((p) => !p.invited);
    const exact = list.find((p) => p.handle === email.replace(/^@/, ""));
    const p = exact || (list.length === 1 ? list[0] : null);
    if (p) return inviteAccount(p);
    return toast(/.@/.test(typed) ? t("err.invalidEmail") : t("share.pickOrEmail"));
  }
  if (Object.values(trip.emails || {}).some((e) => e.toLowerCase() === email)) return toast(t("share.alreadyIn"));

  if (!(trip.invites || []).includes(email)) {
    try {
      await flush(); // le voyage doit exister dans le compte avant d'inviter
      await cloud.invite(id, email);
    } catch {
      return toast(t("err.invite"));
    }
    patchTrip(id, { invites: [...(currentTrip()?.invites || []), email] });
  }
  state.inviteOpen = false;
  render();
  openInviteMail(email, trip, id);
}

// Inviter une personne de mon réseau (les règles vérifient l'abonnement)
let inviting = false;
export async function inviteAccount(p) {
  const id = state.currentId;
  const trip = currentTrip();
  if (!trip || !state.user || inviting) return;
  if ((trip.inviteUids || []).includes(p.uid)) return toast(t("share.alreadyInvited", { handle: p.handle }));
  inviting = true;
  try {
    await flush(); // le voyage doit exister dans le compte avant d'inviter
    await cloud.inviteUid(id, p.uid);
  } catch {
    return toast(t("err.invite"));
  } finally {
    inviting = false;
  }
  patchTrip(id, { inviteUids: [...(currentTrip()?.inviteUids || []), p.uid] });
  state.inviteOpen = false;
  render();
  toast(t("share.sent", { handle: p.handle }));
}

// Le créateur annule une invitation par compte
export async function cancelInviteUid(uid) {
  const id = state.currentId;
  try {
    await cloud.cancelInviteUid(id, uid);
  } catch {
    return toast(t("err.cancelInvite"));
  }
  patchTrip(id, { inviteUids: (currentTrip()?.inviteUids || []).filter((u) => u !== uid) });
  toast(t("share.cancelled"));
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
      ${p.invited ? `<span class="ac-kind">${t("share.alreadyInvitedShort")}</span>` : ""}
    </li>`).join("");
}

function pick(i) {
  const p = items[i];
  if (!p) return;
  if (p.invited) return toast(t("share.alreadyInvited", { handle: p.handle }));
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
  const trip = currentTrip();
  if (trip) openInviteMail(email, trip, state.currentId);
}

// Ouvre la messagerie avec l'e-mail d'invitation déjà rempli
function openInviteMail(email, trip, id) {
  const link = location.origin + location.pathname + "#voyage-" + encodeURIComponent(id);
  const who = prefs.name || state.user.email;
  // Dans la langue de la personne qui invite
  const name = trip.name || t("trip.untitled");
  const subject = t("mail.subject", { name });
  const body = t("mail.body", { who, name, link, email });
  location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  toast(t("share.mailOpens"));
}

// Le créateur annule une invitation
export async function cancelInvite(email) {
  const id = state.currentId;
  try {
    await cloud.cancelInvite(id, email);
  } catch {
    return toast(t("err.cancelInvite"));
  }
  patchTrip(id, { invites: (currentTrip()?.invites || []).filter((e) => e !== email) });
  toast(t("share.cancelled"));
  render();
}

// Le créateur retire un voyageur
export async function removeMember(uid) {
  const id = state.currentId;
  try {
    await cloud.removeMember(id, uid);
  } catch {
    return toast(t("err.removePerson"));
  }
  const trip = currentTrip();
  if (trip) {
    const emails = { ...trip.emails };
    delete emails[uid];
    patchTrip(id, { members: trip.members.filter((m) => m !== uid), emails });
  }
  toast(t("share.removed"));
  render();
}

// Un voyageur (pas le créateur) quitte le voyage : il disparaît de sa liste seulement
// quiet : pas de message (suppression de plusieurs voyages, qui affiche son propre bilan)
export async function leaveTrip(id, quiet = false) {
  try {
    await flush();
    await cloud.removeMember(id, state.user.uid);
  } catch {
    if (!quiet) toast(t("err.leave"));
    return false;
  }
  forgetTrip(id);
  if (!quiet) toast(t("share.left"));
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
    return toast(t("err.answer"));
  }
  state.invitations = state.invitations.filter((i) => i.id !== tripId);
  if (join) {
    toast(inv ? t("share.joinedNamed", { name: inv.name }) : t("share.joined"));
    go("voyage-" + tripId); // le voyage arrive par la synchronisation en direct
  } else {
    toast(t("share.declined"));
  }
  render();
}
