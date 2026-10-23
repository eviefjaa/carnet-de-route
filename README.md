# Carnet de route

Petit site pour planifier un road trip : étapes, hébergements (liens Airbnb, Booking…), trajets avec horaires, carte du voyage et budget. Un menu donne accès aux idées de destinations (fiches pays), aux favoris, au profil et aux paramètres.

Sans compte, les voyages sont enregistrés dans le navigateur (localStorage). Avec un compte, ils sont enregistrés dans Firebase et synchronisés entre les appareils.

## Organisation des fichiers

```
index.html            Page principale
firestore.rules       Règles de sécurité Firestore (à copier dans la console Firebase)
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
  data/
    countries.js      Fiches pays (ajoutez-en en copiant une ligne)
  views/
    trips-list.js     Page Mes voyages : une carte par voyage
    trip.js           Page d'un voyage (et choix de la page à afficher)
    stop.js           Étape : affichage et formulaire
    transport.js      Trajet : affichage et formulaire
    actions.js        Boutons d'action et d'insertion
    budget.js         Section Budget (tableau des coûts)
    auth.js           Écran de connexion et bouton de compte
    sidebar.js        Menu de gauche
    explore.js        Destinations, fiche pays, favoris
    pages.js          Mon profil, Paramètres
```

## Mise en ligne

Le site est publié avec GitHub Pages (Settings → Pages → branche `main`, dossier `/ (root)`).

Les fichiers JavaScript sont des modules : le site doit être ouvert via une adresse web (GitHub Pages ou un petit serveur local), pas en double-cliquant sur `index.html`.
