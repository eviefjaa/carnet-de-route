// Réactions aux clics, saisies et envois de formulaires

import { state, currentTrip, save, flush, createTrip, deleteTrip, neighbours, isOwner, resetUi } from "./store.js";
import { render } from "./views/trip.js";
import { linkRow, todoRow, newStop, readStopForm } from "./views/stop.js";
import { readActivityForm } from "./views/program.js";
import { newTransport, readTransportForm } from "./views/transport.js";
import { uid, nights, duration } from "./utils.js";
import { t, count, setLang, inAllLangs } from "./i18n.js";
import { countryName } from "./i18n-data.js";
import { resetSocial } from "./social.js";
import { toast } from "./toast.js";
import * as cloud from "./cloud.js";
import { deleteAccount } from "./account.js";
import { setAuthMode } from "./views/auth.js";
import { prefs, savePrefs, applyTheme, toggleFavorite } from "./prefs.js";
import { openMenu, closeMenu, go } from "./router.js";
import { favButton, filterCountries } from "./views/explore.js";
import { renderSidebar } from "./views/sidebar.js";
import { countryByCode } from "./data/countries.js";
import { inviteFromForm, resendInvite, cancelInvite, cancelInviteUid, removeMember, leaveTrip, answerInvitation } from "./share.js";
import { onSocialClick, onSocialSubmit, onSocialChange, onSocialInput } from "./social-events.js";
import { addTickets, openTicket, deleteTicket, deleteTicketFiles, allTickets, resetFormTickets, pickFormTickets, removeFormTicket, commitFormTickets } from "./tickets.js";

