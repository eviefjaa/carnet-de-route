# Carnet de route

Petit site pour planifier un road trip : étapes, hébergements (liens Airbnb, Booking…), trajets avec horaires, carte du voyage et budget. Un menu donne accès aux idées de destinations (fiches pays), aux favoris, au profil et aux paramètres.

Sans compte, les voyages sont enregistrés dans le navigateur (localStorage). Avec un compte, ils sont enregistrés dans Firebase et synchronisés entre les appareils, et on peut inviter d'autres personnes à préparer un voyage.

## Organisation des fichiers

```
index.html            Page principale
firestore.rules       Règles de sécurité Firestore (à copier dans la console Firebase)
.github/workflows/
  reminders.yml       Rappels par e-mail, lancés chaque jour par GitHub Actions
scripts/reminders/    Programme d'envoi des rappels (Node.js)
css/
  base.css            Couleurs (thèmes clair et sombre), polices
  layout.css          Menu de gauche et mise en page
  components.css      Boutons, formulaires, en-tête, messages
  itinerary.css       Ligne de route, étapes, trajets
  map.css             Carte
  auth.css            Connexion et compte
  autocomplete.css    Suggestions de lieux
  explore.css         Destinations, fiches pays, favoris, profil, paramètres
  budget.css          Budget et prix
  checklist.css       Checklist des étapes
  share.css           Voyageurs et invitations
  tickets.css         Billets des trajets
  trips.css           Page Mes voyages (cartes)
js/
  app.js              Point d'entrée
  router.js           Navigation entre les pages (#voyages, #voyage-…, #destinations…)
  prefs.js            Préférences : favoris, thème, devise, nom
  store.js            Données des voyages et sauvegarde
  events.js           Clics, saisies, formulaires
  utils.js            Dates, durées, liens
  toast.js            Messages temporaires
  map.js              Carte (Leaflet + OpenStreetMap)
  geocode.js          Placement des lieux sur la carte (Nominatim)
  places.js           Recherche de lieux dans le monde (Photon / OpenStreetMap)
  autocomplete.js     Suggestions de lieux pendant la saisie
  budget.js           Calcul des totaux par destination et par voyage
  firebase-config.js  Configuration Firebase (null = sans compte)
  cloud.js            Firebase : comptes et enregistrement des voyages
  account.js          Connexion, déconnexion, import des voyages de l'appareil
  share.js            Invitations par e-mail, voyageurs, quitter un voyage
  tickets.js          Billets des trajets et des activités : envoi, ouverture, suppression
  data/
    countries.js      Fiches pays (ajoutez-en en copiant une ligne)
    country-details.js  Frise historique et incontournables détaillés de chaque pays
  views/
    trips-list.js     Page Mes voyages : une carte par voyage
    trip.js           Page d'un voyage (et choix de la page à afficher)
    stop.js           Étape : affichage et formulaire
    transport.js      Trajet : affichage et formulaire
    actions.js        Boutons d'action et d'insertion
    budget.js         Section Budget (tableau des coûts)
    checklist.js      Checklist « À faire et à réserver » de chaque étape
    share.js          Section Voyageurs d'un voyage
    tickets.js        Billets affichés dans un trajet, une activité ou un formulaire
    auth.js           Écran de connexion et bouton de compte
    sidebar.js        Menu de gauche
    explore.js        Destinations, fiche pays, favoris
    pages.js          Mon profil, Paramètres
```

## Mise en ligne

Le site est publié avec GitHub Pages (Settings → Pages → branche `main`, dossier `/ (root)`).

Les fichiers JavaScript sont des modules : le site doit être ouvert via une adresse web (GitHub Pages ou un petit serveur local), pas en double-cliquant sur `index.html`.

## Partager un voyage

Sur la page d'un voyage, la section « Voyageurs » permet d'inviter quelqu'un par son adresse e-mail. L'invitation est enregistrée dans le voyage, puis la messagerie de l'utilisateur s'ouvre avec un e-mail prêt à envoyer (lien vers le voyage). La personne invitée crée un compte ou se connecte avec cette adresse et la confirme : le voyage apparaît alors dans « Mes voyages ».

Tous les voyageurs peuvent modifier le voyage et inviter d'autres personnes. Seul le créateur peut supprimer le voyage, annuler une invitation ou retirer quelqu'un ; les autres peuvent quitter le voyage.

Les voyages sont dans `trips/{id}` (avec `owner`, `members`, `invites`, `emails`). Les anciens voyages, rangés dans `users/{uid}/trips`, sont déplacés automatiquement à la connexion suivante.

Après toute modification de `firestore.rules`, copiez son contenu dans la console Firebase (Firestore Database → Règles → Publier).

## Billets des trajets

Chaque trajet a une zone « Billets » pour y ranger des PDF ou des photos (billets de train, d'avion, de bus…), dès sa création dans le formulaire ou plus tard. Chaque activité de la checklist d'une étape peut aussi avoir ses billets (musée, excursion…). Il faut être connecté : les billets sont enregistrés dans le compte et visibles par tous les voyageurs du voyage.

Les billets sont stockés dans Firestore (`trips/{id}/files/{idDuBillet}`), encodés en base64, sans Firebase Storage (qui demande le forfait payant Blaze). Un document Firestore ne dépassant pas 1 Mo, chaque fichier est limité à 700 Ko ; les photos sont réduites automatiquement avant l'envoi.

## Rappels par e-mail

Chaque jour, GitHub Actions lance `scripts/reminders/send-reminders.js`. Pour chaque étape qui commence dans 3 jours ou moins et dont la checklist contient encore des éléments non cochés, un e-mail est envoyé à chacun des voyageurs (une seule fois par étape). Seules les adresses confirmées reçoivent les rappels : un lien de confirmation est envoyé à la création du compte.

Secrets à créer dans GitHub (Settings → Secrets and variables → Actions) :
- `FIREBASE_SERVICE_ACCOUNT` : contenu du fichier JSON de la clé de compte de service Firebase
- `GMAIL_USER` : adresse Gmail qui envoie les rappels
- `GMAIL_APP_PASSWORD` : mot de passe d'application Gmail

Ne jamais ajouter le fichier JSON de la clé dans le dépôt : il est public.
