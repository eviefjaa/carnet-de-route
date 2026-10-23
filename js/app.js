// Point d'entrée : charge les données, branche les événements, affiche la page, active les comptes

import { replaceTrips, loadLocal } from "./store.js";
import { loadPrefs } from "./prefs.js";
import { bindEvents } from "./events.js";
import { render } from "./views/trip.js";
import { startAccounts } from "./account.js";
import { bindAutocomplete } from "./autocomplete.js";
import { readHash, bindRouter } from "./router.js";

loadPrefs();
replaceTrips(loadLocal());
readHash();
bindEvents();
bindAutocomplete();
bindRouter(render);
render();
startAccounts();
