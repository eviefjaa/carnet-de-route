// Numéros d'urgence par pays, relevés en novembre 2026 sur des sources officielles
// (fiches « Contacts utiles » de diplomatie.gouv.fr, pages des ambassades de France,
// sites des services d'urgence). Source de chaque pays en commentaire.
// general : numéro unique pour tous les secours (null s'il n'y en a pas)
// conseils : fiche « Conseils aux voyageurs » (ambassade, consulat), null pour la France

export const URGENCES_VERIFIED = "novembre 2026";

export const URGENCES = {
  // https://www.masecurite.interieur.gouv.fr/fr/fiches-pratiques/famille-et-aides-aux-victimes/numeros-utiles-nationaux
  FR: {general: "112", police: "17", ambulance: "15", pompiers: "18", autres: [{label: "Urgences par SMS (personnes sourdes ou malentendantes)", number: "114"}, {label: "Secours en mer (depuis le littoral)", number: "196"}], conseils: null},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/espagne/conseils-aux-voyageurs-contacts-utiles
  ES: {general: "112", police: "091", ambulance: "061", pompiers: "080", autres: [{label: "Garde civile (zones rurales, routes)", number: "062"}, {label: "Police municipale", number: "092"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/espagne/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/portugal/conseils-aux-voyageurs-contacts-utiles
  PT: {general: "112", police: "112", ambulance: "112", pompiers: "112", autres: [{label: "Ligne santé SNS 24 (conseil médical)", number: "808 24 24 24"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/portugal/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/italie/conseils-aux-voyageurs-contacts-utiles
  IT: {general: "112", police: "113", ambulance: "118", pompiers: "115", autres: [{label: "Carabiniers", number: "112"}, {label: "Garde côtière (secours en mer)", number: "1530"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/italie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/grece/conseils-aux-voyageurs-contacts-utiles
  GR: {general: "112", police: "100", ambulance: "166", pompiers: "199", autres: [{label: "Police touristique", number: "1571"}, {label: "Garde côtière (secours en mer)", number: "108"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/grece/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/croatie/conseils-aux-voyageurs-contacts-utiles
  HR: {general: "112", police: "192", ambulance: "194", pompiers: "193", autres: [{label: "Secours en mer", number: "195"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/croatie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/islande/conseils-aux-voyageurs-contacts-utiles
  IS: {general: "112", police: "112", ambulance: "112", pompiers: "112", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/islande/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/norvege/conseils-aux-voyageurs-contacts-utiles
  NO: {general: null, police: "112", ambulance: "113", pompiers: "110", autres: [{label: "Médecin de garde (urgences non vitales)", number: "116 117"}, {label: "Police (hors urgence)", number: "02800"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/norvege/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/irlande/conseils-aux-voyageurs-contacts-utiles
  IE: {general: "112", police: "112", ambulance: "112", pompiers: "112", autres: [{label: "Numéro d'urgence national (équivalent)", number: "999"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/irlande/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/royaume-uni/conseils-aux-voyageurs-securite
  GB: {general: "999", police: "999", ambulance: "999", pompiers: "999", autres: [{label: "Numéro européen (fonctionne aussi)", number: "112"}, {label: "Conseil médical NHS (non urgent)", number: "111"}, {label: "Police (hors urgence)", number: "101"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/royaume-uni/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/pays-bas/conseils-aux-voyageurs-contacts-utiles
  NL: {general: "112", police: "112", ambulance: "112", pompiers: "112", autres: [{label: "Police (hors urgence)", number: "0900 8844"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/pays-bas/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/allemagne/conseils-aux-voyageurs-contacts-utiles
  DE: {general: "112", police: "110", ambulance: "112", pompiers: "112", autres: [{label: "Médecin de garde (non urgent)", number: "116 117"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/allemagne/dernieres-minutes-et-alertes"},
  // https://www.oesterreich.gv.at/en/themen/notfaelle_unfaelle_und_kriminalitaet/notrufnummern
  AT: {general: "112", police: "133", ambulance: "144", pompiers: "122", autres: [{label: "Secours en montagne", number: "140"}, {label: "Centre antipoison", number: "01 406 43 43"}, {label: "Médecin de garde", number: "141"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/autriche/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/suisse/conseils-aux-voyageurs-contacts-utiles
  CH: {general: "112", police: "117", ambulance: "144", pompiers: "118", autres: [{label: "Rega, sauvetage aérien", number: "1414"}, {label: "Tox Info Suisse (intoxications)", number: "145"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/suisse/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-tcheque/conseils-aux-voyageurs-contacts-utiles
  CZ: {general: "112", police: "158", ambulance: "155", pompiers: "150", autres: [{label: "Secours en montagne", number: "1210"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/republique-tcheque/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/hongrie/conseils-aux-voyageurs-contacts-utiles
  HU: {general: "112", police: "107", ambulance: "104", pompiers: "105", autres: [{label: "Médecin de garde (soirs, week-ends)", number: "1830"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/hongrie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/albanie/conseils-aux-voyageurs-contacts-utiles
  AL: {general: "112", police: "129", ambulance: "127", pompiers: "128", autres: [{label: "Police routière", number: "126"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/albanie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/montenegro/conseils-aux-voyageurs-contacts-utiles
  ME: {general: "112", police: "122", ambulance: "124", pompiers: "123", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/montenegro/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/conseils-aux-voyageurs-contacts-utiles
  TR: {general: "112", police: "155", ambulance: "112", pompiers: "110", autres: [{label: "Gendarmerie (zones rurales)", number: "156"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/turquie/dernieres-minutes-et-alertes"},
  // https://ma.diplomatie.gouv.fr/fr/urgence
  MA: {general: null, police: "19", ambulance: "15", pompiers: "15", autres: [{label: "Gendarmerie royale (hors agglomération)", number: "177"}, {label: "SAMU", number: "141"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/maroc/dernieres-minutes-et-alertes"},
  // https://eg.diplomatie.gouv.fr/fr/en-cas-durgence
  EG: {general: null, police: "122", ambulance: "123", pompiers: "180", autres: [{label: "Police touristique", number: "126"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/egypte/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/conseils-aux-voyageurs-contacts-utiles
  TN: {general: null, police: "197", ambulance: "190", pompiers: "198", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/tunisie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/afrique-du-sud/conseils-aux-voyageurs-contacts-utiles
  ZA: {general: "112", police: "10111", ambulance: "10177", pompiers: null, autres: [{label: "Urgences au Cap (depuis un fixe)", number: "107"}, {label: "Secours en montagne (Cap occidental)", number: "021 948 9900"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/afrique-du-sud/dernieres-minutes-et-alertes"},
  // https://ke.diplomatie.gouv.fr/fr/en-cas-durgence
  KE: {general: "999", police: "999", ambulance: "1199", pompiers: null, autres: [{label: "Autres numéros d'urgence police", number: "112 / 911"}, {label: "Pompiers de Nairobi", number: "020 2222181"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/kenya/dernieres-minutes-et-alertes"},
  // https://tz.diplomatie.gouv.fr/en/en-cas-durgence
  TZ: {general: null, police: "112", ambulance: null, pompiers: "114", autres: [{label: "Protection civile", number: "111"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/tanzanie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/senegal/conseils-aux-voyageurs-contacts-utiles
  SN: {general: null, police: "17", ambulance: "1515", pompiers: "18", autres: [{label: "Gendarmerie nationale (numéro vert)", number: "800 00 20 20"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/senegal/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/madagascar/conseils-aux-voyageurs-contacts-utiles
  MG: {general: null, police: "17", ambulance: null, pompiers: "118", autres: [{label: "Gendarmerie nationale", number: "119"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/madagascar/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/cap-vert/conseils-aux-voyageurs-contacts-utiles
  CV: {general: null, police: "132", ambulance: "130", pompiers: "131", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/cap-vert/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/namibie/conseils-aux-voyageurs-contacts-utiles
  NA: {general: null, police: "10111", ambulance: null, pompiers: null, autres: [{label: "Urgences à Windhoek (pompiers, ambulances)", number: "061 211 111"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/namibie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/conseils-aux-voyageurs-contacts-utiles
  JO: {general: "911", police: "911", ambulance: "911", pompiers: "911", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/jordanie/dernieres-minutes-et-alertes"},
  // https://ae.diplomatie.gouv.fr/fr/en-cas-durgence
  AE: {general: null, police: "999", ambulance: "998", pompiers: "997", autres: [{label: "Garde côtière", number: "996"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/emirats-arabes-unis/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/oman/conseils-aux-voyageurs-contacts-utiles
  OM: {general: "9999", police: "9999", ambulance: "9999", pompiers: "9999", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/oman/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/japon/conseils-aux-voyageurs-contacts-utiles
  JP: {general: null, police: "110", ambulance: "119", pompiers: "119", autres: [{label: "Ligne d'aide aux visiteurs JNTO (24h/24, anglais)", number: "050-3816-2787"}, {label: "Garde côtière (urgences en mer)", number: "118"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/japon/dernieres-minutes-et-alertes"},
  // https://th.diplomatie.gouv.fr/fr/en-cas-durgence
  TH: {general: null, police: "191", ambulance: "1669", pompiers: "199", autres: [{label: "Police touristique (anglais, 24h/24)", number: "1155"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/thailande/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/vietnam/conseils-aux-voyageurs-contacts-utiles
  VN: {general: null, police: "113", ambulance: "115", pompiers: "114", autres: [{label: "Recherche et sauvetage", number: "112"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/vietnam/dernieres-minutes-et-alertes"},
  // https://id.diplomatie.gouv.fr/fr/en-cas-durgence
  ID: {general: "112", police: "110", ambulance: "112", pompiers: "113", autres: [{label: "Recherche et sauvetage (Basarnas)", number: "115"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/indonesie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/inde/conseils-aux-voyageurs-contacts-utiles
  IN: {general: "112", police: "112", ambulance: "112", pompiers: "112", autres: [{label: "Ligne d'aide aux touristes (24h/24, multilingue)", number: "1363"}, {label: "Ligne d'assistance aux femmes", number: "1091"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/inde/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/sri-lanka/conseils-aux-voyageurs-contacts-utiles
  LK: {general: null, police: "119", ambulance: "1990", pompiers: "110", autres: [{label: "Ligne tourisme et police touristique (24h/24)", number: "1912"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/sri-lanka/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/coree-du-sud/conseils-aux-voyageurs-contacts-utiles
  KR: {general: null, police: "112", ambulance: "119", pompiers: "119", autres: [{label: "Ligne d'information touristique (24h/24)", number: "1330"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/coree-du-sud/dernieres-minutes-et-alertes"},
  // https://kh.diplomatie.gouv.fr/fr/en-cas-durgence
  KH: {general: null, police: "117", ambulance: "119", pompiers: "118", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/cambodge/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/philippines/conseils-aux-voyageurs-contacts-utiles
  PH: {general: "911", police: "911", ambulance: "911", pompiers: "911", autres: [{label: "Croix-Rouge philippine", number: "143"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/philippines/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/nepal/conseils-aux-voyageurs-contacts-utiles
  NP: {general: null, police: "100", ambulance: "102", pompiers: "101", autres: [{label: "Police touristique", number: "1144"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/nepal/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/chine/conseils-aux-voyageurs-contacts-utiles
  CN: {general: null, police: "110", ambulance: "120", pompiers: "119", autres: [{label: "Accidents de la route", number: "122"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/chine/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/malaisie/conseils-aux-voyageurs-contacts-utiles
  MY: {general: "999", police: "999", ambulance: "999", pompiers: "999", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/malaisie/dernieres-minutes-et-alertes"},
  // https://br.diplomatie.gouv.fr/fr/en-cas-durgence
  BR: {general: null, police: "190", ambulance: "192", pompiers: "193", autres: [{label: "Police fédérale des routes", number: "191"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/bresil/dernieres-minutes-et-alertes"},
  // https://ar.diplomatie.gouv.fr/fr/en-cas-durgence
  AR: {general: "911", police: "911", ambulance: "107", pompiers: "100", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/argentine/dernieres-minutes-et-alertes"},
  // https://cl.diplomatie.gouv.fr/fr/en-cas-durgence
  CL: {general: null, police: "133", ambulance: "131", pompiers: "132", autres: [{label: "Urgences en mer", number: "137"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/chili/dernieres-minutes-et-alertes"},
  // https://pe.diplomatie.gouv.fr/fr/en-cas-durgence
  PE: {general: null, police: "105", ambulance: "106", pompiers: "116", autres: [{label: "Protection civile", number: "115"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/perou/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/bolivie/conseils-aux-voyageurs-contacts-utiles
  BO: {general: null, police: "110", ambulance: "118", pompiers: "119", autres: [{label: "Ambulances municipales (La Paz)", number: "167"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/bolivie/dernieres-minutes-et-alertes"},
  // https://co.diplomatie.gouv.fr/fr/urgence-difficulte/accident-hospitalisation-et-deces
  CO: {general: "123", police: "123", ambulance: "123", pompiers: "123", autres: [{label: "Anti-enlèvement et extorsion (GAULA)", number: "165"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/colombie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/mexique/conseils-aux-voyageurs-contacts-utiles
  MX: {general: "911", police: "911", ambulance: "911", pompiers: "911", autres: [{label: "Assistance routière aux touristes (Ángeles Verdes)", number: "078"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/mexique/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/cuba/conseils-aux-voyageurs-contacts-utiles
  CU: {general: null, police: "106", ambulance: "104", pompiers: "105", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/cuba/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/costa-rica/conseils-aux-voyageurs-contacts-utiles
  CR: {general: "911", police: "911", ambulance: "911", pompiers: "911", conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/costa-rica/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/etats-unis/conseils-aux-voyageurs-contacts-utiles
  US: {general: "911", police: "911", ambulance: "911", pompiers: "911", autres: [{label: "Centre antipoison", number: "1-800-222-1222"}, {label: "Détresse psychologique, prévention du suicide", number: "988"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/etats-unis/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/canada/conseils-aux-voyageurs-contacts-utiles
  CA: {general: "911", police: "911", ambulance: "911", pompiers: "911", autres: [{label: "Info-Santé (conseil médical, selon la province)", number: "811"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/canada/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/guatemala/conseils-aux-voyageurs-contacts-utiles
  GT: {general: null, police: "110", ambulance: "122", pompiers: "122", autres: [{label: "Assistance aux touristes (INGUAT)", number: "1500"}, {label: "Pompiers municipaux", number: "123"}, {label: "Croix-Rouge guatémaltèque", number: "125"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/guatemala/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/australie/conseils-aux-voyageurs-contacts-utiles
  AU: {general: "000", police: "000", ambulance: "000", pompiers: "000", autres: [{label: "Inondations et tempêtes (SES)", number: "132 500"}, {label: "Police (hors urgence)", number: "131 444"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/australie/dernieres-minutes-et-alertes"},
  // https://www.diplomatie.gouv.fr/fr/information-par-pays/nouvelle-zelande/conseils-aux-voyageurs-contacts-utiles
  NZ: {general: "111", police: "111", ambulance: "111", pompiers: "111", autres: [{label: "Police (hors urgence)", number: "105"}], conseils: "https://www.diplomatie.gouv.fr/fr/information-par-pays/nouvelle-zelande/dernieres-minutes-et-alertes"},
  // https://www.polynesie-francaise.gouv.fr/Services-de-l-Etat/Le-Haut-Commissariat/Horaires-et-coordonnees
  PF: {general: "112", police: "17", ambulance: "15", pompiers: "18", autres: [{label: "Secours en mer (JRCC Tahiti)", number: "16"}], conseils: null},
};
