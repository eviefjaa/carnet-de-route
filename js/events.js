// Réactions aux clics, saisies et envois de formulaires

import { state, currentTrip, save, createTrip, deleteTrip, selectTrip, neighbours } from "./store.js";
import { render, renderTripSelect } from "./views/trip.js";
import { linkRow, newStop, readStopForm } from "./views/stop.js";
import { newTransport, readTransportForm } from "./views/transport.js";
import { uid, nights, duration, plural } from "./utils.js";
import { toast } from "./toast.js";

export function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("input", onInput);
  // Safari ne signale pas toujours les changements de date par "input" : on écoute aussi "change"
  document.addEventListener("change", (e) => {
    const f = e.target.closest("form[data-form]");
    if (f) { keepEndAfterStart(f); refreshComputed(); }
  });
  document.getElementById("tripSelect").addEventListener("change", (e) => {
    selectTrip(e.target.value);
    render();
  });
  document.getElementById("newTrip").addEventListener("click", newTrip);
}

function newTrip() {
  createTrip();
  render();
  const input = document.getElementById("tripName");
  if (input) { input.focus(); input.select(); }
}

function onClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "new-trip") return newTrip();

  const t = currentTrip();
  if (!t) return;
  const idx = b.dataset.id ? t.items.findIndex((i) => i.id === b.dataset.id) : -1;

  switch (act) {
    case "add-stop": {
      const pos = +b.dataset.pos;
      const { prev } = neighbours(t, pos);
      const before = t.items[pos - 1];
      const prevLeg = before && before.type === "transport" ? before : null;
      const arrive = prevLeg && prevLeg.arr ? prevLeg.arr.slice(0, 10) : (prev && prev.depart) || "";
      state.insertAt = { pos, draft: newStop(prevLeg ? prevLeg.to : "", arrive) };
      state.editingId = null;
      break;
    }
    case "add-leg": {
      const pos = +b.dataset.pos;
      const { prev, next } = neighbours(t, pos);
      const dep = prev && prev.depart ? prev.depart + "T08:00" : "";
      state.insertAt = { pos, draft: newTransport(prev ? prev.place : "", next ? next.place : "", dep) };
      state.editingId = null;
      break;
    }
    case "edit":
      state.editingId = b.dataset.id;
      state.insertAt = null;
      state.confirm = null;
      break;
    case "cancel":
      state.editingId = null;
      state.insertAt = null;
      break;
    case "up":
    case "down": {
      const j = act === "up" ? idx - 1 : idx + 1;
      [t.items[idx], t.items[j]] = [t.items[j], t.items[idx]];
      save();
      break;
    }
    case "del":
      state.confirm = b.dataset.id;
      break;
    case "del-yes":
      t.items.splice(idx, 1);
      state.confirm = null;
      save();
      toast("Supprimé");
      break;
    case "del-trip":
      state.confirm = "trip";
      break;
    case "del-trip-yes":
      deleteTrip(state.currentId);
      toast("Voyage supprimé");
      break;
    case "cancel-confirm":
      state.confirm = null;
      break;
    case "add-link": {
      const box = b.closest("form").querySelector("[data-links]");
      box.insertAdjacentHTML("beforeend", linkRow({ id: uid(), label: "", url: "" }));
      box.lastElementChild.querySelector('[name="url"]').focus();
      return;
    }
    case "rm-link":
      b.closest("[data-link]").remove();
      return;
    default:
      return;
  }
  render();
  refreshComputed();
}

function onSubmit(e) {
  const f = e.target.closest("form[data-form]");
  if (!f) return;
  e.preventDefault();

  // Dernière vérification avant d'enregistrer
  const [start, end] = f.dataset.form === "stop" ? [f.arrive, f.depart] : [f.dep, f.arr];
  if (start.value && end.value && end.value < start.value) {
    toast(f.dataset.form === "stop" ? "Le départ ne peut pas être avant l'arrivée." : "L'arrivée ne peut pas être avant le départ.");
    end.focus();
    return;
  }

  const t = currentTrip();
  const item = f.dataset.form === "stop" ? readStopForm(f) : readTransportForm(f);

  if (f.dataset.new === "1") {
    t.items.splice(state.insertAt.pos, 0, item);
    state.insertAt = null;
  } else {
    const i = t.items.findIndex((x) => x.id === item.id);
    if (i >= 0) {
      if (t.items[i].geo) item.geo = t.items[i].geo; // garde la position sur la carte
      t.items[i] = item;
    }
    state.editingId = null;
  }
  save();
  render();
  toast("Enregistré");
}

let nameTimer;
function onInput(e) {
  if (e.target.id === "tripName") {
    currentTrip().name = e.target.value;
    renderTripSelect();
    clearTimeout(nameTimer);
    nameTimer = setTimeout(save, 400);
    return;
  }
  const f = e.target.closest("form[data-form]");
  if (f) {
    keepEndAfterStart(f);
    refreshComputed();
  }
}

// La fin (départ de l'étape, arrivée du trajet) ne peut pas être avant le début
function keepEndAfterStart(f) {
  const [start, end] = f.dataset.form === "stop" ? [f.arrive, f.depart] : [f.dep, f.arr];
  end.min = start.value;
  if (start.value && end.value && end.value < start.value) end.value = start.value;
}

// Nuits et durée calculées en direct dans les formulaires
export function refreshComputed() {
  document.querySelectorAll("form[data-form]").forEach((f) => {
    if (f.dataset.form === "stop") {
      const a = f.arrive.value, d = f.depart.value;
      const n = nights(a, d);
      f.querySelector("[data-nights]").textContent =
        a && d ? (n !== null ? plural(n, "nuit") : "Le départ est avant l'arrivée.") : "";
    } else {
      const dep = f.dep.value, arr = f.arr.value;
      const d = duration(dep, arr);
      f.querySelector("[data-duration]").textContent = d
        ? `Durée : ${d}`
        : dep && arr ? "L'arrivée doit être après le départ." : "La durée se calcule à partir des horaires.";
    }
  });
}