export function bindEvents() {
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("input", onInput);
  // Safari ne signale pas toujours les changements de date par "input" : on écoute aussi "change"
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
    // Entrée dans une activité du formulaire d'étape : nouvelle activité plutôt qu'enregistrer
    if (e.key === "Enter" && ["todoText", "todoMaps", "todoDate", "todoTime", "todoPrice"].includes(e.target.name)) {
      e.preventDefault();
      addTodoRow(e.target.closest("[data-todo-row]"));
    }
  });
  document.addEventListener("change", (e) => {
    const d = e.target.dataset || {};
    if (d.ticketInput || d.formTicketInput) {
      const files = [...e.target.files];
      e.target.value = ""; // pour pouvoir rechoisir le même fichier
      if (d.ticketInput) addTickets(d.ticketInput, d.tkTodo, files);
      else pickFormTickets(files);
      return;
    }
    if (onSocialChange(e.target)) return;
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

// Nouveau voyage : on choisit d'abord entre road trip et séjour (#nouveau-voyage)
function newTrip() {
  go("nouveau-voyage");
}
function createKind(b) {
  const x = b.dataset.country ? countryByCode(b.dataset.country) : null;
  const kind = b.dataset.kind === "sejour" ? "sejour" : "";
  const name = x ? countryName(x.code) : undefined;
  const id = createTrip(x ? { name, currency: x.currency, country: x.code, kind } : { kind });
  if (x) toast(t(kind ? "toast.tripCreatedSejour" : "toast.tripCreatedRoad", { name }));
  else state.focusName = true; // on place le curseur sur le nom du voyage
  go("voyage-" + id);
}

// Supprime les voyages cochés en mode sélection ; ceux d'un autre propriétaire sont quittés
async function deleteSelected() {
  const ids = [...state.selected].filter((id) => state.trips[id]);
  const mine = ids.filter((id) => isOwner(state.trips[id]));
  const others = ids.filter((id) => !isOwner(state.trips[id]));
  mine.forEach((id) => deleteTrip(id)); // leurs billets sont supprimés avec eux dans le compte
  let failed = 0;
  for (const id of others) if (!(await leaveTrip(id, true))) failed++;
  state.selecting = false;
  state.selected = new Set();
  state.confirm = null;
  render();
  const done = [];
  if (mine.length) done.push(count(mine.length, "toast.tripsDeleted"));
  const left = others.length - failed;
  if (left) done.push(count(left, mine.length ? "toast.leftShort" : "toast.tripsLeft")); // « 2 voyages supprimés, 1 quitté »
  toast(failed
    ? `${done.length ? done.join(", ") + ". " : ""}${count(failed, "toast.cantLeave")}`
    : done.join(", "));
}

function onClick(e) {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "new-trip") return newTrip();
  if (act === "create-trip") return createKind(b);
  if (onSocialClick(act, b)) return;
  if (onAccountClick(act, b)) return;
  if (onPageClick(act, b)) return;

  const trip = currentTrip();
  if (!trip) return;
  const idx = b.dataset.id ? trip.items.findIndex((i) => i.id === b.dataset.id) : -1;

  switch (act) {
    case "add-stop": {
      const pos = +b.dataset.pos;
      const { prev } = neighbours(trip, pos);
      const before = trip.items[pos - 1];
      const prevLeg = before && before.type === "transport" ? before : null;
      const arrive = prevLeg && prevLeg.arr ? prevLeg.arr.slice(0, 10) : (prev && prev.depart) || "";
      state.insertAt = { pos, draft: newStop(prevLeg ? prevLeg.to : "", arrive) };
      state.editingId = null;
      resetFormTickets();
      break;
    }
    case "add-leg": {
      const pos = +b.dataset.pos;
      const { prev, next } = neighbours(trip, pos);
      const dep = prev && prev.depart ? prev.depart + "T08:00" : "";
      state.insertAt = { pos, draft: newTransport(prev ? prev.place : "", next ? next.place : "", dep) };
      state.editingId = null;
      resetFormTickets();
      break;
    }
    case "toggle-item": {
      const id = b.dataset.id;
      if (state.openItems.has(id)) state.openItems.delete(id);
      else state.openItems.add(id);
      break;
    }
    // Programme d'une étape de road trip : déplié ou replié, gardé pendant la session
    case "program-toggle": {
      const id = b.dataset.stop;
      if (state.programOpen.has(id)) state.programOpen.delete(id);
      else state.programOpen.add(id);
      render();
      document.querySelector(`[data-act="program-toggle"][data-stop="${CSS.escape(id)}"]`)?.focus();
      return;
    }
    case "edit":
      state.editingId = b.dataset.id;
      state.insertAt = null;
      state.confirm = null;
      resetFormTickets();
      break;
    case "cancel":
      state.editingId = null;
      state.insertAt = null;
      resetFormTickets(); // les billets choisis ne sont pas envoyés
      break;
    case "up":
    case "down": {
      const j = act === "up" ? idx - 1 : idx + 1;
      [trip.items[idx], trip.items[j]] = [trip.items[j], trip.items[idx]];
      save();
      break;
    }
    case "del":
      state.confirm = b.dataset.id;
      break;
    case "del-yes":
      deleteTicketFiles(allTickets(trip.items[idx])); // ses billets ne restent pas dans le compte
      trip.items.splice(idx, 1);
      state.confirm = null;
      save();
      toast(t("toast.deleted"));
      break;
    case "del-trip":
      state.confirm = "trip";
      break;
    case "del-trip-yes":
      // Le créateur supprime le voyage pour tout le monde ; les autres le quittent
      if (isOwner(trip)) {
        deleteTrip(state.currentId);
        toast(t("toast.tripDeleted"));
      } else {
        leaveTrip(state.currentId);
      }
      go("voyages");
      break;
    case "cancel-confirm":
      state.confirm = null;
      break;
    case "set-kind":
      // Un séjour n'a qu'un lieu : un road trip à plusieurs étapes reste un road trip
      if (b.dataset.kind === "sejour" && trip.items.filter((i) => i.type === "stop").length > 1) return;
      if (b.dataset.kind === "sejour") trip.kind = "sejour";
      else delete trip.kind;
      resetUi();
      save();
      toast(trip.kind ? t("toast.nowSejour") : t("toast.nowRoad"));
      break;
    case "act-add":
      state.actForm = { stop: b.dataset.stop, date: b.dataset.date || "" };
      state.programOpen.add(b.dataset.stop); // le formulaire est dans le programme
      render();
      document.querySelector("form[data-act-form] input[name=text]")?.focus();
      return;
    case "act-edit":
      state.actForm = { stop: b.dataset.stop, todo: b.dataset.todo };
      state.programOpen.add(b.dataset.stop);
      render();
      document.querySelector("form[data-act-form] input[name=text]")?.focus();
      return;
    case "act-cancel":
      state.actForm = null;
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
    case "add-todo-row":
      addTodoRow(null, b.closest("form"));
      return;
    case "rm-todo-row":
      b.closest("[data-todo-row]").remove();
      return;
    case "form-ticket-rm":
      removeFormTicket(b.dataset);
      return;
    default:
      return;
  }
  render();
  refreshComputed();
}

// ---------- Checklist des étapes ----------
function findStop(stopId) {
  const trip = currentTrip();
  return trip ? trip.items.find((i) => i.id === stopId && i.type === "stop") : null;
}
function findTodo(stopId, todoId) {
  const s = findStop(stopId);
  return s && (s.todos || []).find((x) => x.id === todoId);
}
// Programme (séjour ou étape) : ajout ou modification d'une activité
function saveActivity(f) {
  const s = findStop(f.dataset.actForm);
  if (!s) return;
  const v = readActivityForm(f);
  if (!v.text) { toast(t("toast.needActivity")); f.text.focus(); return; }
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, x]) => x)); // pas de champ vide
  const old = f.dataset.todo && (s.todos || []).find((x) => x.id === f.dataset.todo);
  // book reste enregistré même à false : sans lui, l'activité serait comptée comme à réserver
  if (old) {
    ["date", "time", "how", "maps", "price"].forEach((k) => delete old[k]);
    Object.assign(old, clean(v), { book: v.book });
    if (!v.book) old.done = false; // plus rien à réserver : plus « réservé » non plus
  } else {
    s.todos = [...(s.todos || []), { id: uid(), done: false, ...clean(v), book: v.book }];
  }
  state.actForm = null;
  state.programOpen.add(s.id);
  save();
  render();
  toast(old ? t("toast.saved") : t("toast.activityAdded"));
}

