import assert from "node:assert/strict";
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = { getElementById: () => null };
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../..", import.meta.url));
const { decodeLine, routeKey } = await import(root + "/js/routes.js");
// Exemple officiel du format polyline
assert.deepEqual(decodeLine("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]);
assert.equal(routeKey([45.764, 4.8357], [48.8566, 2.3522]), "45.764,4.836,48.857,2.352");
// Simplification : une ligne droite de 100 points garde ses deux extrémités, un zigzag garde ses angles
const { simplify, encodeLine } = await import(root + "/js/routes.js");
const straight = Array.from({ length: 100 }, (_, i) => [45 + i / 1000, 4 + i / 1000]);
assert.deepEqual(simplify(straight, 0.0015), [straight[0], straight[99]]);
const zigzag = [[0, 0], [0.1, 0.1], [0, 0.2], [0.1, 0.3]];
assert.equal(simplify(zigzag, 0.0015).length, 4);
assert.equal(encodeLine([[38.5, -120.2], [40.7, -120.95], [43.252, -126.453]]), "_p~iF~ps|U_ulLnnqC_mqNvxq`@");
console.log("Tracé des routes : tous les tests passent.");
