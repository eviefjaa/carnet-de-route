// Envoi des rappels par e-mail, lancé chaque jour par GitHub Actions
// (.github/workflows/reminders.yml)
//
// Variables d'environnement (secrets GitHub) :
//   FIREBASE_SERVICE_ACCOUNT  contenu du fichier JSON de la clé de compte de service Firebase
//   GMAIL_USER                adresse Gmail qui envoie les rappels
//   GMAIL_APP_PASSWORD        mot de passe d'application Gmail (16 caractères)
// Options :
//   SITE_URL     adresse du site (par défaut celle de GitHub Pages)
//   DAYS_BEFORE  nombre de jours avant l'étape (par défaut 3)
//   DRY_RUN      "true" pour tout afficher sans envoyer ni rien enregistrer
//
// Le dépôt est public : ses journaux aussi. On n'y écrit donc jamais d'adresse e-mail
// ni le contenu des voyages, seulement des comptes anonymes (« compte 1 », « compte 2 »…).

import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { findDueReminders, buildEmail, todayIn, daysBetween, stopDate } from "./reminders.js";

const SITE_URL = process.env.SITE_URL || "https://eviefjaa.github.io/carnet-de-route/";
const DAYS_BEFORE = Number(process.env.DAYS_BEFORE || 3);
const DRY_RUN = process.env.DRY_RUN === "true";

function need(name) {
  if (!process.env[name]) {
    console.error(`Il manque le secret ${name}. Ajoutez-le dans GitHub : Settings → Secrets and variables → Actions.`);
    process.exit(1);
  }
  return process.env[name];
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(need("FIREBASE_SERVICE_ACCOUNT"))) });
const db = admin.firestore();

const mailer = DRY_RUN ? null : nodemailer.createTransport({
  service: "gmail",
  auth: { user: need("GMAIL_USER"), pass: need("GMAIL_APP_PASSWORD") },
});

const today = todayIn("Europe/Paris");
console.log(`Rappels du ${today} : étapes qui commencent dans ${DAYS_BEFORE} jours ou moins${DRY_RUN ? " (essai, rien n'est envoyé)" : ""}`);

// Explique, pour chaque étape avec des choses non cochées, pourquoi elle est retenue ou non
function explain(trips, sent) {
  const lines = [];
  for (const [tripId, trip] of Object.entries(trips)) {
    for (const stop of trip.items || []) {
      if (stop.type !== "stop") continue;
      const left = (stop.todos || []).filter((t) => !t.done && t.text).length;
      if (!left) continue;
      const date = stopDate(trip, stop);
      if (!date) { lines.push(`étape sans date (${left} à réserver) → ignorée`); continue; }
      const d = daysBetween(today, date);
      if (d < 0) lines.push(`étape passée (il y a ${-d} j) → ignorée`);
      else if (d > DAYS_BEFORE) lines.push(`étape dans ${d} jours → trop tôt`);
      else if (sent[`${tripId}:${stop.id}:${date}`]) lines.push(`étape dans ${d} jour(s) → rappel déjà envoyé`);
      else lines.push(`étape dans ${d} jour(s), ${left} à réserver → rappel à envoyer`);
    }
  }
  return lines;
}

// Voyages de chaque personne : { uid: { idVoyage: voyage } }
const tripsByUser = {};
const addTrip = (uid, id, trip) => ((tripsByUser[uid] ||= {})[id] = trip);

// Voyages (trips/{id}) : chaque voyageur reçoit ses rappels
const shared = await db.collection("trips").get();
shared.docs.forEach((d) => (d.data().members || []).forEach((uid) => addTrip(uid, d.id, d.data())));

// Anciens voyages (users/{uid}/trips) : déplacés dans trips à la prochaine connexion sur le site
const users = await db.collection("users").listDocuments();
let oldCount = 0;
for (const userRef of users) {
  const snap = await userRef.collection("trips").get();
  oldCount += snap.size;
  snap.docs.forEach((d) => addTrip(userRef.id, d.id, d.data()));
}

const uids = [...new Set([...users.map((u) => u.id), ...Object.keys(tripsByUser)])];
console.log(`${uids.length} compte(s), ${shared.size} voyage(s) dans trips, ${oldCount} ancien(s) voyage(s) pas encore déplacé(s).`);

let sentCount = 0;
let n = 0;

for (const uid of uids) {
  n++;
  const label = `Compte ${n}`;
  const userRef = db.collection("users").doc(uid);
  const prefs = (await userRef.collection("meta").doc("prefs").get()).data() || {};
  if (prefs.emailReminders === false) {
    console.log(`${label} : rappels désactivés dans les Paramètres → ignoré`);
    continue;
  }

  const trips = tripsByUser[uid] || {};
  const sentRef = userRef.collection("meta").doc("reminders");
  const sent = (await sentRef.get()).data() || {};

  const reasons = explain(trips, sent);
  console.log(`${label} : ${Object.keys(trips).length} voyage(s)${reasons.length ? "" : ", aucune case non cochée"}`);
  reasons.forEach((r) => console.log(`   - ${r}`));

  const due = findDueReminders(trips, today, DAYS_BEFORE, sent);
  if (!due.length) continue;

  // Seulement vers une adresse confirmée : sinon n'importe qui pourrait
  // créer un compte avec l'adresse d'un autre et lui faire envoyer des e-mails
  let user = null;
  try {
    user = await admin.auth().getUser(uid);
  } catch {}
  if (!user || !user.email) {
    console.log(`${label} : pas d'adresse e-mail sur le compte → ignoré`);
    continue;
  }
  if (!user.emailVerified) {
    console.log(`${label} : adresse e-mail pas encore confirmée → ignoré (bouton dans Paramètres → Rappels par e-mail)`);
    continue;
  }
  const email = user.email;

  const { subject, text, html } = buildEmail(due, SITE_URL);
  if (DRY_RUN) {
    console.log(`${label} : e-mail prêt (${due.length} étape(s)), non envoyé car c'est un essai`);
    continue;
  }

  try {
    await mailer.sendMail({ from: `Carnet de route <${process.env.GMAIL_USER}>`, to: email, subject, text, html });
    await sentRef.set(Object.fromEntries(due.map((r) => [r.key, today])), { merge: true });
    sentCount++;
    console.log(`${label} : e-mail envoyé`);
  } catch (err) {
    console.error(`${label} : échec de l'envoi (${err.code || "erreur"}). Vérifiez GMAIL_USER et GMAIL_APP_PASSWORD.`);
    process.exitCode = 1;
  }
}

console.log(`${sentCount} e-mail${sentCount > 1 ? "s" : ""} envoyé${sentCount > 1 ? "s" : ""}.`);