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

import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { findDueReminders, buildEmail, todayIn } from "./reminders.js";

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
console.log(`Rappels du ${today} (étapes dans ${DAYS_BEFORE} jours ou moins)${DRY_RUN ? " — essai, rien n'est envoyé" : ""}`);

let sentCount = 0;
const users = await db.collection("users").listDocuments();

for (const userRef of users) {
  const uid = userRef.id;
  const prefs = (await userRef.collection("meta").doc("prefs").get()).data() || {};
  if (prefs.emailReminders === false) continue;

  const tripsSnap = await userRef.collection("trips").get();
  const trips = Object.fromEntries(tripsSnap.docs.map((d) => [d.id, d.data()]));
  const sentRef = userRef.collection("meta").doc("reminders");
  const sent = (await sentRef.get()).data() || {};

  const due = findDueReminders(trips, today, DAYS_BEFORE, sent);
  if (!due.length) continue;

  let email = null;
  try {
    email = (await admin.auth().getUser(uid)).email;
  } catch {}
  if (!email) continue;

  const { subject, text, html } = buildEmail(due, SITE_URL);
  console.log(`→ ${email} : ${subject}`);

  if (DRY_RUN) {
    console.log(text);
    continue;
  }

  try {
    await mailer.sendMail({ from: `Carnet de route <${process.env.GMAIL_USER}>`, to: email, subject, text, html });
    const marks = Object.fromEntries(due.map((r) => [r.key, today]));
    await sentRef.set(marks, { merge: true });
    sentCount++;
  } catch (err) {
    console.error(`Échec de l'envoi à ${email} : ${err.message}`);
    process.exitCode = 1;
  }
}

console.log(`${sentCount} e-mail${sentCount > 1 ? "s" : ""} envoyé${sentCount > 1 ? "s" : ""}.`);
