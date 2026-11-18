// Ce qu'un voyageur a changé dans un voyage partagé, en quelques phrases courtes
//
// describeChanges compare la dernière version synchronisée (avant) et la mienne (après), élément
// par élément grâce à leur id : seules mes modifications sont décrites, pas celles des autres
// arrivées entre-temps. Positions sur la carte, tracés et champs techniques ne comptent pas.
// Chaque changement est un code, { k: "dates", p: "Porto" } (p : nom de l'étape ou du trajet,
// n : nombre), mis en phrase à l'affichage dans la langue de la personne qui lit (editPhrase).
// Les traces écrites avant ces codes sont des phrases en français, affichées telles quelles.
// mergeEdit regroupe les modifications d'une même série (moins d'une heure d'écart) : une seule
// trace par voyageur et par voyage, jamais une par enregistrement.

import { t, count, locale } from "./i18n.js";

export const MAX_WHAT = 5;       // changements gardés ; au-delà, « more » compte le reste
export const MAX_LEN = 120;      // caractères par phrase (anciennes traces) ou par nom (p)
export const SERIES_MS = 3600000; // une série de modifications : moins d'une heure d'écart
// Codes possibles (les règles Firestore n'acceptent que ceux-là)
export const EDIT_KINDS = ["stopAdded", "stopRemoved", "legAdded", "legRemoved", "stopRenamed", "dates", "lodging",
  "todosAdded", "todos", "tickets", "leg", "order", "tripName", "currency"];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const stopName = (s) => s.place || "";
const legName = (l) => `${l.from || "?"} → ${l.to || "?"}`;
const pick = (o, keys) => keys.map((k) => o[k] ?? null);
const ids = (list) => (list || []).map((x) => x.id);
const code = (k, p, n) => ({ k, ...(p !== undefined ? { p: String(p).slice(0, MAX_LEN) } : {}), ...(n ? { n: Math.min(n, 999) } : {}) });

// Activités et billets : on compare le contenu, sans les billets (comptés à part)
const todoCore = (x) => { const { tickets, ...rest } = x; return rest; };
const ticketIds = (list) => (list || []).map((f) => f.id).sort();

export function describeChanges(before, after) {
  if (!before || !after) return [];
  const B = new Map((before.items || []).map((i) => [i.id, i]));
  const A = new Map((after.items || []).map((i) => [i.id, i]));
  const out = { added: [], removed: [], addedLegs: [], removedLegs: [], dates: [], lodging: [], legs: [], todos: [], tickets: [], other: [] };

  for (const [id, it] of A) {
    if (B.has(id)) continue;
    if (it.type === "stop") out.added.push(code("stopAdded", stopName(it)));
    else out.addedLegs.push(code("legAdded", legName(it)));
  }
  for (const [id, it] of B) {
    if (A.has(id)) continue;
    if (it.type === "stop") out.removed.push(code("stopRemoved", stopName(it)));
    else out.removedLegs.push(code("legRemoved", legName(it)));
  }

  for (const [id, a] of A) {
    const b = B.get(id);
    if (!b) continue;
    if (a.type === "stop") {
      const name = stopName(a);
      if (!same(pick(a, ["place"]), pick(b, ["place"]))) out.other.push(code("stopRenamed", name));
      if (!same(pick(a, ["arrive", "depart", "arriveTime", "departTime"]), pick(b, ["arrive", "depart", "arriveTime", "departTime"]))) out.dates.push(code("dates", name));
      if (!same(pick(a, ["price", "address", "links", "notes"]), pick(b, ["price", "address", "links", "notes"]))) out.lodging.push(code("lodging", name));
      // Activités : ajoutées (comptées), modifiées, supprimées ou cochées
      const bt = new Map((b.todos || []).map((x) => [x.id, x]));
      const at = a.todos || [];
      const added = at.filter((x) => !bt.has(x.id)).length;
      const changed = at.some((x) => bt.has(x.id) && !same(todoCore(x), todoCore(bt.get(x.id))))
        || [...bt.keys()].some((k) => !at.some((x) => x.id === k));
      if (added) out.todos.push(code("todosAdded", name, added));
      if (changed) out.todos.push(code("todos", name));
      if (at.some((x) => bt.has(x.id) && !same(ticketIds(x.tickets), ticketIds(bt.get(x.id).tickets)))) out.tickets.push(code("tickets", name));
    } else {
      const fields = ["mode", "from", "to", "dep", "arr", "company", "ref", "url", "price", "notes"];
      if (!same(pick(a, fields), pick(b, fields))) out.legs.push(code("leg", legName(a)));
      if (!same(ticketIds(a.tickets), ticketIds(b.tickets))) out.tickets.push(code("tickets", legName(a)));
    }
  }

  // Ordre des étapes et trajets restés dans le voyage
  const kept = ids(after.items).filter((i) => B.has(i));
  if (!same(kept, ids(before.items).filter((i) => A.has(i)))) out.other.push(code("order"));
  if ((after.name || "") !== (before.name || "")) out.other.push(code("tripName"));
  if ((after.currency || "") !== (before.currency || "")) out.other.push(code("currency"));

  const list = [...out.added, ...out.removed, ...out.addedLegs, ...out.removedLegs, ...out.dates, ...out.lodging, ...out.legs, ...out.todos, ...out.tickets, ...out.other];
  return list.filter((w, i) => list.findIndex((x) => same(x, w)) === i);
}

// Ma trace, complétée ou remplacée : prev { at, since, what, more } (dates en ms), now en ms.
// Renvoie { what, more, since } (since : null pour une nouvelle série, à fixer par le serveur)
// Les nouvelles phrases s'ajoutent à la suite, sans doublon ; au-delà de 5, elles sont comptées dans « more »
export function mergeEdit(prev, what, now) {
  const fresh = !prev || !(now - prev.at < SERIES_MS);
  const kept = fresh ? [] : prev.what || [];
  const has = (list, w) => list.some((x) => same(x, w));
  const all = [...kept, ...what.filter((w, i) => !has(kept, w) && !has(what.slice(0, i), w))];
  return { what: all.slice(0, MAX_WHAT), more: (fresh ? 0 : prev.more || 0) + Math.max(0, all.length - MAX_WHAT), since: fresh ? null : prev.since };
}

// Un changement en toutes lettres, dans la langue choisie : « dates de Porto », « dates for Porto »
export function editPhrase(w) {
  if (typeof w === "string") return w; // ancienne trace, déjà en phrase
  if (!w || !EDIT_KINDS.includes(w.k)) return "";
  const params = { p: w.p || t("edit.unnamed"), elide: true };
  return w.k === "todosAdded" ? count(w.n || 1, "edit.todosAdded", params) : t(`edit.${w.k}`, params);
}

// « ajout de l'étape Porto, 2 activités ajoutées à Lisbonne et 3 autres changements »
export function editText(what, more) {
  const parts = (what || []).map(editPhrase).filter(Boolean);
  if (more) parts.push(count(more, "edit.more"));
  return new Intl.ListFormat(locale(), { type: "conjunction" }).format(parts);
}
