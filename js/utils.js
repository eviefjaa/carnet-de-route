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

// Le nombre est forcé en vrai nombre : une valeur venue d'un autre compte ne s'insère jamais telle quelle
export function plural(n, word) {
  const x = Number(n);
  const v = Number.isFinite(x) ? x : 0;
  return `${v} ${word}${v > 1 ? "s" : ""}`;
}

// Nombre fini, sinon la valeur par défaut (données d'un autre compte : jamais du texte)
export const num = (v, fallback = null) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

// ---------- Prix ----------
export const CURRENCIES = {
  EUR: "Euro (€)",
  BRL: "Real brésilien (R$)",
  USD: "Dollar américain ($)",
  GBP: "Livre sterling (£)",
  CHF: "Franc suisse (CHF)",
  CAD: "Dollar canadien ($ CA)",
  AUD: "Dollar australien",
  NZD: "Dollar néo-zélandais",
  JPY: "Yen japonais",
  THB: "Baht thaïlandais",
  MAD: "Dirham marocain",
  MXN: "Peso mexicain",
  ARS: "Peso argentin",
  CLP: "Peso chilien",
  PEN: "Sol péruvien",
  COP: "Peso colombien",
  ZAR: "Rand sud-africain",
  INR: "Roupie indienne",
  IDR: "Roupie indonésienne",
  VND: "Dong vietnamien",
  TRY: "Livre turque",
  NOK: "Couronne norvégienne",
  SEK: "Couronne suédoise",
  DKK: "Couronne danoise",
  ISK: "Couronne islandaise",
  CZK: "Couronne tchèque",
  HUF: "Forint hongrois",
  PLN: "Zloty polonais",
  AED: "Dirham des Émirats",
  XOF: "Franc CFA (Afrique de l'Ouest)",
  XPF: "Franc pacifique",
};

// Accepte "120", "120,50", "1 200.5" ; renvoie un nombre ou null si vide / invalide
export function parsePrice(s) {
  const t = String(s ?? "").replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export const hasPrice = (n) => typeof n === "number" && isFinite(n);

export function fmtMoney(n, currency = "EUR") {
  if (!hasPrice(n)) return "";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return n.toFixed(2) + " " + currency;
  }
}

// Valeur affichée dans un champ prix (virgule à la française)
export const priceInput = (n) => (hasPrice(n) ? String(n).replace(".", ",") : "");
