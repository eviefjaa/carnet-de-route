// Glisser une carte de « Mes voyages » vers la gauche : une poubelle rouge apparaît à droite.
//
// La carte et la poubelle sont côte à côte dans un bandeau (.swipe) qui défile horizontalement,
// avec un aimantage sur « fermé » et « ouvert » (scroll-snap). C'est donc le défilement natif du
// téléphone qui fait le geste : fluide, avec l'élan du doigt. Ce fichier ne fait que le reste :
// refermer les autres cartes, refermer une carte ouverte quand on la touche, et le glisser à la souris.
//
// Une seule carte ouverte à la fois. Seule une carte qui S'OUVRE referme les autres : une carte
// qui se referme défile elle aussi, et refermait sinon la carte qu'on était en train d'ouvrir
// (avec deux doigts, les deux cartes se refermaient l'une l'autre). Une carte sous un doigt
// n'est jamais refermée par le code ; avec deux doigts, la dernière carte touchée gagne.

import { state } from "./store.js";
import { tripCard } from "./views/trips-list.js";

const OPEN = 88; // largeur de la poubelle (px)
const isOpen = (box) => box.scrollLeft > OPEN / 2;
const last = new WeakMap();  // dernière position de chaque bandeau (pour savoir s'il s'ouvre)
const closing = new WeakMap(); // bandeaux refermés par le code (→ n° de fermeture) : leur défilement est ignoré
let closings = 0;
const fingers = new Map();   // doigt posé (identifiant) → bandeau touché
let lastTouched = null;      // dernier bandeau touché
const touched = (box) => [...fingers.values()].includes(box);

function close(box) {
  if (box.scrollLeft === 0) return;
  const n = ++closings;
  closing.set(box, n);
  box.scrollTo({ left: 0, behavior: "smooth" });
  // Fin du défilement (scrollend), avec une temporisation de secours pour les navigateurs sans.
  // Seule la dernière fermeture de ce bandeau lève la marque.
  const done = () => {
    if (closing.get(box) !== n) return;
    closing.delete(box);
    last.set(box, box.scrollLeft);
  };
  box.addEventListener("scrollend", done, { once: true });
  setTimeout(done, 700);
}

// Une autre carte s'ouvre : la confirmation « Supprimer ce voyage ? » est annulée. Seule sa carte
// est remplacée : réafficher la liste ferait perdre la carte qu'on est en train de balayer.
function cancelConfirm() {
  if (!String(state.confirm || "").startsWith("swipe:")) return;
  const id = state.confirm.slice(6);
  state.confirm = null;
  const el = document.querySelector(".swipe.is-confirm");
  if (el) el.outerHTML = tripCard(id);
}

export function bindSwipe() {
  let afterDrag = false; // un glisser à la souris vient de finir : le clic qui suit est ignoré
  // Une carte s'ouvre : les autres se referment ; la classe « open » sert aux styles et aux tests
  document.addEventListener("scroll", (e) => {
    const box = e.target;
    if (!(box instanceof Element) || !box.classList.contains("swipe")) return;
    box.classList.toggle("open", isOpen(box));
    const before = last.get(box) || 0;
    last.set(box, box.scrollLeft);
    if (closing.has(box) || box.scrollLeft <= before || box.scrollLeft <= 4) return;
    // Deux doigts : une carte qui n'est pas la dernière touchée ne referme pas celle-ci
    if (lastTouched && lastTouched !== box && touched(lastTouched)) return;
    cancelConfirm();
    document.querySelectorAll(".swipe").forEach((b) => b !== box && !touched(b) && close(b));
  }, true);

  // Doigts posés sur les cartes
  document.addEventListener("touchstart", (e) => {
    for (const t of e.changedTouches) {
      const box = t.target instanceof Element && t.target.closest(".swipe");
      if (!box) continue;
      fingers.set(t.identifier, box);
      lastTouched = box;
      closing.delete(box); // rattrapée du doigt pendant qu'elle se refermait : le doigt reprend la main
    }
  }, { capture: true, passive: true });
  // Tous les doigts levés : une seule carte reste ouverte, la dernière touchée si elle l'est
  const lift = (e) => {
    for (const t of e.changedTouches) fingers.delete(t.identifier);
    if (fingers.size) return;
    const open = [...document.querySelectorAll(".swipe")].filter((b) => b.scrollLeft > 4);
    const winner = open.includes(lastTouched) ? lastTouched : open[0];
    open.forEach((b) => b !== winner && close(b));
  };
  document.addEventListener("touchend", lift, { capture: true, passive: true });
  document.addEventListener("touchcancel", lift, { capture: true, passive: true });

  // Toucher une carte ouverte la referme, sans ouvrir le voyage ; toucher ailleurs referme tout
  document.addEventListener("click", (e) => {
    // Clic qui termine un glisser à la souris : ni voyage ouvert, ni carte refermée
    if (afterDrag) {
      afterDrag = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const box = e.target.closest(".swipe");
    if (box && box.scrollLeft > 4 && !e.target.closest(".swipe-action")) {
      e.preventDefault();
      e.stopPropagation();
      close(box);
      return;
    }
    if (!box) document.querySelectorAll(".swipe").forEach((b) => b.scrollLeft > 0 && close(b));
  }, true);

  // À la souris (ordinateur sans pavé tactile) : glisser la carte en maintenant le bouton
  let drag = null;
  // Le titre de la carte est un lien : le navigateur le glisserait (glisser-déposer) à la place de la carte
  document.addEventListener("dragstart", (e) => {
    if (e.target instanceof Element && e.target.closest(".swipe")) e.preventDefault();
  });
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const box = e.target.closest(".swipe");
    if (box && !e.target.closest(".swipe-action")) drag = { box, x: e.clientX, left: box.scrollLeft, moved: false };
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (drag.moved) {
      drag.box.style.scrollSnapType = "none";
      drag.box.scrollLeft = drag.left - dx;
    }
  });
  document.addEventListener("pointerup", () => {
    if (!drag) return;
    const { box, moved } = drag;
    drag = null;
    box.style.scrollSnapType = "";
    if (!moved) return;
    box.scrollTo({ left: box.scrollLeft > OPEN / 2 ? OPEN : 0, behavior: "smooth" });
    // Le relâchement ne doit pas ouvrir le voyage (ni refermer la carte : voir le clic plus haut).
    // Sans clic (bouton relâché hors de la carte), le drapeau tombe tout seul.
    afterDrag = true;
    setTimeout(() => (afterDrag = false), 300);
  });
}
