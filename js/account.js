// Connexion / déconnexion : branche le site sur le compte de l'utilisateur

import * as cloud from "./cloud.js";
import { state, setCloud, replaceTrips, loadLocal, clearLocal, applyRemote, hasPendingChanges, save, resetUi } from "./store.js";
import { render } from "./views/trip.js";
import { toast } from "./toast.js";
import { usePrefsCloud, resetPrefs } from "./prefs.js";

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
    state.user = null;
    setCloud(null);
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
    cloud.useAccount(user.uid);
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
      toast(imported.length > 1 ? `${imported.length} voyages de cet appareil ajoutés à votre compte` : "Le voyage de cet appareil a été ajouté à votre compte");
    }
    clearLocal();
    usePrefsCloud(cloud, await cloud.loadPrefs(user.uid).catch(() => null));

    stopWatching = cloud.watchTrips(user.uid, (id, trip) => {
      const editing = id === state.currentId && (state.editingId || state.insertAt || document.activeElement?.id === "tripName");
      if (editing || hasPendingChanges(id)) return;
      applyRemote(id, trip);
      render();
    });
  } catch {
    toast("Impossible de charger vos voyages. Vérifiez votre connexion puis rechargez la page.");
  }
  state.loading = false;
  render();
}
