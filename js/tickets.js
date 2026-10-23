// Billets des trajets : envoi, ouverture et suppression
//
// Chaque billet est un document Firestore (trips/{id}/files/{idDuBillet}) qui contient
// le fichier encodé en base64. Un document Firestore ne dépasse pas 1 Mo : les fichiers
// sont donc limités à 700 Ko, et les photos sont réduites avant l'envoi.
// Le trajet garde la liste de ses billets : leg.tickets = [{ id, name, type, size }].

import * as cloud from "./cloud.js";
import { state, currentTrip, save, flush } from "./store.js";
import { uid } from "./utils.js";
import { render } from "./views/trip.js";
import { fmtSize } from "./views/tickets.js";
import { toast } from "./toast.js";

const MAX = 700 * 1024;
const cache = new Map(); // billets déjà ouverts : id → Blob

const findLeg = (legId) => (currentTrip()?.items || []).find((i) => i.id === legId && i.type === "transport");

export async function addTickets(legId, files) {
  const tripId = state.currentId;
  if (!state.user || !files.length) return;
  try {
    await flush(); // le voyage doit exister dans le compte avant d'y ranger un billet
  } catch {}

  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    if (!isImage && file.type !== "application/pdf") {
      toast(`« ${file.name} » n'est ni un PDF ni une image.`);
      continue;
    }
    toast(`Envoi de « ${file.name} »…`);

    let blob = file;
    if (isImage) {
      try {
        blob = await shrinkImage(file);
      } catch {
        toast(`Impossible de lire l'image « ${file.name} ».`);
        continue;
      }
    }
    if (blob.size > MAX) {
      toast(`« ${file.name} » est trop lourd (${fmtSize(blob.size)}, 700 Ko maximum). Essayez une capture d'écran du billet.`);
      continue;
    }

    const name = isImage ? file.name.replace(/\.\w+$/, "") + ".jpg" : file.name;
    const ticket = { id: uid(), name: name.slice(0, 120), type: blob.type, size: blob.size };
    try {
      await cloud.saveFile(tripId, ticket.id, { name: ticket.name, type: ticket.type, size: ticket.size, legId, data: await toBase64(blob) });
    } catch {
      toast(`« ${file.name} » n'a pas pu être enregistré. Vérifiez votre connexion.`);
      continue;
    }
    cache.set(ticket.id, blob);

    // Le trajet a pu être modifié pendant l'envoi : on le recherche
    const leg = state.trips[tripId]?.items.find((i) => i.id === legId);
    if (leg) {
      leg.tickets = [...(leg.tickets || []), ticket];
      save();
    }
    toast(`Billet « ${ticket.name} » ajouté`);
    render();
  }
}

export async function openTicket(legId, fileId) {
  const ticket = (findLeg(legId)?.tickets || []).find((f) => f.id === fileId);
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

export async function deleteTicket(legId, fileId) {
  const tripId = state.currentId;
  state.confirm = null;
  try {
    await cloud.deleteFile(tripId, fileId);
  } catch {
    render();
    return toast("Impossible de supprimer ce billet. Vérifiez votre connexion.");
  }
  cache.delete(fileId);
  const leg = state.trips[tripId]?.items.find((i) => i.id === legId);
  if (leg) {
    leg.tickets = (leg.tickets || []).filter((f) => f.id !== fileId);
    save();
  }
  toast("Billet supprimé");
  render();
}

// Trajet supprimé : ses billets sont supprimés du compte aussi
export function deleteLegTickets(leg) {
  if (!leg || !leg.tickets || !leg.tickets.length || !state.user) return;
  const tripId = state.currentId;
  leg.tickets.forEach((f) => cloud.deleteFile(tripId, f.id).catch(() => {}));
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
