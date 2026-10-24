// Glisser une carte de « Mes voyages » vers la gauche : une poubelle rouge apparaît à droite.
// Au doigt comme à la souris ; le défilement vertical de la page reste normal.
// La carte suit le doigt image par image (requestAnimationFrame) ; un geste rapide suffit à ouvrir.

const OPEN = 88;      // largeur de la poubelle (px)
let drag = null;      // { box, card, x, y, base, dx, moved, wasOpen, lastX, lastT, speed }
let frame = 0;
let swallowClick = false;

const closeAll = (except) =>
  document.querySelectorAll(".swipe.open").forEach((b) => b !== except && b.classList.remove("open"));

function paint() {
  frame = 0;
  if (drag && drag.moved) drag.card.style.transform = `translateX(${drag.dx}px)`;
}

function swallowNextClick() {
  swallowClick = true;
  setTimeout(() => (swallowClick = false), 400);
}

export function bindSwipe() {
  document.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".swipe > .trip-card");
    if (!card || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) {
      if (!e.target.closest(".swipe")) closeAll(); // toucher ailleurs referme
      return;
    }
    const box = card.parentElement;
    closeAll(box);
    const wasOpen = box.classList.contains("open");
    drag = { box, card, x: e.clientX, y: e.clientY, base: wasOpen ? -OPEN : 0, dx: 0, moved: false, wasOpen, lastX: e.clientX, lastT: e.timeStamp, speed: 0 };
  });

  document.addEventListener("pointermove", (e) => {
    if (!drag || !e.isPrimary) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // défilement vertical
      if (Math.abs(dx) < 10) return;
      drag.moved = true;
      drag.box.classList.add("dragging");
    }
    // Vitesse (px/ms), pour qu'un geste rapide et court suffise
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.speed = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    // Au-delà de la poubelle, la carte résiste (comme sur iPhone)
    let x = drag.base + dx;
    if (x < -OPEN) x = -OPEN + (x + OPEN) * 0.3;
    drag.dx = Math.min(0, x);
    if (!frame) frame = requestAnimationFrame(paint);
  });

  const end = () => {
    if (!drag) return;
    const { box, card, moved, dx, speed, wasOpen } = drag;
    drag = null;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    box.classList.remove("dragging");
    card.style.transform = "";
    if (!moved) {
      // Toucher une carte ouverte la referme, sans ouvrir le voyage
      if (wasOpen) { box.classList.remove("open"); swallowNextClick(); }
      return;
    }
    swallowNextClick(); // le relâchement ne doit pas ouvrir le voyage
    const open = speed < -0.4 || (speed <= 0.4 && dx < -OPEN / 2);
    box.classList.toggle("open", open);
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  document.addEventListener("click", (e) => {
    if (swallowClick && e.target.closest(".swipe")) {
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}
