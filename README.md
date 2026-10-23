# Carnet de route

Petit site pour planifier un road trip : étapes, hébergements (liens Airbnb, Booking…), trajets avec horaires, carte du voyage et budget (prix des hébergements et des transports, total par destination et par voyage).

Les données sont enregistrées dans le navigateur (localStorage) : elles restent sur l'appareil et le navigateur utilisés.

## Organisation des fichiers

```
index.html            Page principale
css/
  base.css            Couleurs, polices, mise en page générale
  components.css      Boutons, formulaires, en-tête, messages
  itinerary.css       Ligne de route, étapes, trajets
  map.css             Carte
  budget.css          Budget et prix
js/
  app.js              Point d'entrée
  store.js            Données des voyages et sauvegarde
  events.js           Clics, saisies, formulaires
  utils.js            Dates, durées, liens
  toast.js            Messages temporaires
  map.js              Carte (Leaflet + OpenStreetMap)
  geocode.js          Placement des lieux sur la carte (Nominatim)
  budget.js           Calcul des totaux par destination et par voyage
  views/
    trip.js           Page d'un voyage
    stop.js           Étape : affichage et formulaire
    transport.js      Trajet : affichage et formulaire
    actions.js        Boutons d'action et d'insertion
    budget.js         Section Budget (tableau des coûts)
```

## Mise en ligne

Le site est publié avec GitHub Pages (Settings → Pages → branche `main`, dossier `/ (root)`).

Les fichiers JavaScript sont des modules : le site doit être ouvert via une adresse web (GitHub Pages ou un petit serveur local), pas en double-cliquant sur `index.html`.
