// Tracé des routes dans une publication : publié sans ses 2 premiers et 2 derniers kilomètres
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null, documentElement: { dataset: {} } };
const { publicCopy } = await import(root + "/js/publish.js");
const { routeKey, encodeLine, decodeLine } = await import(root + "/js/routes.js");
const { normalizePost } = await import(root + "/js/social.js");

// Distance en mètres (même calcul approché que publish.js)
const m = ([a, b], [c, d]) => Math.hypot((d - b) * Math.PI / 180 * Math.cos(((a + c) / 2) * Math.PI / 180), (c - a) * Math.PI / 180) * 6371000;

// Lyon → 20 km plus au nord, un point tous les 500 m environ
const A = { lat: 45.76, lng: 4.835 }, B = { lat: 45.94, lng: 4.835 };
const line = Array.from({ length: 41 }, (_, i) => [A.lat + (B.lat - A.lat) * i / 40, A.lng]);
const trip = (leg, b = B) => ({ items: [
  { id: "s1", type: "stop", place: "Lyon", geo: A },
  { id: "t1", type: "transport", from: "Lyon", to: "Villefranche", ...leg },
  { id: "s2", type: "stop", place: "Villefranche", geo: b },
] });
const route = { key: routeKey([A.lat, A.lng], [B.lat, B.lng]), line: encodeLine(line), km: 22, min: 25 };

const pub = publicCopy(trip({ mode: "voiture", route })).items[1];
assert.ok(pub.line, "tracé publié");
const pts = decodeLine(pub.line);
assert.ok(m(pts[0], [A.lat, A.lng]) >= 1990, "début du tracé à 2 km de l'étape");
assert.ok(m(pts[pts.length - 1], [B.lat, B.lng]) >= 1990, "fin du tracé à 2 km de l'étape");
assert.equal(pub.km, 22);

assert.equal(publicCopy(trip({ mode: "voiture", route }, { lat: 46.2, lng: 5.2 })).items[1].line, undefined, "étape déplacée : tracé périmé non publié");
assert.equal(publicCopy(trip({ mode: "train", route })).items[1].line, undefined, "train : ligne droite");
const short = { ...route, line: encodeLine(line.slice(0, 7)) }; // 3 km
assert.equal(publicCopy(trip({ mode: "voiture", route: short })).items[1].line, undefined, "trajet trop court : rien à montrer");

// Dernier trajet du voyage, sans étape après lui (Florianópolis → São Paulo) : tracé publié aussi,
// vers son propre lieu d'arrivée, comme sur la carte privée
{ const C = { q: "Villefranche", lat: B.lat, lng: B.lng };
  const last = publicCopy({ items: [{ id: "s1", type: "stop", place: "Lyon", geo: A },
    { id: "t1", type: "transport", mode: "bus", from: "Lyon", to: "Villefranche", toGeo: C, route }] }).items[1];
  assert.ok(last.line, "dernier trajet : tracé publié");
  const q = decodeLine(last.line);
  assert.ok(m(q[q.length - 1], [B.lat, B.lng]) >= 1990, "dernier trajet : coupé à 2 km de son arrivée");
  // Premier trajet sans étape avant : depuis son lieu de départ
  const first = publicCopy({ items: [{ id: "t1", type: "transport", mode: "voiture", from: "Lyon", to: "Villefranche", fromGeo: { q: "Lyon", ...A }, route },
    { id: "s2", type: "stop", place: "Villefranche", geo: B }] }).items[0];
  assert.ok(first.line, "premier trajet : tracé publié"); }

// Lieux d'un trajet (vol depuis Prague) : publiés arrondis à 2 km, comme les étapes
{ const t = publicCopy({ items: [{ id: "v", type: "transport", mode: "avion", from: "Prague", to: "São Paulo", fromGeo: { q: "Prague", lat: 50.0755, lng: 14.4378 } }] }).items[0];
  assert.deepEqual(t.fromGeo, { lat: 50.08, lng: 14.44 }, "départ arrondi, sans le texte cherché");
  assert.equal(t.toGeo, null); }
// Tracé reçu d'un autre compte : seulement des caractères du format polyline
const p = normalizePost("p1", { trip: { items: [{ type: "transport", line: '<img src=x onerror="alert(1)">' }, { type: "transport", line: pub.line, km: "x" }] } });
assert.equal(p.trip.items[0].line, "", "tracé piégé ignoré");
assert.equal(p.trip.items[1].line, pub.line);
assert.equal(p.trip.items[1].km, null);
console.log(`Tracé public : ${pts.length} points, coupé à 2 km de chaque étape.`);
