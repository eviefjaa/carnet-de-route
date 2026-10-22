// Fonctions utilitaires : identifiants, échappement HTML, liens, dates et durées

export const MODES = {
  bus: "Bus",
  train: "Train",
  avion: "Avion",
  voiture: "Voiture",
  bateau: "Bateau",
  autre: "Autre",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Rend une adresse web utilisable (ajoute https:// si besoin, refuse tout sauf http/https)
export function safeUrl(u) {
  u = String(u || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const x = new URL(u);
    return /^https?:$/.test(x.protocol) ? x.href : "";
  } catch {
    return "";
  }
}

// Nom lisible du site de réservation à partir de l'adresse
export function source(u) {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    if (h.includes("airbnb")) return "Airbnb";
    if (h.includes("booking")) return "Booking";
    if (h.includes("hotels.com")) return "Hotels.com";
    if (h.includes("expedia")) return "Expedia";
    if (h.includes("hostelworld")) return "Hostelworld";
    if (h.includes("vrbo") || h.includes("abritel")) return "Abritel";
    if (h.includes("google")) return "Google";
    return h.split(".").slice(-2, -1)[0] || h;
  } catch {
    return "Lien";
  }
}

// ---------- Dates ----------
// "2026-12-19" (date seule) ou "2026-12-19T08:30" (date et heure)
export const toDate = (s) => (s ? new Date(s.length <= 10 ? s + "T12:00:00" : s) : null);
const valid = (d) => d && !isNaN(d);

export function fmtDay(s) {
  const d = toDate(s);
  return valid(d) ? d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "";
}

export function fmtTime(s) {
  const d = toDate(s);
  return valid(d) && s.length > 10 ? d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
}

export function fmtDateTime(s) {
  if (!s) return "à définir";
  const t = fmtTime(s);
  return fmtDay(s) + (t ? " " + t : "");
}

export function nights(a, b) {
  const x = toDate(a), y = toDate(b);
  if (!valid(x) || !valid(y)) return null;
  const n = Math.round((y - x) / 86400000);
  return n >= 0 ? n : null;
}

export function duration(a, b) {
  const x = toDate(a), y = toDate(b);
  if (!valid(x) || !valid(y) || a.length <= 10 || b.length <= 10) return "";
  let m = Math.round((y - x) / 60000);
  if (m <= 0) return "";
  const h = Math.floor(m / 60);
  m = m % 60;
  return h ? `${h} h${m ? " " + String(m).padStart(2, "0") : ""}` : `${m} min`;
}

export const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
