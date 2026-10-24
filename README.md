# Carnet de route

Petit site pour planifier un road trip : étapes, hébergements (liens Airbnb, Booking…), trajets avec horaires, carte du voyage et budget. Un menu donne accès aux idées de destinations (fiches pays), aux favoris, au profil et aux paramètres.

Sans compte, les voyages sont enregistrés dans le navigateur (localStorage). Avec un compte, ils sont enregistrés dans Firebase et synchronisés entre les appareils, et on peut inviter d'autres personnes à préparer un voyage.

## Organisation des fichiers

```
index.html            Page principale
firebase.json         Configuration Firebase (règles, émulateurs pour les tests)
tests/                Tests : unitaires, règles Firestore, parcours complet dans Chrome
404.html              Page « introuvable » (GitHub Pages)
sitemap.xml           Plan du site pour les moteurs de recherche
img/                  Favicons et image de partage sur les réseaux
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
  social.css          Profils, abonnements et publications
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
  routes.js           Tracé des routes pour les trajets en voiture ou en bus (OSRM d'OpenStreetMap)
  places.js           Recherche de lieux dans le monde (Photon / OpenStreetMap)
  autocomplete.js     Suggestions de lieux pendant la saisie
  budget.js           Calcul des totaux par destination et par voyage
  firebase-config.js  Configuration Firebase (null = sans compte)
  cloud.js            Firebase : comptes et enregistrement des voyages
  account.js          Connexion, déconnexion, import des voyages de l'appareil
  share.js            Invitations par e-mail, voyageurs, quitter un voyage
  social.js           Profils publics, abonnements et publications (Firestore)
  social-events.js    Clics et formulaires des pages sociales
  publish.js          Copie publique d'un voyage (sans dates, prix, notes, adresses, billets)
  merge.js            Fusion d'un voyage modifié en même temps par plusieurs voyageurs
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
    social.js         Fil d'actualité, Découvrir, profil d'une personne, publication
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

## Profils et publications

Dans « Mon profil », on crée un profil public (nom, pseudo unique, bio) et on choisit un compte public (tout le monde peut s'abonner) ou privé (chaque demande d'abonnement est à accepter). L'adresse e-mail n'apparaît jamais.

Sur la page d'un voyage, « Publier l'itinéraire » crée une copie figée, que personne ne peut modifier, visible par « Tout le monde » (même sans compte, avec le lien), « Mes abonnés » ou « Moi seul(e) ». La visibilité se change et la publication se supprime à tout moment. Sont publiés : les étapes, les activités, les trajets et la carte (positions arrondies à environ 2 km), avec « Jour 1, Jour 2… » à la place des dates. Ne sont jamais publiés : dates, prix, notes, adresses, liens et numéros de réservation, billets, co-voyageurs.

En publiant, on peut ajouter des recommandations facultatives : restaurants, hébergements, adresses ou activités, avec un lieu, un mot et un lien. Les itinéraires publiés peuvent être commentés par les personnes qui les voient et qui ont un profil public. Un commentaire est supprimé par son auteur ou par l'auteur de l'itinéraire, et il n'est jamais modifié.

La page « Notifications » signale les commentaires sur ses itinéraires, les nouveaux abonnés, les demandes d'abonnement, les demandes acceptées et les voyageurs qui rejoignent ses voyages. Elles sont déduites des abonnements et des commentaires existants (aucun autre compte ne peut en écrire), rechargées toutes les 3 minutes et au retour sur l'onglet. Le nombre de nouveautés s'affiche dans le menu et sur son bouton, sur téléphone.

Pages : « Fil d'actualité » (publications des personnes suivies), « Découvrir » (derniers itinéraires publics et recherche de personnes), `#personne-…` (profil) et `#publication-…` (itinéraire publié).

Données Firestore : `profiles/{uid}`, `handles/{pseudo}`, `follows/{abonné}_{suivi}`, `posts/{id}` (avec `recos`) et `posts/{id}/comments/{id}`. Qui voit et modifie quoi : `firestore.rules`.

Tests en local avec les émulateurs Firebase : lancer `firebase emulators:start --only auth,firestore` (Java 11 ou plus récent), puis ouvrir le site sur `http://localhost:…/?emulateur`.

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

## Tests

Les tests sont dans `tests/`. Il faut Node.js, et Java 21 pour l'émulateur Firebase (par exemple `brew install openjdk@21`).

```
cd tests
npm install
npm test            # tests unitaires et règles de sécurité Firestore
npm run test:e2e    # parcours complet dans Chrome, avec deux comptes fictifs
```

Les tests de règles et le parcours complet tournent contre les émulateurs Firebase : aucune donnée réelle n'est lue ni modifiée. Le parcours complet sert le site sur `http://localhost:8765` et utilise Google Chrome (chemin modifiable avec la variable `CHROME_PATH`).

Sur GitHub, le workflow « Tests » lance les tests unitaires, ceux des rappels et ceux des règles à chaque envoi de code.

## Publier les règles Firestore depuis le terminal

Au lieu de copier `firestore.rules` dans la console, depuis la racine du dépôt :

```
npx firebase-tools login                              # une seule fois
npx firebase-tools deploy --only firestore:rules
```
