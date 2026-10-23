// Affichage et formulaire d'une étape (lieu, dates, hébergement, liens de réservation)

import { esc, uid, safeUrl, source, fmtDay, nights, plural, fmtMoney, priceInput, parsePrice, hasPrice } from "../utils.js";
import { tripStart } from "../store.js";
import { itemActions } from "./actions.js";
import { pickedPlace } from "../autocomplete.js";
import { checklist } from "./checklist.js";

export function stopCard(it, trip, idx) {
  const start = tripStart(trip);
  const dayN = it.arrive && start ? nights(start, it.arrive) + 1 : null;
  const n = nights(it.arrive, it.depart);
  const links = (it.links || []).filter((l) => safeUrl(l.url));
  const where = it.address || it.place;
  const maps = where ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}` : "";
  const cur = trip.currency || "EUR";
  const price = hasPrice(it.price)
    ? `<div><span class="price">${esc(fmtMoney(it.price, cur))}</span>${n ? ` <span class="price-sub">soit ${esc(fmtMoney(Math.round((it.price / n) * 100) / 100, cur))} / nuit</span>` : ""}</div>`
    : "";

  return `<article class="item stop">
    <div class="stop-head">
      ${dayN ? `<span class="day">JOUR ${dayN}</span>` : ""}
      <h2>${esc(it.place || "Étape sans nom")}</h2>
      ${it.country ? `<span class="stop-country">${esc(it.country)}</span>` : ""}
    </div>
    <div class="dates">
      ${it.arrive ? esc(fmtDay(it.arrive)) : "date à définir"}${it.depart ? " → " + esc(fmtDay(it.depart)) : ""}
      ${n ? `<span class="nights">${plural(n, "nuit")}</span>` : ""}
    </div>
    ${price}
    ${it.address ? `<div class="addr">${esc(it.address)}</div>` : ""}
    ${links.length ? `<div class="links">${links.map(linkCard).join("")}</div>` : ""}
    ${it.notes ? `<div class="notes">${esc(it.notes)}</div>` : ""}
    ${maps ? `<div class="leg-extra"><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps ↗</a></div>` : ""}
    ${checklist(it)}
    ${itemActions(it, idx, trip)}
  </article>`;
}

function linkCard(l) {
  const u = safeUrl(l.url);
  return `<a class="link" href="${esc(u)}" target="_blank" rel="noopener noreferrer">
    <span class="src">${esc(source(u))}</span>
    <span class="lbl">${esc(l.label || u)}</span>
    <span class="go">↗</span>
  </a>`;
}

export function stopForm(it, isNew) {
  const links = it.links && it.links.length ? it.links : [{ id: uid(), label: "", url: "" }];
  return `<form class="form" data-form="stop" data-id="${it.id}" data-new="${isNew ? 1 : 0}">
    <h3>${isNew ? "Nouvelle étape" : "Modifier l'étape"}</h3>
    <div class="grid">
      <label class="f full">Lieu<span class="ac"><input name="place" id="f-place-${it.id}" value="${esc(it.place)}" placeholder="Tapez une ville, une région ou un pays" required data-place="place" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">Arrivée<input type="date" name="arrive" id="f-arr-${it.id}" value="${esc(it.arrive)}"></label>
      <label class="f">Départ<input type="date" name="depart" id="f-dep-${it.id}" value="${esc(it.depart)}" min="${esc(it.arrive)}"></label>
      <label class="f">Prix de l'hébergement (séjour complet)<input name="price" id="f-price-${it.id}" value="${esc(priceInput(it.price))}" inputmode="decimal" placeholder="Ex. 450"></label>
      <label class="f">Adresse de l'hébergement<input name="address" id="f-addr-${it.id}" value="${esc(it.address)}" placeholder="Optionnel : sert aussi à placer l'étape sur la carte"></label>
    </div>
    <div class="computed" data-nights></div>
    <div class="f-label">
      Liens de réservation (hôtel, Airbnb…)
      <div class="links-edit" data-links>${links.map(linkRow).join("")}</div>
    </div>
    <div><button class="btn small" data-act="add-link" type="button">+ Ajouter un lien</button></div>
    <label class="f">Notes<textarea name="notes" id="f-notes-${it.id}" placeholder="Code d'accès, heure de check-in, idées de visites…">${esc(it.notes)}</textarea></label>
    <div class="form-actions">
      <button class="btn" data-act="cancel" type="button">Annuler</button>
      <button class="btn primary" type="submit">Enregistrer</button>
    </div>
  </form>`;
}

export function linkRow(l) {
  return `<div class="link-edit" data-link="${l.id}">
    <input name="lbl" id="l-lbl-${l.id}" value="${esc(l.label)}" placeholder="Nom (ex. Pousada Azul)" aria-label="Nom du lien">
    <input name="url" id="l-url-${l.id}" value="${esc(l.url)}" placeholder="https://www.airbnb.fr/rooms/…" aria-label="Adresse du lien" inputmode="url">
    <button class="btn ghost small" data-act="rm-link" type="button" aria-label="Retirer ce lien">✕</button>
  </div>`;
}

export function readStopForm(f) {
  const o = { id: f.dataset.id, type: "stop" };
  ["place", "arrive", "depart", "address", "notes"].forEach((k) => (o[k] = f[k].value.trim()));
  o.price = parsePrice(f.price.value);

  // Lieu choisi dans les suggestions : on garde sa position exacte et son pays
  const picked = pickedPlace(f.place);
  if (picked) {
    o.country = picked.country;
    o.geo = { q: [o.address, o.place].filter(Boolean).join(" | "), lat: picked.lat, lng: picked.lng };
  }
  o.links = [...f.querySelectorAll("[data-link]")]
    .map((r) => ({
      id: r.dataset.link,
      label: r.querySelector('[name="lbl"]').value.trim(),
      url: r.querySelector('[name="url"]').value.trim(),
    }))
    .filter((l) => l.url);
  return o;
}

export function newStop(place = "", arrive = "") {
  return { id: uid(), type: "stop", place, arrive, depart: "", address: "", notes: "", links: [], price: null };
}
