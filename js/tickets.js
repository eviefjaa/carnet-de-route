// Billets : envoi, ouverture et suppression
//
// Un billet est rattaché à un trajet (leg.tickets) ou à une activité de la checklist
// d'une étape (todo.tickets). Chaque entrée : { id, name, type, size }.
// Le fichier lui-même est un document Firestore (trips/{id}/files/{idDuBillet}), encodé
// en base64. Un document Firestore ne dépasse pas 1 Mo : les fichiers sont donc limités
// à 700 Ko, et les photos sont réduites avant l'envoi.

import * as cloud from "./cloud.js";
import { state, save, flush } from "./store.js";
import { uid } from "./utils.js";
import { render } from "./views/trip.js";
import { fmtSize, formTicketsList } from "./views/tickets.js";
import { toast } from "./toast.js";

const MAX = 700 * 1024;
const cache = new Map(); // billets déjà ouverts ou envoyés : id → Blob

// Ce qui porte les billets : le trajet, ou l'activité d'une étape
function findHolder(tripId, itemId, todoId) {
  const item = state.trips[tripId]?.items.find((i) => i.id === itemId);
  if (!item) return null;
  return todoId ? (item.todos || []).find((t) => t.id === todoId) || null : item;
}

const isPdf = (file) => file.type === "application/pdf";
const isImage = (file) => file.type.startsWith("image/");

// Fichier refusé d'avance (mauvais type, PDF trop lourd) : message, et false
function acceptable(file) {
  if (!isPdf(file) && !isImage(file)) {
    toast(`« ${file.name} » n'est ni un PDF ni une image.`);
    return false;
  }
  if (isPdf(file) && file.size > MAX) {
    toast(`« ${file.name} » est trop lourd (${fmtSize(file.size)}, 700 Ko maximum). Essayez une capture d'écran du billet.`);
    return false;
  }
  return true;
}

// Envoie des fichiers et les ajoute au trajet ou à l'activité
export async function addTickets(itemId, todoId, files, tripId = state.currentId) {
  if (!state.user || !files.length) return;
  await flush(); // le voyage doit exister dans le compte avant d'y ranger un billet

  for (const file of files) {
    if (!acceptable(file)) continue;
    toast(`Envoi de « ${file.name} »…`);

    let blob = file;
    if (isImage(file)) {
      try {
        blob = await shrinkImage(file);
      } catch {
        toast(`L'image « ${file.name} » n'a pas pu être réduite sous 700 Ko.`);
        continue;
      }
    }

    const name = (isImage(file) ? file.name.replace(/\.\w+$/, "") + ".jpg" : file.name).slice(0, 120);
    const ticket = { id: uid(), name, type: blob.type, size: blob.size };
    try {
      const data = await toBase64(blob);
      await cloud.saveFile(tripId, ticket.id, { name, type: ticket.type, size: ticket.size, itemId, todoId: todoId || null, data });
    } catch {
      toast(`« ${file.name} » n'a pas pu être enregistré. Vérifiez votre connexion.`);
      continue;
    }
    cache.set(ticket.id, blob);

    // Recherché après l'envoi : le voyage a pu changer entre-temps
    const holder = findHolder(tripId, itemId, todoId);
    if (holder) {
      holder.tickets = [...(holder.tickets || []), ticket];
      save();
      toast(`Billet « ${name} » ajouté`);
      render();
    } else {
      cloud.deleteFile(tripId, ticket.id).catch(() => {}); // supprimé pendant l'envoi
    }
  }
}

export async function openTicket(itemId, todoId, fileId) {
  const holder = findHolder(state.currentId, itemId, todoId);
  const ticket = (holder?.tickets || []).find((f) => f.id === fileId);
  if (!ticket) return;
  // La fenêtre est ouverte tout de suite : sinon le navigateur la bloque après le téléchargement
  const win = window.open("", "_blank");
  let blob = cache.get(fileId);
  if (!blob) {
    try {
      const file = await cloud.loadFile(state.currentId, fileId);
      if (!file) throw new Error("absent");
      blob = fromBase64(file.data, file.type);
      cache.set(fileId, blob);
    } catch {
      if (win) win.close();
      return toast("Impossible d'ouvrir ce billet. Vérifiez votre connexion.");
    }
  }
  const url = URL.createObjectURL(blob);
  if (win) {
    win.location.href = url;
  } else {
    // Fenêtre bloquée : on télécharge le fichier
    const a = document.createElement("a");
    a.href = url;
    a.download = ticket.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function deleteTicket(itemId, todoId, fileId) {
  const tripId = state.currentId;
  state.confirm = null;
  try {
    await cloud.deleteFile(tripId, fileId);
  } catch {
    render();
    return toast("Impossible de supprimer ce billet. Vérifiez votre connexion.");
  }
  cache.delete(fileId);
  const holder = findHolder(tripId, itemId, todoId);
  if (holder) {
    holder.tickets = (holder.tickets || []).filter((f) => f.id !== fileId);
    save();
  }
  toast("Billet supprimé");
  render();
}

// Billets d'un élément supprimé (trajet, ou étape avec les billets de ses activités)
// ou d'une activité supprimée : on les supprime du compte aussi
export function deleteTicketFiles(tickets) {
  if (!state.user || !tickets || !tickets.length) return;
  const tripId = state.currentId;
  tickets.forEach((f) => {
    cache.delete(f.id);
    cloud.deleteFile(tripId, f.id).catch(() => {});
  });
}
export const allTickets = (item) => [...(item.tickets || []), ...(item.todos || []).flatMap((t) => t.tickets || [])];

// ---------- Formulaire d'un trajet ----------
export const resetFormTickets = () => (state.formTickets = { pending: [], removed: [] });

export function pickFormTickets(files) {
  state.formTickets.pending.push(...files.filter(acceptable));
  refreshFormTickets();
}

export function removeFormTicket({ file, pending }) {
  if (file) state.formTickets.removed.push(file);
  else state.formTickets.pending.splice(+pending, 1);
  refreshFormTickets();
}

// Met à jour la liste sans réafficher le formulaire (garde ce qui est tapé)
function refreshFormTickets() {
  const box = document.querySelector("[data-form-tickets]");
  if (!box) return;
  const legId = box.dataset.formTickets;
  const leg = state.trips[state.currentId]?.items.find((i) => i.id === legId) || { id: legId };
  box.innerHTML = formTicketsList(leg);
}

// Enregistrement du formulaire : billets gardés tout de suite, retirés supprimés, nouveaux envoyés
export function commitFormTickets(item, old) {
  const { pending, removed } = state.formTickets;
  const tripId = state.currentId;
  item.tickets = ((old && old.tickets) || []).filter((f) => !removed.includes(f.id));
  deleteTicketFiles(((old && old.tickets) || []).filter((f) => removed.includes(f.id)));
  resetFormTickets();
  // Envoyés une fois le trajet enregistré, pour qu'ils s'y ajoutent
  if (pending.length) setTimeout(() => addTickets(item.id, null, pending, tripId), 0);
}

// ---------- Fichiers ----------
// Photo réduite en JPEG jusqu'à passer sous la limite (de 2000 à 1000 pixels de côté)
async function shrinkImage(file) {
  const img = await createImageBitmap(file);
  for (const [side, quality] of [[2000, 0.82], [1600, 0.75], [1300, 0.7], [1000, 0.65]]) {
    const scale = Math.min(1, side / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX) return blob;
  }
  throw new Error("trop lourde");
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function fromBase64(data, type) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