// ---------- Menu, destinations, favoris, paramètres ----------
function onPageClick(act, b) {
  switch (act) {
    case "todo-del": {
      const s = findStop(b.dataset.stop);
      if (s) {
        deleteTicketFiles(((s.todos || []).find((x) => x.id === b.dataset.todo) || {}).tickets);
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
      toast(on ? t("toast.favAdded") : t("toast.favRemoved"));
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
      go("nouveau-voyage-" + x.code);
      return true;
    }
    case "export":
      exportTrips();
      return true;
    case "open-invite":
      state.inviteOpen = true;
      render();
      document.querySelector("form[data-invite-form] input")?.focus();
      return true;
    case "close-invite":
      state.inviteOpen = false;
      render();
      return true;
    case "swipe-delete":
      state.confirm = "swipe:" + b.dataset.trip;
      render();
      return true;
    // Mode sélection de « Mes voyages » et « Mes publications » : cocher des cartes pour les supprimer ensemble
    case "select-start":
      state.selecting = true;
      state.selected = new Set();
      state.confirm = null;
      render();
      return true;
    case "select-end":
      state.selecting = false;
      state.selected = new Set();
      state.confirm = null;
      render();
      return true;
    case "select-item": {
      const id = b.dataset.id;
      if (state.selected.has(id)) state.selected.delete(id);
      else state.selected.add(id);
      state.confirm = null;
      render();
      return true;
    }
    case "select-all": {
      const ids = (b.dataset.ids || "").split(",").filter(Boolean); // toutes les cartes de la page
      state.selected = ids.every((id) => state.selected.has(id)) ? new Set() : new Set(ids);
      state.confirm = null;
      render();
      return true;
    }
    case "select-delete":
      state.confirm = "select-delete";
      render();
      return true;
    case "select-cancel-delete":
      state.confirm = null;
      render();
      return true;
    case "select-delete-yes":
      deleteSelected();
      return true;
    case "swipe-cancel":
      state.confirm = null;
      render();
      return true;
    case "swipe-delete-yes": {
      const id = b.dataset.trip;
      const trip = state.trips[id];
      state.confirm = null;
      if (!trip) return render(), true;
      if (isOwner(trip)) {
        deleteTrip(id); // ses billets sont supprimés avec lui dans le compte
        toast(t("toast.tripDeleted"));
      } else {
        leaveTrip(id);
      }
      render();
      return true;
    }
    case "invite-join":
    case "invite-decline":
      answerInvitation(b.dataset.trip, act === "invite-join");
      return true;
    case "resend-invite":
      resendInvite(b.dataset.email);
      return true;
    case "cancel-invite-uid":
      cancelInviteUid(b.dataset.uid);
      return true;
    case "cancel-invite":
      cancelInvite(b.dataset.email);
      return true;
    case "remove-member":
      removeMember(b.dataset.uid);
      return true;
    case "ticket-open":
      openTicket(b.dataset.item, b.dataset.tkTodo, b.dataset.file);
      return true;
    case "ticket-del":
      state.confirm = "ticket:" + b.dataset.file;
      render();
      return true;
    case "ticket-del-yes":
      deleteTicket(b.dataset.item, b.dataset.tkTodo, b.dataset.file);
      return true;
  }
  return false;
}

function onSettingChange(el) {
  if (el.id === "emailReminders") {
    prefs.emailReminders = el.checked;
    savePrefs();
    toast(el.checked ? t("toast.remindersOn") : t("toast.remindersOff"));
    return true;
  }
  if (el.dataset && el.dataset.todo && el.type === "checkbox") {
    const todo = findTodo(el.dataset.stop, el.dataset.todo);
    if (todo) {
      todo.done = el.checked;
      save();
      render();
      if (el.checked) toast(t("toast.markedBooked"));
    }
    return true;
  }
  // Langue : la page est redessinée tout de suite, sans rechargement (rien de ce qui est en cours n'est perdu)
  if (el.name === "lang") {
    prefs.lang = el.value === "en" ? "en" : "fr";
    savePrefs();
    setLang(prefs.lang);
    resetSocial(); // textes par défaut des pages sociales (« Sans titre »…) recalculés dans la nouvelle langue
    render();
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
    toast(t("toast.currencySaved"));
    return true;
  }
  if (el.id === "profileName") {
    prefs.name = el.value.trim();
    savePrefs();
    renderSidebar();
    toast(t("toast.nameSaved"));
    return true;
  }
  return false;
}

function exportTrips() {
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), trips: state.trips }, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `hippalos-${new Date().toISOString().slice(0, 10)}.json`;
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
    case "retry-sync":
      flush();
      return true;
    case "delete-account-open":
      state.deleteAccount = "open";
      render();
      document.getElementById("deletePassword")?.focus();
      return true;
    case "delete-account-cancel":
      state.deleteAccount = null;
      render();
      return true;
    case "sign-out":
      // On envoie d'abord les dernières modifications, encore en attente
      flush().then(() => cloud.signOut()).then(() => toast(t("toast.signedOut")));
      return true;
    case "verify-check":
      checkVerified(b);
      return true;
    case "verify-later":
      state.verifyOpen = false;
      render();
      toast(t("toast.verifyLater"));
      return true;
    case "resend-verification":
      cloud.resendVerification()
        .then(() => toast(t("toast.verifySent")))
        .catch((err) => toast(cloud.errorMessage(err)));
      return true;
    default:
      return false;
  }
  render();
  const email = document.getElementById("auth-email");
  if (email) email.focus();
  return true;
}

