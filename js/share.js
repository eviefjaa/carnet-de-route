// Partage d'un voyage : invitations par e-mail et voyageurs
//
// L'invitation est enregistrée dans le voyage, puis la messagerie de l'utilisateur
// s'ouvre avec un e-mail prêt à envoyer. La personne invitée rejoint le voyage
// en se connectant avec cette adresse (une fois l'adresse confirmée).

import * as cloud from "./cloud.js";
import { state, currentTrip, flush, patchTrip, forgetTrip } from "./store.js";
import { prefs } from "./prefs.js";
import { render } from "./views/trip.js";
import { toast } from "./toast.js";

const isEmail = (s) => /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(s);

export async function inviteFromForm(f) {
  const id = state.currentId;
  const t = currentTrip();
  const email = f.email.value.trim().toLowerCase();
  if (!t || !state.user) return;
  if (!isEmail(email)) return toast("Adresse e-mail invalide.");
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
  render();
  openInviteMail(email, t, id);
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
    `${who} vous invite à préparer le voyage « ${name} » sur Carnet de route.`,
    "",
    "Pour le rejoindre :",
    `1. Ouvrez ce lien : ${link}`,
    `2. Créez un compte (ou connectez-vous) avec cette adresse : ${email}`,
    "3. Confirmez votre adresse avec le lien reçu par e-mail, puis rechargez la page.",
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
export async function leaveTrip(id) {
  try {
    await flush();
    await cloud.removeMember(id, state.user.uid);
  } catch {
    return toast("Impossible de quitter le voyage. Vérifiez votre connexion.");
  }
  forgetTrip(id);
  toast("Vous avez quitté le voyage");
  render();
}
