// Contrôle : dans un fichier qui importe t (traduction), aucune variable ne doit s'appeler t
// (paramètre, const, let, déstructuration) : elle masquerait la fonction, et t("clé") planterait.
// Lancé par les tests unitaires (tests/unit/i18n.test.mjs).
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../js/", import.meta.url));
const files = [...readdirSync(root).filter((f) => f.endsWith(".js")), ...readdirSync(root + "views").map((f) => "views/" + f)];
const PATTERNS = [/\b(const|let|var)\s+t\b/, /\(\s*t\s*[,)]/, /,\s*t\s*\)\s*=>/, /\[\s*\w+\s*,\s*t\s*\]/, /(^|[^.\w])t\s*=>/, /\{\s*t\s*[,}]/];

export function shadows() {
  const found = [];
  for (const f of files) {
    const src = readFileSync(root + f, "utf8");
    if (!/import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*"[./]*i18n\.js"/.test(src)) continue;
    src.split("\n").forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line) || /^\s*import /.test(line)) return;
      const code = line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""'); // sans le contenu des chaînes
      if (PATTERNS.some((p) => p.test(code))) found.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
  return found;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const found = shadows();
  console.log(found.length ? found.join("\n") : "Aucune variable t qui masque la traduction.");
  process.exit(found.length ? 1 : 0);
}
