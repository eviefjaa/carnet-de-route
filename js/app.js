// Point d'entrée : charge les voyages, branche les événements, affiche la page, active les comptes

import { replaceTrips, loadLocal } from "./store.js";
import { bindEvents } from "./events.js";
import { render } from "./views/trip.js";
import { startAccounts } from "./account.js";

replaceTrips(loadLocal());
bindEvents();
render();
startAccounts();
