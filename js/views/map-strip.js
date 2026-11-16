// Bandeau des étapes de la carte en plein écran : une petite carte par étape, dans l'ordre
// stops : [{ n, place, line, placed }] ; une étape sans position sur la carte est grisée et inactive

import { esc } from "../utils.js";

export function mapStrip(stops, active) {
  return `<ul class="map-strip" aria-label="Étapes du voyage" tabindex="-1">${stops.map((s) => `<li>
      <button class="ms-stop${s.n === active ? " is-active" : ""}" data-n="${s.n}" type="button"${s.n === active ? ` aria-current="true"` : ""}${s.placed ? "" : ` disabled title="Pas encore placée sur la carte"`}>
        <span class="pin"><span>${s.n}</span></span>
        <span class="ms-text"><b>${esc(s.place || "Étape sans nom")}</b>${s.line ? `<span>${esc(s.line)}</span>` : ""}</span>
      </button>
    </li>`).join("")}</ul>`;
}
