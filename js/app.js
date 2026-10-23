// Point d'entrée : charge les données, branche les événements, affiche la page, active les comptes

import { replaceTrips, loadLocal, onSyncChange, hasUnsaved, flush } from "./store.js";
import { loadPrefs } from "./prefs.js";
import { bindEvents } from "./events.js";
import { render, renderSync } from "./views/trip.js";
import { startAccounts } from "./account.js";
import { bindAutocomplete } from "./autocomplete.js";
import { readHash, bindRouter } from "./router.js";
import { onSocialLoaded } from "./social.js";
import { state } from "./store.js";

loadPrefs();
replaceTrips(loadLocal());
readHash();
bindEvents();
bindAutocomplete();
bindRouter(render);
render();
onSyncChange(renderSync);
onSocialLoaded(() => ["feed", "discover", "person", "post", "profile"].includes(state.view) && !state.authOpen && render());
startAccounts();

// Prévient avant de fermer la page si des modifications ne sont pas encore dans le compte
window.addEventListener("beforeunload", (e) => {
  if (!hasUnsaved()) return;
  flush();
  e.preventDefault();
  e.returnValue = "";
});
// Retour de la connexion internet : on renvoie ce qui n'est pas passé
window.addEventListener("online", () => flush());
