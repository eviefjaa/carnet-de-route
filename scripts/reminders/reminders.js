// Logique des rappels (sans accès réseau, testable seule)
//
// Pour chaque étape qui commence dans les DAYS_BEFORE prochains jours
// et qui a encore des éléments non cochés dans sa checklist, on prépare un rappel.
// Un rappel n'est envoyé qu'une fois par étape et par date (clé « voyage:étape:date »).

const DAY = 86400000;

export function daysBetween(from, to) {
  const [a, b] = [from, to].map((s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));
  return Math.round((b - a) / DAY);
}

export function todayIn(timeZone = "Europe/Paris", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// Un voyage a pu être écrit par n'importe lequel de ses voyageurs : on ne garde que ce qui a
// la bonne forme (sinon une valeur piégée ferait planter les rappels de tout le monde)
const DATE = /^\d{4}-\d{2}-\d{2}/;
const s = (x) => (typeof x === "string" ? x : "");
export function cleanTrip(trip) {
  const items = Array.isArray(trip && trip.items) ? trip.items : [];
  return {
    name: s(trip && trip.name),
    items: items.filter((i) => i && typeof i === "object").map((i) => ({
      id: s(i.id), type: s(i.type), place: s(i.place),
      arrive: DATE.test(s(i.arrive)) ? s(i.arrive).slice(0, 10) : "",
      dep: DATE.test(s(i.dep)) ? s(i.dep).slice(0, 10) : "",
      todos: (Array.isArray(i.todos) ? i.todos : []).filter((t) => t && typeof t === "object")
        .map((t) => ({ text: s(t.text).slice(0, 200), done: t.done === true, book: t.book !== false })),
    })),
  };
}

// Date retenue pour une étape : son arrivée, sinon le début du voyage
export const stopDate = (trip, stop) => stop.arrive || tripStart(trip);

function tripStart(trip) {
  const dates = (trip.items || []).flatMap((i) =>
    i.type === "stop" ? [i.arrive] : i.type === "transport" ? [i.dep] : []
  ).filter(Boolean).sort();
  return dates[0] || null;
}

// trips : { idVoyage: voyage } ; sent : { clé: date d'envoi }
export function findDueReminders(trips, today, daysBefore = 3, sent = {}) {
  const due = [];
  for (const [tripId, raw] of Object.entries(trips)) {
    const trip = cleanTrip(raw);
    for (const stop of trip.items) {
      if (stop.type !== "stop") continue;
      const left = stop.todos.filter((t) => t.book && !t.done && t.text); // seulement ce qui est à réserver
      if (!left.length) continue;
      const date = stopDate(trip, stop);
      if (!date) continue;
      const inDays = daysBetween(today, date);
      if (inDays < 0 || inDays > daysBefore) continue;
      const key = `${tripId}:${stop.id}:${date}`;
      if (sent[key]) continue;
      due.push({ key, tripId, tripName: trip.name, place: stop.place, date, inDays, items: left.map((t) => t.text) });
    }
  }
  return due.sort((a, b) => a.date.localeCompare(b.date));
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Textes de l'e-mail, dans la langue choisie par le destinataire (prefs.lang ; français par défaut)
const TEXTS = {
  fr: {
    locale: "fr-FR",
    sep: " : ", today: "aujourd'hui", tomorrow: "demain", inDays: (n) => `dans ${n} jours`,
    subjectOne: (n, place) => `Rappel : ${n} chose${n > 1 ? "s" : ""} à réserver pour ${place}`,
    subjectMany: (n) => `Rappel : ${n} choses à réserver pour vos prochaines étapes`,
    hello: "Bonjour,",
    intro: "Certaines choses ne sont pas encore cochées pour votre voyage sur Hippalos :",
    open: "Ouvrir le voyage",
    outro: "Une fois réservées, cochez-les dans le site pour ne plus recevoir ce rappel.",
    stop: "Pour ne plus recevoir ces e-mails : Paramètres → Rappels par e-mail.",
    trip: "Mon voyage", place: "Étape",
  },
  en: {
    locale: "en-GB",
    sep: ": ", today: "today", tomorrow: "tomorrow", inDays: (n) => `in ${n} days`,
    subjectOne: (n, place) => `Reminder: ${n} thing${n > 1 ? "s" : ""} to book for ${place}`,
    subjectMany: (n) => `Reminder: ${n} things to book for your next stops`,
    hello: "Hello,",
    intro: "A few things aren't ticked yet for your trip on Hippalos:",
    open: "Open the trip",
    outro: "Once they're booked, tick them on the site and this reminder will stop.",
    stop: "To stop receiving these emails: Settings → Email reminders.",
    trip: "My trip", place: "Unnamed stop",
  },
};
export const emailLang = (prefs) => (prefs && prefs.lang === "en" ? "en" : "fr");

function when(inDays, T) {
  if (inDays === 0) return T.today;
  if (inDays === 1) return T.tomorrow;
  return T.inDays(inDays);
}

function fmtDate(s, T) {
  return new Date(s + "T12:00:00Z").toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

// Un seul e-mail par personne, qui regroupe toutes les étapes concernées
export function buildEmail(due, siteUrl, lang = "fr") {
  const T = TEXTS[lang] || TEXTS.fr;
  const reminders = due.map((r) => ({ ...r, tripName: r.tripName || T.trip, place: r.place || T.place }));
  const total = reminders.reduce((n, r) => n + r.items.length, 0);
  const first = reminders[0];
  const subject = reminders.length === 1 ? T.subjectOne(total, first.place) : T.subjectMany(total);

  const text = [
    T.hello,
    "",
    T.intro,
    "",
    ...reminders.flatMap((r) => [
      `${r.place} (${r.tripName})${T.sep}${when(r.inDays, T)}, ${fmtDate(r.date, T)}`,
      ...r.items.map((i) => `  - ${i}`),
      `  ${siteUrl}#voyage-${r.tripId}`,
      "",
    ]),
    T.outro,
    "",
    "Hippalos",
    T.stop,
  ].join("\n");

  const html = `<div lang="${lang}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#12302b;max-width:560px">
    <p>${esc(T.hello)}</p>
    <p>${esc(T.intro)}</p>
    ${reminders.map((r) => `
      <div style="border:1px solid #d3dfdb;border-radius:10px;padding:14px 16px;margin:12px 0">
        <div style="font-size:18px;font-weight:bold">${esc(r.place)}</div>
        <div style="color:#5d716c;font-size:13px">${esc(r.tripName)} · ${esc(when(r.inDays, T))}, ${esc(fmtDate(r.date, T))}</div>
        <ul style="margin:10px 0;padding-left:20px">${r.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        <a href="${esc(siteUrl)}#voyage-${esc(r.tripId)}" style="display:inline-block;background:#0f6b5c;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px">${esc(T.open)}</a>
      </div>`).join("")}
    <p>${esc(T.outro)}</p>
    <p style="color:#5d716c;font-size:12px">Hippalos · ${esc(T.stop)}</p>
  </div>`;

  return { subject, text, html };
}
