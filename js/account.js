// Connexion / déconnexion : branche le site sur le compte de l'utilisateur

import * as cloud from "./cloud.js";
import { state, setCloud, replaceTrips, loadLocal, clearLocal, applyRemote, hasPendingChanges, hasUnsaved, save, flush, resetUi, setSync, syncError } from "./store.js";
import { render } from "./views/trip.js";
import { toast } from "./toast.js";
import { usePrefsCloud, resetPrefs } from "./prefs.js";
import { loadMyProfile, resetSocial, refreshNotifications } from "./social.js";

let stopWatching = null;

export async function startAccounts() {
  try {
    const ok = await cloud.init(onUserChange);
    if (!ok) return;
  } catch {
    toast("Les comptes sont indisponibles pour le moment : vos voyages restent sur cet appareil.");
  }
}

async function onUserChange(user) {
  if (stopWatching) { stopWatching(); stopWatching = null; }

  // Déconnexion : retour aux voyages de cet appareil
  if (!user) {
    const wasConnected = !!state.user;
    setCloud(null);
    // Au chargement, personne n'était connecté : rien ne change, on ne réaffiche pas la page
    // (ce qui effacerait un formulaire de connexion en cours de saisie)
    if (!wasConnected) return;
    state.user = null;
    state.profile = null;
    state.notifs = null;
    resetSocial();
    if (wasConnected) resetPrefs();
    resetUi();
    replaceTrips(loadLocal());
    render();
    return;
  }

  state.user = user;
  state.authOpen = false;
  state.loading = true;
  resetUi();
  render();

  try {
    // L'adresse a peut-être été confirmée depuis la dernière visite (et le jeton doit le savoir)
    user.emailVerified = await cloud.refreshEmailVerified().catch(() => user.emailVerified);
    cloud.useAccount(user);
    await cloud.moveOldTrips(user.uid);
    // Voyages auxquels on a été invité : il faut une adresse confirmée
    const joined = user.emailVerified ? await cloud.acceptInvites().catch(() => []) : [];
    const remote = await cloud.loadTrips(user.uid);

    // Les voyages créés sans compte sur cet appareil sont ajoutés au compte
    const local = loadLocal();
    const imported = Object.keys(local).filter((id) => !remote[id]);
    replaceTrips(remote);
    setCloud(cloud);
    if (imported.length) {
      imported.forEach((id) => (state.trips[id] = local[id]));
      if (!state.trips[state.currentId]) state.currentId = imported[0];
      save();
      await flush();
      if (!hasUnsaved()) toast(imported.length > 1 ? `${imported.length} voyages de cet appareil ajoutés à votre compte` : "Le voyage de cet appareil a été ajouté à votre compte");
    }
    // La copie de l'appareil n'est effacée qu'une fois tout enregistré dans le compte
    if (!hasUnsaved()) clearLocal();
    usePrefsCloud(cloud, await cloud.loadPrefs(user.uid).catch(() => null));
    resetSocial();
    await loadMyProfile();
    refreshNotifications();
    if (joined.length) toast(joined.length > 1 ? `Vous avez rejoint ${joined.length} voyages` : `Vous avez rejoint le voyage « ${joined[0]} »`);

    stopWatching = cloud.watchTrips(user.uid, (id, trip) => {
      const editing = id === state.currentId && (state.editingId || state.insertAt || state.todoAdding || isTyping());
      if (editing || hasPendingChanges(id)) return;
      applyRemote(id, trip);
      render();
    }, (err) => setSync("error", "La synchronisation en direct s'est arrêtée. " + syncError(err) + " Rechargez la page."));
  } catch (err) {
    // On reste sur les voyages de cet appareil, enregistrés sur l'appareil seulement :
    // ils seront ajoutés au compte à la prochaine connexion réussie
    setCloud(null);
    setSync("error", "Vos voyages n'ont pas pu être chargés depuis votre compte. " + syncError(err) + " Les modifications restent sur cet appareil.");
    toast("Impossible de charger vos voyages depuis votre compte.");
  }
  state.loading = false;
  render();
}

// Saisie en cours dans le nom du voyage ou le champ d'invitation : on ne réaffiche pas
const isTyping = () => {
  const el = document.activeElement;
  return !!el && (el.id === "tripName" || !!el.closest("form[data-invite-form]"));
};