// « J'ai confirmé mon adresse » : on le demande à Firebase, puis on rejoint les voyages en attente
async function checkVerified(btn) {
  const msg = document.getElementById("verify-msg");
  btn.disabled = true;
  try {
    const verified = await cloud.refreshEmailVerified();
    if (!verified) {
      msg.textContent = t("verify.notYet");
      msg.hidden = false;
      btn.disabled = false;
      return;
    }
    state.user.emailVerified = true;
    state.verifyOpen = false;
    state.invitations = await cloud.listInvitations().catch(() => []);
    toast(state.invitations.length ? t("verify.okInvites") : t("verify.ok"));
    go("voyages");
    render();
  } catch (err) {
    msg.textContent = cloud.errorMessage(err);
    msg.hidden = false;
    btn.disabled = false;
  }
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

  if (!email) return show(t("auth.needEmail"));
  if (mode !== "reset" && !password) return show(t("auth.needPassword"));
  if (mode === "signup" && password !== f.confirm.value) return show(t("auth.mismatch"));

  btn.disabled = true;
  try {
    if (mode === "signin") await cloud.signIn(email, password);
    else if (mode === "signup") {
      await cloud.signUp(email, password);
      // Écran de confirmation de l'adresse, tout de suite après la création du compte
      state.verifyOpen = true;
      render();
    }
    else {
      await cloud.resetPassword(email);
      show(t("auth.resetSent"), true);
    }
  } catch (err) {
    show(cloud.errorMessage(err));
  }
  btn.disabled = false;
}

