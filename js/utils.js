// Fonctions utilitaires : identifiants, échappement HTML, liens, dates et durées
// Dates, heures et prix dans la langue choisie (i18n.js)

import { t, labels, locale, getLang } from "./i18n.js";

// Moyens de transport : clés enregistrées dans les voyages (fixes), libellés traduits
export const MODES = labels("mode", ["bus", "train", "avion", "voiture", "bateau", "autre"]);

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
    return t("link.generic");
  }
}

// ---------- Dates ----------
// "2026-12-19" (date seule) ou "2026-12-19T08:30" (date et heure)
export const toDate = (s) => (s ? new Date(s.length <= 10 ? s + "T12:00:00" : s) : null);
const valid = (d) => d && !isNaN(d);
// Date seule bien formée (AAAA-MM-JJ), sinon chaîne vide
export const dayOrEmpty = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && valid(toDate(s)) ? s : "");
// Heure bien formée (HH:MM), sinon chaîne vide
export const timeOrEmpty = (s) => (typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : "");
// Activités dans l'ordre chronologique : les datées d'abord (par jour, puis par heure),
// celles sans date ensuite, dans l'ordre où elles ont été ajoutées
export const byDate = (todos) =>
  [...(todos || [])].sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999") || (a.time || "99").localeCompare(b.time || "99"));
// Activité à réserver ? book: false = rien à réserver ; absent (activités d'avant l'option) = à réserver
export const needsBooking = (x) => x.book !== false;
// « 14 h 30 » en français, « 14:30 » en anglais
export const fmtHour = (s) => (getLang() === "en" ? s : s.replace(":", " h "));

export function fmtDay(s) {
  const d = toDate(s);
  return valid(d) ? d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" }) : "";
}

export function fmtTime(s) {
  const d = toDate(s);
  return valid(d) && s.length > 10 ? d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", hour12: false }) : "";
}

export function fmtDateTime(s) {
  if (!s) return t("date.toDefine");
  const hm = fmtTime(s);
  return fmtDay(s) + (hm ? " " + hm : "");
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
  const mm = String(m).padStart(2, "0");
  // « 3 h 05 » en français, « 3h 05 » en anglais
  if (getLang() === "en") return h ? `${h}h${m ? " " + mm : ""}` : `${m} min`;
  return h ? `${h} h${m ? " " + mm : ""}` : `${m} min`;
}

// Nombre fini, sinon la valeur par défaut (données d'un autre compte : jamais du texte)
export const num = (v, fallback = null) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

// ---------- Prix ----------
// Devises proposées : codes ISO, noms traduits (« Euro (€) », « Brazilian real (R$) »…)
export const CURRENCIES = labels("currency", ["EUR", "BRL", "USD", "GBP", "CHF", "CAD", "AUD", "NZD", "JPY", "THB", "MAD", "MXN", "ARS", "CLP", "PEN", "COP",
  "ZAR", "INR", "IDR", "VND", "TRY", "NOK", "SEK", "DKK", "ISK", "CZK", "HUF", "PLN", "AED", "XOF", "XPF"]);

// Accepte "120", "120,50", "1 200.5" ; renvoie un nombre ou null si vide / invalide
// Avec virgule et point (« 1.200,50 » ou « 1,200.50 ») : le dernier des deux sépare les décimales
export function parsePrice(s) {
  let v = String(s ?? "").replace(/\s/g, "");
  if (v.includes(",") && v.includes(".")) v = v.lastIndexOf(",") > v.lastIndexOf(".") ? v.replace(/\./g, "").replace(",", ".") : v.replace(/,/g, "");
  else v = v.replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export const hasPrice = (n) => typeof n === "number" && isFinite(n);

export function fmtMoney(n, currency = "EUR") {
  if (!hasPrice(n)) return "";
  try {
    return new Intl.NumberFormat(locale(), {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return n.toFixed(2) + " " + currency;
  }
}

// Valeur affichée dans un champ prix (virgule en français, point en anglais ; parsePrice lit les deux)
export const priceInput = (n) => (hasPrice(n) ? (getLang() === "en" ? String(n) : String(n).replace(".", ",")) : "");
