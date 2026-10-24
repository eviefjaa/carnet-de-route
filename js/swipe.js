// Glisser une carte de « Mes voyages » vers la gauche : une poubelle rouge apparaît à droite.
//
// La carte et la poubelle sont côte à côte dans un bandeau (.swipe) qui défile horizontalement,
// avec un aimantage sur « fermé » et « ouvert » (scroll-snap). C'est donc le défilement natif du
// téléphone qui fait le geste : fluide, avec l'élan du doigt. Ce fichier ne fait que le reste :
// refermer les autres cartes, refermer une carte ouverte quand on la touche, et le glisser à la souris.

const OPEN = 88; // largeur de la poubelle (px)
const isOpen = (box) => box.scrollLeft > OPEN / 2;
const close = (box) => box.scrollTo({ left: 0, behavior: "smooth" });

export function bindSwipe() {
  // Une carte s'ouvre : les autres se referment ; la classe « open » sert aux styles et aux tests
  document.addEventListener("scroll", (e) => {
    const box = e.target;
    if (!(box instanceof Element) || !box.classList.contains("swipe")) return;
    const open = isOpen(box);
    box.classList.toggle("open", open);
    if (box.scrollLeft > 4) document.querySelectorAll(".swipe").forEach((b) => b !== box && b.scrollLeft > 0 && close(b));
  }, true);

  // Toucher une carte ouverte la referme, sans ouvrir le voyage ; toucher ailleurs referme tout
  document.addEventListener("click", (e) => {
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
    // Le relâchement ne doit pas ouvrir le voyage
    document.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
  });
}
