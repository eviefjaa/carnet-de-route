// Calcul du budget : total par destination et total du voyage
//
// Règle : un trajet est compté dans la destination vers laquelle il mène
// (la prochaine étape dans l'itinéraire). Un trajet sans étape après lui
// est compté dans « Autres trajets ».

import { hasPrice } from "./utils.js";

export function computeBudget(trip) {
  const rows = [];
  const others = { place: "Autres trajets", lodging: 0, transport: 0, missing: 0, legs: 0 };
  let pendingLegs = [];

  trip.items.forEach((it) => {
    if (it.type === "transport") {
      pendingLegs.push(it);
      return;
    }
    const row = { id: it.id, place: it.place || "Étape sans nom", lodging: 0, transport: 0, missing: 0, legs: pendingLegs.length };
    if (hasPrice(it.price)) row.lodging = it.price;
    else row.missing++;
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

  rows.forEach((r) => (r.total = r.lodging + r.transport));
  const total = {
    lodging: rows.reduce((s, r) => s + r.lodging, 0),
    transport: rows.reduce((s, r) => s + r.transport, 0),
    missing: rows.reduce((s, r) => s + r.missing, 0),
  };
  total.total = total.lodging + total.transport;
  return { rows, total };
}
