// Glisser une carte de « Mes voyages » vers la gauche : une poubelle rouge apparaît à droite.
// Au doigt comme à la souris ; le défilement vertical de la page reste normal.

const OPEN = 88;      // largeur de la poubelle (px)
let drag = null;      // { box, card, x, y, dx, moved }
let swallowClick = false;

const closeAll = (except) =>
  document.querySelectorAll(".swipe.open").forEach((b) => b !== except && b.classList.remove("open"));

export function bindSwipe() {
  document.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".swipe > .trip-card");
    if (!card || (e.pointerType === "mouse" && e.button !== 0)) {
      if (!e.target.closest(".swipe")) closeAll(); // toucher ailleurs referme
      return;
    }
    const box = card.parentElement;
    closeAll(box);
    drag = { box, card, x: e.clientX, y: e.clientY, dx: 0, moved: false, base: box.classList.contains("open") ? -OPEN : 0 };
  });

  document.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; } // défilement vertical
      if (Math.abs(dx) < 8) return;
      drag.moved = true;
      drag.card.classList.add("dragging");
    }
    drag.dx = Math.max(-OPEN * 1.3, Math.min(0, drag.base + dx));
    drag.card.style.transform = `translateX(${drag.dx}px)`;
  });

  const end = () => {
    if (!drag) return;
    const { box, card, moved, dx } = drag;
    drag = null;
    card.classList.remove("dragging");
    card.style.transform = "";
    if (!moved) return;
    swallowClick = true; // le relâchement ne doit pas ouvrir le voyage
    setTimeout(() => (swallowClick = false), 0);
    box.classList.toggle("open", dx < -OPEN / 2);
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);

  document.addEventListener("click", (e) => {
    if (swallowClick && e.target.closest(".swipe")) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}
