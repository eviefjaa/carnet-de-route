// Bandeau des étapes de la carte en plein écran : une petite carte par étape, dans l'ordre
// stops : [{ n, place, line, placed }] ; une étape sans position sur la carte est grisée et inactive

import { esc } from "../utils.js";
import { t } from "../i18n.js";

export function mapStrip(stops, active) {
  return `<ul class="map-strip" aria-label="${t("map.stripLabel")}" tabindex="-1">${stops.map((s) => `<li>
      <button class="ms-stop${s.n === active ? " is-active" : ""}" data-n="${s.n}" type="button"${s.n === active ? ` aria-current="true"` : ""}${s.placed ? "" : ` disabled title="${t("map.notPlaced")}"`}>
        <span class="pin"><span>${s.n}</span></span>
        <span class="ms-text"><b>${esc(s.place || t("stop.unnamed"))}</b>${s.line ? `<span>${esc(s.line)}</span>` : ""}</span>
      </button>
    </li>`).join("")}</ul>`;
}
