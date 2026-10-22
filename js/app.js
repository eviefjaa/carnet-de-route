// Point d'entrée : charge les voyages, branche les événements, affiche la page

import { load } from "./store.js";
import { bindEvents } from "./events.js";
import { render } from "./views/trip.js";

load();
bindEvents();
render();