function onSubmit(e) {
  if (onSocialSubmit(e)) return;
  const actForm = e.target.closest("form[data-act-form]");
  if (actForm) {
    e.preventDefault();
    saveActivity(actForm);
    return;
  }
  const delForm = e.target.closest("form[data-delete-account]");
  if (delForm) {
    e.preventDefault();
    const password = delForm.password.value;
    if (!password || state.deleteAccount === "busy") return;
    state.deleteAccount = "busy";
    render();
    deleteAccount(password).then((error) => {
      state.deleteAccount = error ? "open" : null;
      if (error) {
        render();
        toast(error);
        document.getElementById("deletePassword")?.focus();
        return;
      }
      toast(t("account.deleted"));
      go("voyages");
    });
    return;
  }
  const inviteForm = e.target.closest("form[data-invite-form]");
  if (inviteForm) {
    e.preventDefault();
    inviteFromForm(inviteForm);
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

  // Dernière vérification avant d'enregistrer (required laisse passer un champ rempli d'espaces)
  if (f.dataset.form === "transport") {
    const empty = [[f.from, "leg.needFrom"], [f.to, "leg.needTo"]].find(([el]) => !el.value.trim());
    if (empty) {
      toast(t(empty[1]));
      empty[0].focus();
      return;
    }
  }
  const [start, end] = f.dataset.form === "stop" ? [f.arrive, f.depart] : [f.dep, f.arr];
  if (start.value && end.value && end.value < start.value) {
    toast(f.dataset.form === "stop" ? t("stop.departBeforeArrive") : t("leg.arriveBeforeDepart"));
    end.focus();
    return;
  }

  const trip = currentTrip();
  const item = f.dataset.form === "stop" ? readStopForm(f) : readTransportForm(f);

  const old = f.dataset.new === "1" ? null : trip.items.find((x) => x.id === item.id);
  if (item.type === "transport") commitFormTickets(item, old);
  if (item.type === "stop" && f.dataset.sejour) item.todos = (old && old.todos) || []; // le programme se gère à part
  // Formulaire de road trip : les heures d'un ancien séjour sont gardées
  if (item.type === "stop" && !f.dataset.sejour && old) for (const k of ["arriveTime", "departTime"]) if (old[k]) item[k] = old[k];
  if (item.type === "stop") keepTodoTickets(item, old);

  if (f.dataset.new === "1") {
    // Premier lieu d'un séjour encore sans nom : le séjour prend le nom du lieu
    if (f.dataset.sejour && inAllLangs("trips.newShort").includes(trip.name) && item.place) trip.name = item.place;
    trip.items.splice(state.insertAt.pos, 0, item);
    state.insertAt = null;
  } else {
    const i = trip.items.findIndex((x) => x.id === item.id);
    if (i >= 0) {
      // Garde la position sur la carte et le pays si le lieu n'a pas été rechoisi
      if (!item.geo && old.geo) item.geo = old.geo;
      if (item.type === "transport") for (const k of ["fromGeo", "toGeo"]) if (!item[k] && old[k] && old[k].q === item[k.slice(0, -3)]) item[k] = old[k];
      if (old.route) item.route = old.route; // tracé de la route, vérifié à l'affichage
      if (item.type === "stop" && item.country === undefined && old.country && old.place === item.place) {
        item.country = old.country;
        if (old.countryCode) item.countryCode = old.countryCode;
      }
      trip.items[i] = item;
    }
    state.editingId = null;
  }
  save();
  render();
  toast(t("toast.saved"));
}

// Les activités gardent leurs billets et « comment y aller » (absents du formulaire de l'étape) ;
// les billets des activités retirées sont supprimés du compte
function keepTodoTickets(stop, old) {
  const before = new Map(((old && old.todos) || []).map((x) => [x.id, x]));
  stop.todos = stop.todos.map((x) => {
    const b = before.get(x.id);
    return { ...x, ...(b?.tickets?.length ? { tickets: b.tickets } : {}), ...(b?.how ? { how: b.how } : {}) };
  });
  const kept = new Set(stop.todos.map((x) => x.id));
  deleteTicketFiles([...before.values()].filter((x) => !kept.has(x.id)).flatMap((x) => x.tickets || []));
}

// Nouvelle activité dans le formulaire d'étape (après la ligne donnée, sinon à la fin)
function addTodoRow(after, form) {
  const f = form || after.closest("form");
  const html = todoRow({ id: uid(), text: "", done: false, book: false }, { arrive: f.arrive.value, depart: f.depart.value });
  if (after) after.insertAdjacentHTML("afterend", html);
  else form.querySelector("[data-todos]").insertAdjacentHTML("beforeend", html);
  const row = after ? after.nextElementSibling : form.querySelector("[data-todos]").lastElementChild;
  row.querySelector('[name="todoText"]').focus();
}

let nameTimer;
function onInput(e) {
  if (onSocialInput(e.target)) return;
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
        a && d ? (n !== null ? count(n, "count.night") : t("stop.departIsBefore")) : "";
    } else {
      const dep = f.dep.value, arr = f.arr.value;
      const d = duration(dep, arr);
      f.querySelector("[data-duration]").textContent = d
        ? t("leg.duration", { d })
        : dep && arr ? t("leg.arriveAfter") : t("leg.durationHint");
    }
  });
}
