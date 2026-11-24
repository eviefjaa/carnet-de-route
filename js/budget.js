// Calcul du budget : total par destination et total du voyage
//
// Règle : un trajet est compté dans la destination vers laquelle il mène
// (la prochaine étape dans l'itinéraire). Un trajet sans étape après lui
// est compté dans « Autres trajets ».
// Activités : la somme des prix des activités de l'étape. Une activité sans prix est gratuite
// ou pas encore chiffrée : elle n'est pas comptée dans les prix manquants.
// Hébergement : il manque seulement pour une étape avec au moins une nuit, ou sans aucune date
// (on ne sait pas encore). Arrêt (arrivée et départ le même jour), point de départ (date de départ
// seule) ou d'arrivée (date d'arrivée seule) : pas de nuit, donc pas de prix manquant ; un prix
// saisi quand même est compté.

import { hasPrice, nights } from "./utils.js";
import { t } from "./i18n.js";

export function computeBudget(trip) {
  const rows = [];
  const others = { place: t("budget.otherLegs"), lodging: 0, transport: 0, activities: 0, missing: 0, legs: 0 };
  let pendingLegs = [];

  trip.items.forEach((it) => {
    if (it.type === "transport") {
      pendingLegs.push(it);
      return;
    }
    const row = { id: it.id, place: it.place || t("stop.unnamed"), lodging: 0, transport: 0, missing: 0, legs: pendingLegs.length,
      activities: (it.todos || []).reduce((s, x) => s + (hasPrice(x.price) ? x.price : 0), 0) };
    if (hasPrice(it.price)) row.lodging = it.price;
    else if (nights(it.arrive, it.depart) > 0 || (!it.arrive && !it.depart)) row.missing++;
    pendingLegs.forEach((leg) => {
      if (hasPrice(leg.price)) row.transport += leg.price;
      else row.missing++;
    });
    pendingLegs = [];
    rows.push(row);
  });

  pendingLegs.forEach((leg) => {
    others.legs++;
    if (hasPrice(leg.price)) others.transport += leg.price;
    else others.missing++;
  });
  if (others.legs) rows.push(others);

  rows.forEach((r) => (r.total = r.lodging + r.transport + r.activities));
  const total = {
    lodging: rows.reduce((s, r) => s + r.lodging, 0),
    transport: rows.reduce((s, r) => s + r.transport, 0),
    activities: rows.reduce((s, r) => s + r.activities, 0),
    missing: rows.reduce((s, r) => s + r.missing, 0),
  };
  total.total = total.lodging + total.transport + total.activities;
  return { rows, total };
}
