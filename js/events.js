// Réactions aux clics, saisies et envois de formulaires

import { state, currentTrip, save, createTrip, deleteTrip, neighbours } from "./store.js";
import { render } from "./views/trip.js";
import { linkRow, newStop, readStopForm } from "./views/stop.js";
import { newTransport, readTransportForm } from "./views/transport.js";
import { uid, nights, duration, plural } from "./utils.js";
import { toast } from "./toast.js";
import * as cloud from "./cloud.js";
import { setAuthMode } from "./views/auth.js";
import { prefs, savePrefs, applyTheme, toggleFavorite } from "./prefs.js";
import { openMenu, closeMenu, go } from "./router.js";
import { favButton, filterCountries } from "./views/explore.js";
import { renderSidebar } from "./views/sidebar.js";
import { countryByCode } from "./data/countries.js";

export function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("input", onInput);
  // Safari ne signale pas toujours les changements de date par "input" : on écoute aussi "change"
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
  document.addEventListener("change", (e) => {
    if (onSettingChange(e.target)) return;
    if (e.target.id === "tripCurrency") {
      currentTrip().currency = e.target.value;
      save();
      render();
      return;
    }
    const f = e.target.closest("form[data-form]");
    if (f) { keepEndAfterStart(f); refreshComputed(); }
  });
}

function newTrip() {
  const id = createTrip();
  state.focusName = true; // on place le curseur sur le nom du voyage
  go("voyage-" + id);
}

function onClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "new-trip") return newTrip();
  if (onAccountClick(act, b)) return;
  if (onPageClick(act, b)) return;

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
      go("voyages");
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

// ---------- Checklist des étapes ----------
function findStop(stopId) {
  const t = currentTrip();
  return t ? t.items.find((i) => i.id === stopId && i.type === "stop") : null;
}
function findTodo(stopId, todoId) {
  const s = findStop(stopId);
  return s && (s.todos || []).find((x) => x.id === todoId);
}
function focusTodoInput() {
  const input = document.querySelector("form[data-todo-form] input[name=text]");
  if (input) input.focus();
}

// ---------- Menu, destinations, favoris, paramètres ----------
function onPageClick(act, b) {
  switch (act) {
    case "todo-add":
      state.todoAdding = b.dataset.stop;
      render();
      focusTodoInput();
      return true;
    case "todo-cancel":
      state.todoAdding = null;
      render();
      return true;
    case "todo-del": {
      const s = findStop(b.dataset.stop);
      if (s) {
        s.todos = (s.todos || []).filter((x) => x.id !== b.dataset.todo);
        save();
        render();
      }
      return true;
    }
    case "open-menu":
      openMenu();
      return true;
    case "close-menu":
      closeMenu();
      return true;
    case "fav": {
      const code = b.dataset.code;
      const on = toggleFavorite(code);
      if (state.view === "favorites") render();
      else {
        document.querySelectorAll(`.fav[data-code="${code}"]`).forEach((btn) => (btn.outerHTML = favButton(code, btn.classList.contains("small"))));
        renderSidebar();
      }
      toast(on ? "Ajouté aux favoris" : "Retiré des favoris");
      return true;
    }
    case "chip": {
      const filter = b.dataset.filter;
      state.explore[filter] = b.dataset.value;
      document.querySelectorAll(`.chip[data-filter="${filter}"]`).forEach((c) => {
        const on = c.dataset.value === b.dataset.value;
        c.classList.toggle("on", on);
        c.setAttribute("aria-pressed", on);
      });
      filterCountries();
      return true;
    }
    case "trip-from-country": {
      const x = countryByCode(b.dataset.code);
      if (!x) return true;
      const id = createTrip({ name: x.name, currency: x.currency, country: x.code });
      toast(`Voyage « ${x.name} » créé : ajoutez vos étapes`);
      go("voyage-" + id);
      return true;
    }
    case "export":
      exportTrips();
      return true;
  }
  return false;
}

