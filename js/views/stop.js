// Affichage et formulaire d'une étape (lieu, dates, hébergement, liens de réservation)

import { esc, uid, safeUrl, source, fmtDay, nights, plural, fmtMoney, priceInput, parsePrice, hasPrice } from "../utils.js";
import { state, tripStart } from "../store.js";
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

  // Carte repliée : l'essentiel, et ce qui reste à réserver en rouge. Un clic l'ouvre.
  const open = state.openItems.has(it.id);
  const toBook = (it.todos || []).filter((t) => !t.done).map((t) => t.text);
  const detailId = `stop-detail-${esc(it.id)}`;

  return `<article class="item stop${open ? " open" : ""}">
    <div class="stop-summary">
      <div class="stop-head">
        ${dayN ? `<span class="day">JOUR ${dayN}</span>` : ""}
        <h2><button class="stop-toggle" data-act="toggle-item" data-id="${esc(it.id)}" type="button" aria-expanded="${open}" aria-controls="${detailId}">${esc(it.place || "Étape sans nom")}</button></h2>
        ${it.country ? `<span class="stop-country">${esc(it.country)}</span>` : ""}
        <svg class="stop-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="dates">
        ${it.arrive ? esc(fmtDay(it.arrive)) : "date à définir"}${it.depart ? " → " + esc(fmtDay(it.depart)) : ""}
        ${n ? `<span class="nights">${plural(n, "nuit")}</span>` : ""}
      </div>
      ${toBook.length ? `<p class="to-book">À réserver : ${toBook.slice(0, 3).map(esc).join(", ")}${toBook.length > 3 ? ` et ${toBook.length - 3} autre${toBook.length > 4 ? "s" : ""}` : ""}</p>` : ""}
    </div>
    ${open ? `<div class="stop-detail" id="${detailId}">
    ${price}
    ${it.address ? `<div class="addr">${esc(it.address)}</div>` : ""}
    ${links.length ? `<div class="links">${links.map(linkCard).join("")}</div>` : ""}
    ${it.notes ? `<div class="notes">${esc(it.notes)}</div>` : ""}
    ${maps ? `<div class="leg-extra"><a href="${esc(maps)}" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps ↗</a></div>` : ""}
    ${checklist(it)}
    ${itemActions(it, idx, trip)}
    </div>` : ""}
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
  return `<form class="form" data-form="stop" data-id="${esc(it.id)}" data-new="${isNew ? 1 : 0}">
    <h3>${isNew ? "Nouvelle étape" : "Modifier l'étape"}</h3>
    <div class="grid">
      <label class="f full">Lieu<span class="ac"><input name="place" id="f-place-${esc(it.id)}" value="${esc(it.place)}" placeholder="Tapez une ville, une région ou un pays" required data-place="place" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false"></span></label>
      <label class="f">Arrivée<input type="date" name="arrive" id="f-arr-${esc(it.id)}" value="${esc(it.arrive)}"></label>
      <label class="f">Départ<input type="date" name="depart" id="f-dep-${esc(it.id)}" value="${esc(it.depart)}" min="${esc(it.arrive)}"></label>
      <label class="f">Prix de l'hébergement (séjour complet)<input name="price" id="f-price-${esc(it.id)}" value="${esc(priceInput(it.price))}" inputmode="decimal" placeholder="Ex. 450"></label>
      <label class="f">Adresse de l'hébergement<input name="address" id="f-addr-${esc(it.id)}" value="${esc(it.address)}" placeholder="Optionnel : sert aussi à placer l'étape sur la carte"></label>
    </div>
    <div class="computed" data-nights></div>
    <div class="f-label">
      Liens de réservation (hôtel, Airbnb…)
      <div class="links-edit" data-links>${links.map(linkRow).join("")}</div>
    </div>
    <div><button class="btn small" data-act="add-link" type="button">+ Ajouter un lien</button></div>
    <div class="f-label">
      À faire et à réserver (cochez ce qui est déjà réservé)
      <div class="todos-edit" data-todos>${(it.todos || []).map(todoRow).join("")}</div>
    </div>
    <div><button class="btn small" data-act="add-todo-row" type="button">+ Ajouter une activité</button></div>
    <label class="f">Notes<textarea name="notes" id="f-notes-${esc(it.id)}" placeholder="Code d'accès, heure de check-in, idées de visites…">${esc(it.notes)}</textarea></label>
    <div class="form-actions">
      <button class="btn" data-act="cancel" type="button">Annuler</button>
      <button class="btn primary" type="submit">Enregistrer</button>
    </div>
  </form>`;
}

export function linkRow(l) {
  return `<div class="link-edit" data-link="${esc(l.id)}">
    <input name="lbl" id="l-lbl-${esc(l.id)}" value="${esc(l.label)}" placeholder="Nom (ex. Pousada Azul)" aria-label="Nom du lien">
    <input name="url" id="l-url-${esc(l.id)}" value="${esc(l.url)}" placeholder="https://www.airbnb.fr/rooms/…" aria-label="Adresse du lien" inputmode="url">
    <button class="btn ghost small" data-act="rm-link" type="button" aria-label="Retirer ce lien">✕</button>
  </div>`;
}

// Une activité dans le formulaire : case « réservé », texte, retrait
export function todoRow(t) {
  const n = (t.tickets || []).length;
  return `<div class="todo-edit" data-todo-row="${esc(t.id)}">
    <input type="checkbox" name="todoDone" id="td-done-${esc(t.id)}"${t.done ? " checked" : ""} aria-label="Déjà réservé ou fait">
    <input name="todoText" id="td-text-${esc(t.id)}" value="${esc(t.text)}" placeholder="Ex. Visite du Christ Rédempteur, réserver le restaurant…" maxlength="120" autocomplete="off" aria-label="Activité">
    ${n ? `<span class="todo-tk" title="Billets gérés depuis la checklist de l'étape">${n} billet${n > 1 ? "s" : ""}</span>` : ""}
    <button class="btn ghost small" data-act="rm-todo-row" type="button" aria-label="Retirer cette activité">✕</button>
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
  // Checklist : les billets des activités sont repris à l'enregistrement (events.js)
  o.todos = [...f.querySelectorAll("[data-todo-row]")]
    .map((r) => ({
      id: r.dataset.todoRow,
      text: r.querySelector('[name="todoText"]').value.trim(),
      done: r.querySelector('[name="todoDone"]').checked,
    }))
    .filter((t) => t.text);
  return o;
}

export function newStop(place = "", arrive = "") {
  return { id: uid(), type: "stop", place, arrive, depart: "", address: "", notes: "", links: [], price: null, todos: [] };
}
