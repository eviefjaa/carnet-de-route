// Calcul du budget : total par destination et total du voyage
//
// Règle : un trajet est compté dans la destination vers laquelle il mène
// (la prochaine étape dans l'itinéraire). Un trajet après la dernière étape (le retour)
// est compté dans cette dernière étape ; « Autres trajets » ne reste que pour un voyage sans étape.
// Activités : la somme des prix des activités de l'étape. Une activité sans prix est gratuite
// ou pas encore chiffrée : elle n'est pas comptée dans les prix manquants.
// Hébergement : il manque seulement pour une étape avec au moins une nuit, ou sans aucune date
// (on ne sait pas encore). Arrêt (arrivée et départ le même jour), point de départ (date de départ
// seule) ou d'arrivée (date d'arrivée seule) : pas de nuit, donc pas de prix manquant ; un prix
// saisi quand même est compté.
// Aller-retour : un trajet sans prix dont le trajet inverse (mêmes lieux, sens contraire) a un prix
// est compris dans ce prix, donc pas manquant. Lieux comparés sans casse, accents ni « (GRU) ».

import { hasPrice, nights } from "./utils.js";
import { t } from "./i18n.js";

const placeKey = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();
const legKey = (from, to) => `${placeKey(from)}\u0000${placeKey(to)}`;

export function computeBudget(trip) {
  const rows = [];
  // Trajets avec un prix, pour reconnaître le retour d'un aller-retour payé en une fois
  const paid = new Set(trip.items.filter((x) => x.type === "transport" && hasPrice(x.price) && placeKey(x.from) && placeKey(x.to)).map((x) => legKey(x.from, x.to)));
  const inRoundTrip = (leg) => placeKey(leg.from) && placeKey(leg.to) && paid.has(legKey(leg.to, leg.from));
  const others = { place: t("budget.otherLegs"), lodging: 0, transport: 0, activities: 0, missing: 0, legs: 0 };
  const missingList = []; // ce qui manque, dans l'ordre de l'itinéraire : { leg: { from, to } } ou { lodging: lieu }
  let pendingLegs = [];

  trip.items.forEach((it) => {
    if (it.type === "transport") {
      pendingLegs.push(it);
      return;
    }
    const row = { id: it.id, place: it.place || t("stop.unnamed"), lodging: 0, transport: 0, missing: 0, legs: pendingLegs.length,
      activities: (it.todos || []).reduce((s, x) => s + (hasPrice(x.price) ? x.price : 0), 0) };
    pendingLegs.forEach((leg) => {
      if (hasPrice(leg.price)) row.transport += leg.price;
      else if (!inRoundTrip(leg)) { row.missing++; missingList.push({ leg: { from: leg.from || "", to: leg.to || "" } }); }
    });
    if (hasPrice(it.price)) row.lodging = it.price;
    else if (nights(it.arrive, it.depart) > 0 || (!it.arrive && !it.depart)) { row.missing++; missingList.push({ lodging: row.place }); }
    pendingLegs = [];
    rows.push(row);
  });

  const last = rows[rows.length - 1] || others;
  pendingLegs.forEach((leg) => {
    last.legs++;
    if (hasPrice(leg.price)) last.transport += leg.price;
    else if (!inRoundTrip(leg)) { last.missing++; missingList.push({ leg: { from: leg.from || "", to: leg.to || "" } }); }
  });
  if (others.legs) rows.push(others);

  rows.forEach((r) => (r.total = r.lodging + r.transport + r.activities));
  const total = {
    lodging: rows.reduce((s, r) => s + r.lodging, 0),
    transport: rows.reduce((s, r) => s + r.transport, 0),
    activities: rows.reduce((s, r) => s + r.activities, 0),
    missing: rows.reduce((s, r) => s + r.missing, 0),
    missingList,
  };
  total.total = total.lodging + total.transport + total.activities;
  return { rows, total };
}
