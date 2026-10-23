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

// Date retenue pour une étape : son arrivée, sinon le début du voyage
export const stopDate = (trip, stop) => stop.arrive || tripStart(trip);

function tripStart(trip) {
  const dates = (trip.items || []).flatMap((i) =>
    i.type === "stop" ? [i.arrive] : i.type === "transport" ? [(i.dep || "").slice(0, 10)] : []
  ).filter(Boolean).sort();
  return dates[0] || null;
}

// trips : { idVoyage: voyage } ; sent : { clé: date d'envoi }
export function findDueReminders(trips, today, daysBefore = 3, sent = {}) {
  const due = [];
  for (const [tripId, trip] of Object.entries(trips)) {
    for (const stop of trip.items || []) {
      if (stop.type !== "stop") continue;
      const left = (stop.todos || []).filter((t) => !t.done && t.text);
      if (!left.length) continue;
      const date = stopDate(trip, stop);
      if (!date) continue;
      const inDays = daysBetween(today, date);
      if (inDays < 0 || inDays > daysBefore) continue;
      const key = `${tripId}:${stop.id}:${date}`;
      if (sent[key]) continue;
      due.push({ key, tripId, tripName: trip.name || "Mon voyage", place: stop.place || "Étape", date, inDays, items: left.map((t) => t.text) });
    }
  }
  return due.sort((a, b) => a.date.localeCompare(b.date));
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function when(inDays) {
  if (inDays === 0) return "aujourd'hui";
  if (inDays === 1) return "demain";
  return `dans ${inDays} jours`;
}

function fmtDate(s) {
  return new Date(s + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

// Un seul e-mail par personne, qui regroupe toutes les étapes concernées
export function buildEmail(reminders, siteUrl) {
  const total = reminders.reduce((n, r) => n + r.items.length, 0);
  const first = reminders[0];
  const subject = reminders.length === 1
    ? `Rappel : ${total} chose${total > 1 ? "s" : ""} à réserver pour ${first.place}`
    : `Rappel : ${total} choses à réserver pour vos prochaines étapes`;

  const text = [
    "Bonjour,",
    "",
    "Certaines choses ne sont pas encore cochées dans votre carnet de route :",
    "",
    ...reminders.flatMap((r) => [
      `${r.place} (${r.tripName}) : ${when(r.inDays)}, ${fmtDate(r.date)}`,
      ...r.items.map((i) => `  - ${i}`),
      `  ${siteUrl}#voyage-${r.tripId}`,
      "",
    ]),
    "Une fois réservées, cochez-les dans le site pour ne plus recevoir ce rappel.",
    "",
    "Carnet de route",
    "Pour ne plus recevoir ces e-mails : Paramètres → Rappels par e-mail.",
  ].join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#12302b;max-width:560px">
    <p>Bonjour,</p>
    <p>Certaines choses ne sont pas encore cochées dans votre carnet de route :</p>
    ${reminders.map((r) => `
      <div style="border:1px solid #d3dfdb;border-radius:10px;padding:14px 16px;margin:12px 0">
        <div style="font-size:18px;font-weight:bold">${esc(r.place)}</div>
        <div style="color:#5d716c;font-size:13px">${esc(r.tripName)} · ${esc(when(r.inDays))}, ${esc(fmtDate(r.date))}</div>
        <ul style="margin:10px 0;padding-left:20px">${r.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        <a href="${esc(siteUrl)}#voyage-${esc(r.tripId)}" style="display:inline-block;background:#0f6b5c;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-size:14px">Ouvrir le voyage</a>
      </div>`).join("")}
    <p>Une fois réservées, cochez-les dans le site pour ne plus recevoir ce rappel.</p>
    <p style="color:#5d716c;font-size:12px">Carnet de route · Pour ne plus recevoir ces e-mails : Paramètres → Rappels par e-mail.</p>
  </div>`;

  return { subject, text, html };
}
