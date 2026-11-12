// Créer son propre voyage à partir d'un itinéraire publié
//
// La publication n'est jamais modifiée : on en tire une copie de travail, avec de nouveaux id.
// « Jour 1, Jour 2… » redeviennent des dates si l'on donne une date de départ.
// Positions et tracés ne sont pas repris (arrondis à 2 km dans la publication) : le géocodage
// et le calcul des routes les refont à partir des noms de lieux. Jamais repris : budget, prix,
// commentaires, favoris, auteur.

import { uid, safeUrl, dayOrEmpty, MODES } from "./utils.js";

// Date « AAAA-MM-JJ » décalée de n jours (calcul en UTC : pas de saut à l'heure d'été)
export function addDays(day, n) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// kinds : libellés des types de recommandation (RECO_KINDS de social.js)
export function tripFromPost(post, { name, start = "" } = {}, kinds = {}) {
  const trip = post.trip || {};
  const sejour = trip.kind === "sejour";
  const from = dayOrEmpty(start);
  const dayOf = (n) => (from && Number.isInteger(n) && n > 0 ? addDays(from, n - 1) : "");
  const text = (s, max) => String(s || "").slice(0, max);
  const posted = Array.isArray(trip.items) ? trip.items : [];

  const items = posted.map((it) => {
    if (it.type === "transport") {
      return { id: uid(), type: "transport", mode: MODES[it.mode] ? it.mode : "autre", from: text(it.from, 120), to: text(it.to, 120),
        dep: dayOf(it.day), arr: "", company: "", ref: "", url: "", notes: "", price: null };
    }
    const arrive = dayOf(it.day);
    const depart = arrive && Number.isInteger(it.nights) && it.nights >= 0 ? addDays(arrive, it.nights) : "";
    // Activités : rien à réserver d'office (book: false), à l'auteur du nouveau voyage d'en décider
    const program = Array.isArray(it.program) ? it.program : null;
    const todos = sejour && program
      ? program.filter((a) => a.text).map((a) => ({ id: uid(), text: text(a.text, 120), done: false, book: false,
          date: dayOf(a.day), time: /^([01]\d|2[0-3]):[0-5]\d$/.test(a.time || "") ? a.time : "", how: text(a.how, 200) }))
      : (it.todos || []).filter(Boolean).map((t) => ({ id: uid(), text: text(t, 120), done: false, book: false }));
    return { id: uid(), type: "stop", place: text(it.place, 120), country: text(it.country, 60), arrive, depart,
      address: "", notes: "", links: [], price: null, todos };
  });

  // Recommandations : dans l'étape où elles ont été rangées (même index que dans la publication),
  // celles pour tout le voyage dans la première étape
  const firstStop = items.find((i) => i.type === "stop");
  (post.recos || []).forEach((r) => {
    const target = Number.isInteger(r.stop) && posted[r.stop] && posted[r.stop].type === "stop" ? items[r.stop] : firstStop;
    if (!target || !r.name) return;
    const kind = kinds[r.kind] ? ` (${kinds[r.kind]})` : "";
    const line = `${r.name}${kind}${r.where ? `, ${r.where}` : ""}${r.note ? ` : ${r.note.replace(/\s+/g, " ").trim()}` : ""}`;
    target.notes = target.notes ? `${target.notes}\n${line}` : line;
    const url = safeUrl(r.url);
    if (url) target.links.push({ id: uid(), label: text(r.name, 100), url });
  });

  return {
    name: text(name || post.title, 200) || "Nouveau voyage",
    country: /^[A-Z]{2}$/.test(trip.country || "") ? trip.country : "",
    kind: sejour ? "sejour" : "",
    items,
    source: { postId: String(post.id), ownerHandle: text(post.ownerHandle, 20) },
  };
}
