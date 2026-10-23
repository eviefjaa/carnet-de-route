// Envoi des rappels par e-mail — lancé chaque jour par GitHub Actions
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
import { findDueReminders, buildEmail, todayIn, daysBetween } from "./reminders.js";

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
      if (!stop.arrive) { lines.push(`étape sans date d'arrivée (${left} à réserver) → ignorée`); continue; }
      const d = daysBetween(today, stop.arrive);
      if (d < 0) lines.push(`étape passée (il y a ${-d} j) → ignorée`);
      else if (d > DAYS_BEFORE) lines.push(`étape dans ${d} jours → trop tôt`);
      else if (sent[`${tripId}:${stop.id}:${stop.arrive}`]) lines.push(`étape dans ${d} jour(s) → rappel déjà envoyé`);
      else lines.push(`étape dans ${d} jour(s), ${left} à réserver → rappel à envoyer`);
    }
  }
  return lines;
}

let sentCount = 0;
let n = 0;
const users = await db.collection("users").listDocuments();
console.log(`${users.length} compte(s) trouvé(s).`);

for (const userRef of users) {
  n++;
  const label = `Compte ${n}`;
  const prefs = (await userRef.collection("meta").doc("prefs").get()).data() || {};
  if (prefs.emailReminders === false) {
    console.log(`${label} : rappels désactivés dans les Paramètres → ignoré`);
    continue;
  }

  const tripsSnap = await userRef.collection("trips").get();
  const trips = Object.fromEntries(tripsSnap.docs.map((d) => [d.id, d.data()]));
  const sentRef = userRef.collection("meta").doc("reminders");
  const sent = (await sentRef.get()).data() || {};

  const reasons = explain(trips, sent);
  console.log(`${label} : ${tripsSnap.size} voyage(s)${reasons.length ? "" : ", aucune case non cochée"}`);
  reasons.forEach((r) => console.log(`   - ${r}`));

  const due = findDueReminders(trips, today, DAYS_BEFORE, sent);
  if (!due.length) continue;

  let email = null;
  try {
    email = (await admin.auth().getUser(userRef.id)).email;
  } catch {}
  if (!email) {
    console.log(`${label} : pas d'adresse e-mail sur le compte → ignoré`);
    continue;
  }

  const { subject, text, html } = buildEmail(due, SITE_URL);
  if (DRY_RUN) {
    console.log(`${label} : e-mail prêt (${due.length} étape(s)), non envoyé car c'est un essai`);
    continue;
  }

  try {
    await mailer.sendMail({ from: `Carnet de route <${process.env.GMAIL_USER}>`, to: email, subject, text, html });
    await sentRef.set(Object.fromEntries(due.map((r) => [r.key, today])), { merge: true });
    sentCount++;
    console.log(`${label} : e-mail envoyé ✓`);
  } catch (err) {
    console.error(`${label} : échec de l'envoi (${err.code || "erreur"}). Vérifiez GMAIL_USER et GMAIL_APP_PASSWORD.`);
    process.exitCode = 1;
  }
}

console.log(`${sentCount} e-mail${sentCount > 1 ? "s" : ""} envoyé${sentCount > 1 ? "s" : ""}.`);