function onSettingChange(el) {
  if (el.id === "emailReminders") {
    prefs.emailReminders = el.checked;
    savePrefs();
    toast(el.checked ? "Rappels par e-mail activés" : "Rappels par e-mail désactivés");
    return true;
  }
  if (el.dataset && el.dataset.todo && el.type === "checkbox") {
    const todo = findTodo(el.dataset.stop, el.dataset.todo);
    if (todo) {
      todo.done = el.checked;
      save();
      render();
      if (el.checked) toast("Réservé ✓");
    }
    return true;
  }
  if (el.name === "theme") {
    prefs.theme = el.value;
    applyTheme();
    savePrefs();
    return true;
  }
  if (el.id === "defaultCurrency") {
    prefs.currency = el.value;
    savePrefs();
    toast("Devise par défaut enregistrée");
    return true;
  }
  if (el.id === "profileName") {
    prefs.name = el.value.trim();
    savePrefs();
    renderSidebar();
    toast("Nom enregistré");
    return true;
  }
  return false;
}

function exportTrips() {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), trips: state.trips }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `carnet-de-route-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Compte ----------
function onAccountClick(act, b) {
  switch (act) {
    case "open-auth":
      setAuthMode(b.dataset.mode || "signin");
      state.authOpen = true;
      break;
    case "close-auth":
      state.authOpen = false;
      break;
    case "auth-mode":
      setAuthMode(b.dataset.mode);
      break;
    case "sign-out":
      cloud.signOut().then(() => toast("Vous êtes déconnecté(e)"));
      return true;
    default:
      return false;
  }
  render();
  const email = document.getElementById("auth-email");
  if (email) email.focus();
  return true;
}

async function onAuthSubmit(f) {
  const mode = f.dataset.auth;
  const email = f.email.value.trim();
  const password = f.password ? f.password.value : "";
  const msg = f.querySelector("#auth-error");
  const btn = f.querySelector("button[type=submit]");
  const show = (text, ok = false) => {
    msg.textContent = text;
    msg.className = ok ? "auth-ok" : "auth-error";
    msg.hidden = false;
  };

  if (!email) return show("Indiquez votre adresse e-mail.");
  if (mode !== "reset" && !password) return show("Indiquez votre mot de passe.");
  if (mode === "signup" && password !== f.confirm.value) return show("Les deux mots de passe ne sont pas identiques.");

  btn.disabled = true;
  try {
    if (mode === "signin") await cloud.signIn(email, password);
    else if (mode === "signup") await cloud.signUp(email, password);
    else {
      await cloud.resetPassword(email);
      show("E-mail envoyé. Pensez à regarder dans vos spams.", true);
    }
  } catch (err) {
    show(cloud.errorMessage(err));
  }
  btn.disabled = false;
}

function onSubmit(e) {
  const todoForm = e.target.closest("form[data-todo-form]");
  if (todoForm) {
    e.preventDefault();
    const text = todoForm.text.value.trim();
    const s = findStop(todoForm.dataset.todoForm);
    if (text && s) {
      s.todos = [...(s.todos || []), { id: uid(), text, done: false }];
      save();
      render();
      focusTodoInput(); // on peut enchaîner plusieurs ajouts
    }
    return;
  }
  const auth = e.target.closest("form[data-auth]");
  if (auth) {
    e.preventDefault();
    onAuthSubmit(auth);
    return;
  }
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
      const old = t.items[i];
      // Garde la position sur la carte et le pays si le lieu n'a pas été rechoisi
      if (!item.geo && old.geo) item.geo = old.geo;
      if (old.todos) item.todos = old.todos; // la checklist n'est pas dans le formulaire
      if (item.type === "stop" && item.country === undefined && old.country && old.place === item.place) item.country = old.country;
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
  if (e.target.id === "exploreSearch") {
    state.explore.q = e.target.value;
    filterCountries();
    return;
  }
  if (e.target.id === "tripName") {
    currentTrip().name = e.target.value;
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
