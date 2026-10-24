// Lance chaque test unitaire dans son propre processus (ils remplacent des objets globaux)
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort()) {
  const r = spawnSync(process.execPath, [dir + file], { encoding: "utf8" });
  process.stdout.write(r.stdout);
  if (r.status !== 0) {
    failed++;
    console.log(`ÉCHEC : ${file}\n${r.stderr}`);
  }
}
console.log(failed ? `${failed} fichier(s) de tests en échec.` : "Tests unitaires : tout passe.");
process.exit(failed ? 1 : 0);
