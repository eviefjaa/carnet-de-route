// Point d'entrée : charge les données, branche les événements, affiche la page, active les comptes

import { replaceTrips, loadLocal, onSyncChange, hasUnsaved, flush } from "./store.js";
import { loadPrefs } from "./prefs.js";
import { bindEvents } from "./events.js";
import { render, renderSync } from "./views/trip.js";
import { startAccounts } from "./account.js";
import { bindAutocomplete } from "./autocomplete.js";
import { readHash, bindRouter } from "./router.js";
import { onSocialLoaded, resetSocial } from "./social.js";
import { state } from "./store.js";

loadPrefs();
replaceTrips(loadLocal());
readHash();
bindEvents();
bindAutocomplete();
// Profils, fils et commentaires rechargés à chaque page : on voit les nouveautés des autres
window.addEventListener("hashchange", resetSocial);
bindRouter(render);
render();
onSyncChange(renderSync);
// Données sociales arrivées : on réaffiche, sauf pendant une saisie (elle serait effacée)
const typing = () => {
  const el = document.activeElement;
  return !!el && !!el.closest("#app form") && !!el.value;
};
onSocialLoaded(() => ["feed", "discover", "person", "post", "profile"].includes(state.view) && !state.authOpen && !typing() && render());
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
