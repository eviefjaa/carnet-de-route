# Carnet de route

Petit site pour planifier un road trip : étapes, hébergements (liens Airbnb, Booking…), trajets avec horaires, carte du voyage et budget (prix des hébergements et des transports, total par destination et par voyage).

Sans compte, les voyages sont enregistrés dans le navigateur (localStorage). Avec un compte, ils sont enregistrés dans Firebase et synchronisés entre les appareils.

## Organisation des fichiers

```
index.html            Page principale
firestore.rules       Règles de sécurité Firestore (à copier dans la console Firebase)
css/
  base.css            Couleurs, polices, mise en page générale
  components.css      Boutons, formulaires, en-tête, messages
  itinerary.css       Ligne de route, étapes, trajets
  map.css             Carte
  auth.css            Connexion et compte
  autocomplete.css    Suggestions de lieux
  budget.css          Budget et prix
js/
  app.js              Point d'entrée
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
  views/
    trip.js           Page d'un voyage
    stop.js           Étape : affichage et formulaire
    transport.js      Trajet : affichage et formulaire
    actions.js        Boutons d'action et d'insertion
    budget.js         Section Budget (tableau des coûts)
    auth.js           Écran de connexion et bouton de compte
```

## Mise en ligne

Le site est publié avec GitHub Pages (Settings → Pages → branche `main`, dossier `/ (root)`).

Les fichiers JavaScript sont des modules : le site doit être ouvert via une adresse web (GitHub Pages ou un petit serveur local), pas en double-cliquant sur `index.html`.
