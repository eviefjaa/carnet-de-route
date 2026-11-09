// Fusion d'un voyage modifié en même temps par plusieurs voyageurs
//
// Trois versions : base (la dernière version commune, déjà enregistrée), mine (la mienne)
// et theirs (celle du serveur, qui contient les modifications des autres).
// Étape par étape et trajet par trajet :
//   - ce que j'ai modifié, ajouté ou supprimé l'emporte sur la base ;
//   - ce que les autres ont modifié, ajouté ou supprimé est gardé aussi ;
//   - si nous avons modifié le même élément, ma version l'emporte (dernière écriture) ;
//   - un élément modifié par l'un et supprimé par l'autre est gardé (on ne perd pas un changement).

// Deux versions sont identiques si elles ont le même contenu, quel que soit l'ordre des champs
// (Firestore les renvoie triés) ; un champ vide ("", null, []) vaut un champ absent (le serveur
// ajoute des listes vides). Sans ça, un élément supprimé ici, mais simplement relu sur le
// serveur, passerait pour « modifié par les autres » et réapparaîtrait.
const empty = (v) => v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
const canon = (v) => Array.isArray(v) ? v.map(canon)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().filter((k) => !empty(v[k])).map((k) => [k, canon(v[k])]))
  : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// skip : champs à ne pas fusionner (voyageurs et invitations, changés par d'autres moyens)
export function mergeTrip(base, mine, theirs, skip = []) {
  const out = { ...theirs };
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(mine)]);
  for (const k of keys) {
    if (k === "items" || skip.includes(k)) continue;
    if (same(mine[k], base ? base[k] : undefined)) continue; // pas touché chez moi : on garde celui du serveur
    if (k in mine) out[k] = mine[k];
    else delete out[k];
  }
  out.items = mergeItems((base && base.items) || [], mine.items || [], theirs.items || []);
  return out;
}

function mergeItems(base, mine, theirs) {
  const B = new Map(base.map((i) => [i.id, i]));
  const T = new Map(theirs.map((i) => [i.id, i]));
  const M = new Map(mine.map((i) => [i.id, i]));
  const result = [];

  // Mon ordre d'abord, avec pour chaque élément la bonne version
  for (const it of mine) {
    const b = B.get(it.id);
    const t = T.get(it.id);
    if (!b) { result.push(it); continue; }              // ajouté chez moi
    const mineChanged = !same(it, b);
    if (!t) { if (mineChanged) result.push(it); continue; } // supprimé chez eux : gardé si je l'ai modifié
    result.push(mineChanged ? it : t);
  }

  // Puis ce qui n'existe que chez eux : leurs ajouts, et ce que j'ai supprimé mais qu'ils ont modifié
  theirs.forEach((t, idx) => {
    if (M.has(t.id)) return;
    const b = B.get(t.id);
    if (b && same(t, b)) return; // supprimé chez moi, pas touché chez eux : supprimé
    // Placé juste après l'élément qui le précède chez eux
    let pos = 0;
    for (let j = idx - 1; j >= 0; j--) {
      const k = result.findIndex((r) => r.id === theirs[j].id);
      if (k >= 0) { pos = k + 1; break; }
    }
    result.splice(pos, 0, t);
  });
  return result;
}
