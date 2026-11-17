// Ce qu'un voyageur a changé dans un voyage partagé, en quelques phrases courtes
//
// describeChanges compare la dernière version synchronisée (avant) et la mienne (après), élément
// par élément grâce à leur id : seules mes modifications sont décrites, pas celles des autres
// arrivées entre-temps. Positions sur la carte, tracés et champs techniques ne comptent pas.
// mergeEdit regroupe les modifications d'une même série (moins d'une heure d'écart) : une seule
// trace par voyageur et par voyage, jamais une par enregistrement.

export const MAX_WHAT = 5;       // phrases gardées ; au-delà, « more » compte le reste
export const MAX_LEN = 120;      // caractères par phrase
export const SERIES_MS = 3600000; // une série de modifications : moins d'une heure d'écart

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
// « de Porto », mais « d'Osaka » (élision devant une voyelle)
const de = (name) => (/^[aeiouyàâäéèêëîïôöûüœ]/i.test(name) ? `d'${name}` : `de ${name}`);
const stopName = (s) => s.place || "étape sans nom";
const legName = (l) => `${l.from || "?"} → ${l.to || "?"}`;
const pick = (o, keys) => keys.map((k) => o[k] ?? null);
const ids = (list) => (list || []).map((x) => x.id);

// Activités et billets : on compare le contenu, sans les billets (comptés à part)
const todoCore = (t) => { const { tickets, ...rest } = t; return rest; };
const ticketIds = (list) => (list || []).map((f) => f.id).sort();

export function describeChanges(before, after) {
  if (!before || !after) return [];
  const B = new Map((before.items || []).map((i) => [i.id, i]));
  const A = new Map((after.items || []).map((i) => [i.id, i]));
  const out = { added: [], removed: [], addedLegs: [], removedLegs: [], dates: [], lodging: [], legs: [], todos: [], tickets: [], other: [] };

  for (const [id, it] of A) {
    if (B.has(id)) continue;
    if (it.type === "stop") out.added.push(`ajout de l'étape ${stopName(it)}`);
    else out.addedLegs.push(`ajout du trajet ${legName(it)}`);
  }
  for (const [id, it] of B) {
    if (A.has(id)) continue;
    if (it.type === "stop") out.removed.push(`suppression de l'étape ${stopName(it)}`);
    else out.removedLegs.push(`suppression du trajet ${legName(it)}`);
  }

  for (const [id, a] of A) {
    const b = B.get(id);
    if (!b) continue;
    if (a.type === "stop") {
      const name = stopName(a);
      if (!same(pick(a, ["place"]), pick(b, ["place"]))) out.other.push(`nom de l'étape ${name}`);
      if (!same(pick(a, ["arrive", "depart", "arriveTime", "departTime"]), pick(b, ["arrive", "depart", "arriveTime", "departTime"]))) out.dates.push(`dates ${de(name)}`);
      if (!same(pick(a, ["price", "address", "links", "notes"]), pick(b, ["price", "address", "links", "notes"]))) out.lodging.push(`hébergement ${de(name)}`);
      // Activités : ajoutées (comptées), modifiées, supprimées ou cochées
      const bt = new Map((b.todos || []).map((t) => [t.id, t]));
      const at = a.todos || [];
      const added = at.filter((t) => !bt.has(t.id)).length;
      const changed = at.some((t) => bt.has(t.id) && !same(todoCore(t), todoCore(bt.get(t.id))))
        || [...bt.keys()].some((k) => !at.some((t) => t.id === k));
      if (added) out.todos.push(`${added} activité${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""} à ${name}`);
      if (changed) out.todos.push(`activités ${de(name)}`);
      if (at.some((t) => bt.has(t.id) && !same(ticketIds(t.tickets), ticketIds(bt.get(t.id).tickets)))) out.tickets.push(`billets ${de(name)}`);
    } else {
      const fields = ["mode", "from", "to", "dep", "arr", "company", "ref", "url", "price", "notes"];
      if (!same(pick(a, fields), pick(b, fields))) out.legs.push(`trajet ${legName(a)}`);
      if (!same(ticketIds(a.tickets), ticketIds(b.tickets))) out.tickets.push(`billets ${de(legName(a))}`);
    }
  }

  // Ordre des étapes et trajets restés dans le voyage
  const kept = ids(after.items).filter((i) => B.has(i));
  if (!same(kept, ids(before.items).filter((i) => A.has(i)))) out.other.push("ordre des étapes");
  if ((after.name || "") !== (before.name || "")) out.other.push("nom du voyage");
  if ((after.currency || "") !== (before.currency || "")) out.other.push("devise du voyage");

  const list = [...out.added, ...out.removed, ...out.addedLegs, ...out.removedLegs, ...out.dates, ...out.lodging, ...out.legs, ...out.todos, ...out.tickets, ...out.other];
  return [...new Set(list.map((s) => s.slice(0, MAX_LEN)))];
}

// Ma trace, complétée ou remplacée : prev { at, since, what, more } (dates en ms), now en ms.
// Renvoie { what, more, since } (since : null pour une nouvelle série, à fixer par le serveur)
// Les nouvelles phrases s'ajoutent à la suite, sans doublon ; au-delà de 5, elles sont comptées dans « more »
export function mergeEdit(prev, what, now) {
  const fresh = !prev || !(now - prev.at < SERIES_MS);
  const kept = fresh ? [] : prev.what || [];
  const all = [...kept, ...what.filter((w, i) => !kept.includes(w) && what.indexOf(w) === i)];
  return { what: all.slice(0, MAX_WHAT), more: (fresh ? 0 : prev.more || 0) + Math.max(0, all.length - MAX_WHAT), since: fresh ? null : prev.since };
}

// « ajout de l'étape Porto, 2 activités ajoutées à Lisbonne et 3 autres changements »
export function editText(what, more) {
  const parts = [...(what || [])];
  if (more) parts.push(`${more} autre${more > 1 ? "s" : ""} changement${more > 1 ? "s" : ""}`);
  if (!parts.length) return "";
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}
