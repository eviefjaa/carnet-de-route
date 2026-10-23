// Configuration Firebase (comptes et synchronisation des voyages)
//
// Tant que cette valeur est null, le site fonctionne sans compte :
// les voyages restent enregistrés dans le navigateur.
//
// Pour activer les comptes : remplacez null par l'objet donné par Firebase
// (Console Firebase → Paramètres du projet → Vos applications → Configuration), par exemple :
//
// export const firebaseConfig = {
//   apiKey: "…",
//   authDomain: "…",
//   projectId: "…",
//   storageBucket: "…",
//   messagingSenderId: "…",
//   appId: "…",
// };
//
// Ces valeurs ne sont pas secrètes : la protection des données vient des règles Firestore.

export const firebaseConfig = null;
