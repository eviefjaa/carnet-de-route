// Fiches pays pour « Choisir une destination »
//
// Chaque pays : code ISO, nom, continent, capitale, langue(s), monnaie (code ISO),
// meilleure période, coût de la vie sur place (1 = bon marché, 3 = cher), envies,
// accroche, présentation, histoire et lieux à ne pas manquer.
// Pour ajouter un pays : copiez une ligne c(...) et adaptez-la.

export const CONTINENTS = ["Europe", "Afrique", "Moyen-Orient", "Asie", "Amériques", "Océanie"];

export const TAGS = {
  plage: "Plage",
  montagne: "Montagne",
  nature: "Nature",
  culture: "Culture",
  ville: "Villes",
  gastronomie: "Gastronomie",
  aventure: "Aventure",
  desert: "Désert",
  faune: "Faune",
};

// Drapeau à partir du code pays (ex. "BR" → 🇧🇷)
export const flag = (code) => String.fromCodePoint(...[...code].map((ch) => 127397 + ch.charCodeAt(0)));

const c = (code, name, continent, capital, language, currency, best, budget, tags, tagline, description, history, highlights) =>
  ({ code, name, continent, capital, language, currency, best, budget, tags, tagline, description, history, highlights });

export const COUNTRIES = [
  // ---------- Europe ----------
  c("FR", "France", "Europe", "Paris", "Français", "EUR", "Mai à septembre", 3, ["culture", "gastronomie", "montagne", "plage", "ville"],
    "Châteaux, villages, grands vins et paysages d'une incroyable variété.",
    "Des plages de la Côte d'Azur aux sommets des Alpes, la France concentre une diversité de paysages rare. Sa gastronomie, ses vignobles et son patrimoine en font l'un des pays les plus visités au monde.",
    "Terre des Gaulois puis province romaine, le pays prend le nom des Francs au haut Moyen Âge. La monarchie domine pendant des siècles jusqu'à la Révolution de 1789, qui marque durablement l'Europe. La Ve République est fondée en 1958.",
    ["Paris et ses musées", "Les châteaux de la Loire", "La Provence et ses champs de lavande", "Le Mont-Saint-Michel", "Les Alpes et le mont Blanc"]),

  c("ES", "Espagne", "Europe", "Madrid", "Espagnol (et catalan, basque, galicien)", "EUR", "Avril à juin, septembre et octobre", 2, ["plage", "culture", "gastronomie", "ville"],
    "Soleil, tapas, flamenco et héritage mauresque.",
    "L'Espagne mêle villes vibrantes, côtes ensoleillées et villages blancs andalous. On y vit tard, on y mange bien, et chaque région a sa propre identité.",
    "Pendant près de huit siècles, à partir de 711, une grande partie de la péninsule fait partie d'Al-Andalus, dont l'Alhambra de Grenade est le joyau. Après 1492, l'Espagne bâtit un immense empire outre-mer. Au XXe siècle, la guerre civile (1936-1939) mène à la dictature de Franco, puis le pays retrouve la démocratie après 1975.",
    ["Barcelone et l'œuvre de Gaudí", "Séville et l'Andalousie", "L'Alhambra de Grenade", "Madrid et le musée du Prado", "Les Baléares"]),

  c("PT", "Portugal", "Europe", "Lisbonne", "Portugais", "EUR", "Avril à octobre", 2, ["plage", "culture", "gastronomie", "ville"],
    "Azulejos, fado et falaises dorées face à l'Atlantique.",
    "Petit par la taille mais riche en ambiances, le Portugal offre des villes en pente pleines de charme, des vignobles en terrasses et des plages spectaculaires. Accueillant et abordable, c'est une destination idéale pour un road trip.",
    "Le Portugal est l'un des plus anciens États-nations d'Europe. Aux XVe et XVIe siècles, ses navigateurs ouvrent la route maritime des Indes (Vasco de Gama, 1498) et atteignent le Brésil. Le pays sort de la dictature avec la révolution des Œillets en 1974.",
    ["Lisbonne et Belém", "Porto et la vallée du Douro", "Sintra et ses palais", "Les falaises de l'Algarve", "L'archipel des Açores"]),

  c("IT", "Italie", "Europe", "Rome", "Italien", "EUR", "Avril à juin, septembre et octobre", 3, ["culture", "gastronomie", "plage", "ville"],
    "Un musée à ciel ouvert, et la meilleure cuisine du monde pour beaucoup.",
    "De la Rome antique à la Renaissance florentine, l'Italie est l'un des berceaux de la culture européenne. Ses côtes, ses lacs, ses collines toscanes et sa cuisine régionale se prêtent parfaitement à un voyage itinérant.",
    "Rome domine pendant des siècles un empire qui s'étend autour de toute la Méditerranée. Morcelée en cités et États rivaux, la péninsule voit naître la Renaissance à Florence au XVe siècle. L'unification italienne aboutit en 1861 et la République est proclamée en 1946.",
    ["Rome et le Vatican", "Florence et la Toscane", "Venise", "La côte amalfitaine", "La Sicile"]),

  c("GR", "Grèce", "Europe", "Athènes", "Grec", "EUR", "Mai, juin, septembre et octobre", 2, ["plage", "culture", "gastronomie"],
    "Îles blanches et bleues, mer turquoise et vestiges antiques.",
    "Avec des milliers d'îles et des sites archéologiques majeurs, la Grèce conjugue farniente et histoire. Les Cyclades, la Crète et le continent offrent chacun une expérience différente.",
    "Athènes invente la démocratie au Ve siècle av. J.-C., à l'époque où est bâti le Parthénon. La région passe ensuite sous l'autorité de Rome, de Byzance puis de l'Empire ottoman. La guerre d'indépendance commence en 1821 et aboutit à la création d'un État grec moderne.",
    ["L'Acropole d'Athènes", "Santorin et les Cyclades", "La Crète", "Les monastères des Météores", "Le Péloponnèse"]),

  c("HR", "Croatie", "Europe", "Zagreb", "Croate", "EUR", "Mai, juin et septembre", 2, ["plage", "nature", "culture"],
    "Remparts, criques et lacs émeraude sur l'Adriatique.",
    "La côte croate aligne villes fortifiées, îles et eaux cristallines, tandis que l'intérieur cache des parcs naturels spectaculaires. Idéal pour combiner bateau, baignade et randonnée.",
    "L'empereur romain Dioclétien fait bâtir son palais à Split, où vivent encore des habitants. Dubrovnik, alors appelée Raguse, est pendant des siècles une république marchande prospère. Après avoir fait partie de la Yougoslavie, la Croatie devient indépendante en 1991.",
    ["Dubrovnik", "Split et le palais de Dioclétien", "Les lacs de Plitvice", "Les îles de Hvar et Korčula", "L'Istrie"]),

  c("IS", "Islande", "Europe", "Reykjavik", "Islandais", "ISK", "Juin à août (aurores : septembre à mars)", 3, ["nature", "aventure", "montagne"],
    "Volcans, glaciers, geysers et aurores boréales.",
    "L'Islande est une terre brute façonnée par le feu et la glace. La route circulaire fait le tour de l'île et passe par des cascades, des plages de sable noir et des lagunes glaciaires.",
    "L'île est colonisée par des Scandinaves à partir de la fin du IXe siècle. L'Althing, fondé en 930, est l'une des plus anciennes assemblées parlementaires au monde. Longtemps sous domination norvégienne puis danoise, l'Islande devient une république indépendante en 1944.",
    ["Le Cercle d'or", "Les cascades de la côte sud", "La lagune glaciaire de Jökulsárlón", "Les fjords de l'Ouest", "Les aurores boréales en hiver"]),

  c("NO", "Norvège", "Europe", "Oslo", "Norvégien", "NOK", "Juin à août", 3, ["nature", "montagne", "aventure"],
    "Fjords vertigineux, soleil de minuit et villages de pêcheurs.",
    "La Norvège est l'une des plus belles destinations nature d'Europe. Ses fjords, ses îles et ses routes panoramiques se prêtent à de grands road trips, en été comme en hiver pour les aurores.",
    "Les Vikings partent de ces côtes entre le VIIIe et le XIe siècle. Le pays est ensuite uni pendant des siècles au Danemark, puis à la Suède, avant de devenir pleinement indépendant en 1905. La découverte du pétrole en mer du Nord en fait l'un des pays les plus riches du monde.",
    ["Le Geirangerfjord", "Les îles Lofoten", "Bergen", "Tromsø et les aurores", "La route de l'Atlantique"]),

  c("IE", "Irlande", "Europe", "Dublin", "Anglais et irlandais", "EUR", "Mai à septembre", 3, ["nature", "culture"],
    "Falaises sauvages, pubs chaleureux et verts à perte de vue.",
    "L'Irlande séduit par ses paysages de côte découpée, ses petites routes et son ambiance conviviale. La Wild Atlantic Way, qui longe la côte ouest, est l'un des grands road trips d'Europe.",
    "Terre celte christianisée au Ve siècle, notamment par saint Patrick, l'île passe progressivement sous domination anglaise. La Grande Famine (1845-1852) provoque une émigration massive. Le sud de l'île obtient son indépendance en 1922, tandis que l'Irlande du Nord reste au Royaume-Uni.",
    ["Dublin", "Les falaises de Moher", "Le Connemara", "L'anneau du Kerry", "La Wild Atlantic Way"]),

  c("GB", "Royaume-Uni", "Europe", "Londres", "Anglais", "GBP", "Mai à septembre", 3, ["culture", "ville", "nature"],
    "Londres, les Highlands et la campagne anglaise.",
    "Le Royaume-Uni réunit l'Angleterre, l'Écosse, le pays de Galles et l'Irlande du Nord. On y passe des musées gratuits de Londres aux lochs écossais, en traversant des villages de carte postale.",
    "Après la conquête normande de 1066, l'Angleterre s'affirme comme royaume puissant, puis s'unit à l'Écosse en 1707. Berceau de la révolution industrielle, le pays bâtit au XIXe siècle le plus vaste empire colonial de l'histoire.",
    ["Londres", "Édimbourg", "Les Highlands et l'île de Skye", "Les Cotswolds", "Les Cornouailles"]),

  c("NL", "Pays-Bas", "Europe", "Amsterdam", "Néerlandais", "EUR", "Avril à septembre (tulipes en avril)", 3, ["ville", "culture"],
    "Canaux, vélos, moulins et champs de tulipes.",
    "Pays plat et compact, les Pays-Bas se découvrent facilement à vélo ou en train. Amsterdam est la star, mais Utrecht, Delft ou Rotterdam valent aussi le détour.",
    "Les provinces du Nord se soulèvent contre la couronne d'Espagne au XVIe siècle et forment une république. Au XVIIe siècle, le Siècle d'or, le pays domine le commerce mondial grâce à la Compagnie des Indes orientales et voit fleurir des peintres comme Rembrandt et Vermeer.",
    ["Amsterdam et ses canaux", "Les champs de tulipes de Keukenhof", "Les moulins de Kinderdijk", "Utrecht", "Rotterdam et son architecture"]),

  c("DE", "Allemagne", "Europe", "Berlin", "Allemand", "EUR", "Mai à septembre (marchés de Noël en décembre)", 2, ["ville", "culture", "nature"],
    "Villes créatives, châteaux de contes et forêts profondes.",
    "Entre la scène culturelle de Berlin, les châteaux bavarois et les vallées viticoles du Rhin, l'Allemagne surprend par sa variété. Son réseau routier et ferroviaire facilite les longs itinéraires.",
    "Longtemps divisé en multiples États du Saint-Empire, le pays voit naître la Réforme protestante avec Luther en 1517. L'Allemagne s'unifie en 1871. Après la Seconde Guerre mondiale, elle est coupée en deux, puis réunifiée en 1990, un an après la chute du mur de Berlin.",
    ["Berlin", "Munich et la Bavière", "Le château de Neuschwanstein", "La vallée du Rhin", "La Forêt-Noire"]),

  c("AT", "Autriche", "Europe", "Vienne", "Allemand", "EUR", "Mai à septembre, ski de décembre à mars", 3, ["montagne", "culture", "ville"],
    "Valses viennoises, lacs alpins et villages de montagne.",
    "L'Autriche associe l'élégance impériale de Vienne aux paysages alpins du Tyrol. Lacs, randonnées l'été et ski l'hiver en font une destination de toutes saisons.",
    "Pendant plus de six siècles, la dynastie des Habsbourg règne depuis Vienne sur un vaste empire au cœur de l'Europe. Mozart naît à Salzbourg en 1756. L'empire austro-hongrois disparaît en 1918, à la fin de la Première Guerre mondiale.",
    ["Vienne", "Salzbourg", "Hallstatt", "Le Tyrol et Innsbruck", "La vallée de la Wachau"]),

  c("CH", "Suisse", "Europe", "Berne", "Allemand, français, italien, romanche", "CHF", "Juin à septembre, ski de décembre à mars", 3, ["montagne", "nature", "aventure"],
    "Sommets enneigés, lacs limpides et trains panoramiques.",
    "La Suisse est un concentré de paysages alpins, desservis par l'un des meilleurs réseaux de transport du monde. Chère, mais d'une beauté rare.",
    "Selon la tradition, la Confédération naît en 1291 de l'alliance de trois cantons. Le pays devient un État fédéral en 1848 et cultive depuis longtemps sa neutralité. Il compte quatre langues nationales.",
    ["Zermatt et le Cervin", "Interlaken et la Jungfrau", "Lucerne", "Le lac Léman", "Le Glacier Express"]),

  c("CZ", "Tchéquie", "Europe", "Prague", "Tchèque", "CZK", "Mai à septembre, décembre", 2, ["ville", "culture"],
    "Ponts gothiques, châteaux et bières légendaires.",
    "Prague est l'une des plus belles villes d'Europe, mais le reste du pays mérite aussi le voyage, avec ses villes médiévales et ses stations thermales.",
    "Cœur du royaume de Bohême, la région passe sous l'autorité des Habsbourg au XVIe siècle. La Tchécoslovaquie naît en 1918. Le Printemps de Prague est écrasé en 1968, puis la révolution de Velours met fin au régime communiste en 1989. Le pays se sépare de la Slovaquie en 1993.",
    ["Prague", "Český Krumlov", "Kutná Hora", "Karlovy Vary", "La Moravie et ses vignobles"]),

  c("HU", "Hongrie", "Europe", "Budapest", "Hongrois", "HUF", "Avril à octobre", 1, ["ville", "culture", "gastronomie"],
    "Bains thermaux, Danube et vins de Tokaj.",
    "Budapest, coupée en deux par le Danube, est réputée pour ses bains et son architecture. Le lac Balaton et les régions viticoles complètent bien un séjour.",
    "Les Magyars s'installent dans la plaine du Danube à la fin du IXe siècle et Étienne Ier devient le premier roi de Hongrie vers l'an 1000. Le pays connaît la domination ottomane puis celle des Habsbourg. L'insurrection de 1956 contre le régime soviétique reste un moment fort de son histoire.",
    ["Budapest et ses bains", "Le lac Balaton", "Eger", "Tokaj", "Pécs"]),

  c("AL", "Albanie", "Europe", "Tirana", "Albanais", "ALL", "Mai, juin et septembre", 1, ["plage", "montagne", "culture", "aventure"],
    "La riviera méconnue des Balkans, entre mer et montagnes.",
    "Longtemps fermée au monde, l'Albanie dévoile aujourd'hui des plages turquoise, des villes ottomanes classées et des montagnes sauvages, à des prix encore doux.",
    "Terre des Illyriens dans l'Antiquité, la région résiste aux Ottomans au XVe siècle sous la conduite de Skanderbeg, héros national. Indépendante depuis 1912, l'Albanie vit ensuite des décennies d'isolement sous le régime communiste d'Enver Hoxha, avant de s'ouvrir au début des années 1990.",
    ["La riviera albanaise et Ksamil", "Berat, la ville aux mille fenêtres", "Gjirokastër", "Les Alpes albanaises et Theth", "Le site antique de Butrint"]),

  c("ME", "Monténégro", "Europe", "Podgorica", "Monténégrin", "EUR", "Mai à septembre", 2, ["plage", "montagne", "nature"],
    "Un fjord sur l'Adriatique et des montagnes spectaculaires.",
    "Malgré sa petite taille, le Monténégro offre un littoral superbe et un intérieur montagneux, avec des parcs nationaux à quelques heures de route seulement.",
    "Longtemps principauté indépendante dans les montagnes, le Monténégro fait ensuite partie de la Yougoslavie, puis d'une union avec la Serbie. Il devient indépendant à la suite d'un référendum en 2006.",
    ["Les bouches de Kotor", "Budva", "Le parc national du Durmitor", "Le lac de Skadar", "Le monastère d'Ostrog"]),

  c("TR", "Turquie", "Europe", "Ankara", "Turc", "TRY", "Avril à juin, septembre et octobre", 1, ["culture", "plage", "gastronomie", "ville"],
    "Entre Europe et Asie, bazars, mosquées et cheminées de fées.",
    "La Turquie offre une incroyable densité d'expériences : la ville monde d'Istanbul, les paysages lunaires de Cappadoce, les sites antiques et la côte turquoise.",
    "Constantinople, fondée sur l'antique Byzance, est la capitale de l'Empire byzantin pendant plus de mille ans. Elle est prise en 1453 par les Ottomans, dont l'empire domine une grande partie de la Méditerranée. Mustafa Kemal Atatürk proclame la République de Turquie en 1923.",
    ["Istanbul", "La Cappadoce", "Pamukkale", "Le site antique d'Éphèse", "La côte lycienne"]),

  // ---------- Afrique ----------
  c("MA", "Maroc", "Afrique", "Rabat", "Arabe et amazighe (français très répandu)", "MAD", "Mars à mai, septembre à novembre", 1, ["culture", "desert", "montagne", "gastronomie"],
    "Médinas colorées, montagnes de l'Atlas et dunes du Sahara.",
    "Proche et dépaysant, le Maroc mêle villes impériales, villages berbères, désert et côte atlantique. Un road trip permet de passer des souks aux grands espaces en quelques heures.",
    "Plusieurs dynasties se succèdent, dont les Almoravides et les Almohades qui règnent jusqu'en Andalousie. Le pays devient un protectorat français et espagnol en 1912, puis retrouve son indépendance en 1956.",
    ["Marrakech", "Fès et sa médina", "Le désert de Merzouga", "Chefchaouen, la ville bleue", "Essaouira"]),

  c("EG", "Égypte", "Afrique", "Le Caire", "Arabe", "EGP", "Octobre à avril", 1, ["culture", "desert", "plage"],
    "Pyramides, temples pharaoniques et croisière sur le Nil.",
    "L'Égypte abrite certains des monuments les plus célèbres de l'humanité. On combine souvent les sites du Caire, une croisière entre Louxor et Assouan, puis la mer Rouge.",
    "Une civilisation pharaonique se développe le long du Nil dès environ 3000 av. J.-C., bâtissant pyramides et temples. Le pays est ensuite gouverné par les Ptolémées, Rome, puis conquis par les Arabes au VIIe siècle. Le canal de Suez est inauguré en 1869.",
    ["Les pyramides de Gizeh", "Louxor et la vallée des Rois", "Une croisière sur le Nil", "Abou Simbel", "La mer Rouge"]),

  c("TN", "Tunisie", "Afrique", "Tunis", "Arabe (français très répandu)", "TND", "Avril à juin, septembre et octobre", 1, ["plage", "culture", "desert"],
    "Médinas, sites romains et oasis aux portes du Sahara.",
    "La Tunisie offre en peu de distance une grande variété : plages, villages blancs et bleus, amphithéâtres romains et paysages sahariens.",
    "Carthage, fondée par les Phéniciens, devient une grande puissance rivale de Rome avant d'être détruite en 146 av. J.-C. La région est ensuite romaine puis arabe. Protectorat français à partir de 1881, la Tunisie devient indépendante en 1956.",
    ["Sidi Bou Saïd", "Les ruines de Carthage", "L'amphithéâtre d'El Jem", "Djerba", "Tozeur et les oasis"]),

  c("ZA", "Afrique du Sud", "Afrique", "Pretoria (exécutif) et Le Cap (législatif)", "Plusieurs langues officielles, dont l'anglais, le zoulou et l'afrikaans", "ZAR", "Septembre à avril (safari : mai à septembre)", 2, ["faune", "nature", "plage", "gastronomie"],
    "Safaris, vignobles et routes côtières à couper le souffle.",
    "L'Afrique du Sud permet de combiner safari, villes cosmopolites, vignobles et l'une des plus belles routes côtières du monde. Une destination parfaite pour un road trip.",
    "Les Néerlandais fondent une escale au Cap en 1652, avant l'arrivée des Britanniques. De 1948 au début des années 1990, le pays vit sous l'apartheid, un régime de ségrégation raciale. Nelson Mandela devient président en 1994, lors des premières élections démocratiques ouvertes à tous.",
    ["Le Cap et la montagne de la Table", "La route des Jardins", "Le parc Kruger", "Les vignobles de Stellenbosch", "Le cap de Bonne-Espérance"]),

  c("KE", "Kenya", "Afrique", "Nairobi", "Swahili et anglais", "KES", "Juillet à octobre, janvier et février", 2, ["faune", "nature", "plage"],
    "La grande migration et les plaines de la savane.",
    "Le Kenya est l'une des destinations de safari les plus réputées, avec ses grandes réserves et la vue sur le Kilimandjaro. La côte swahilie apporte une touche balnéaire.",
    "Les villes de la côte, comme Mombasa et Lamu, prospèrent grâce au commerce dans l'océan Indien. Le Kenya devient une colonie britannique, puis obtient son indépendance en 1963.",
    ["La réserve du Masai Mara", "Le parc d'Amboseli", "Le lac Nakuru", "L'île de Lamu", "La plage de Diani"]),

  c("TZ", "Tanzanie", "Afrique", "Dodoma", "Swahili et anglais", "TZS", "Juin à octobre", 2, ["faune", "nature", "plage", "aventure"],
    "Serengeti, Kilimandjaro et plages de Zanzibar.",
    "La Tanzanie offre des safaris exceptionnels, le plus haut sommet d'Afrique et les plages de sable blanc de Zanzibar : un trio rare dans un seul pays.",
    "Zanzibar est pendant des siècles un grand centre du commerce de l'océan Indien, gouverné par un sultanat. Le Tanganyika obtient son indépendance en 1961 et s'unit à Zanzibar en 1964 pour former la Tanzanie.",
    ["Le parc du Serengeti", "Le cratère du Ngorongoro", "Le Kilimandjaro", "Zanzibar et Stone Town", "Le parc du Tarangire"]),

  c("SN", "Sénégal", "Afrique", "Dakar", "Français (wolof très parlé)", "XOF", "Novembre à mai", 1, ["culture", "plage", "nature"],
    "La teranga sénégalaise, entre fleuve, delta et océan.",
    "Le Sénégal est réputé pour son hospitalité, la teranga. Dakar est animée, et l'on peut découvrir des îles, des mangroves et des villes coloniales en quelques jours.",
    "Le territoire voit se succéder plusieurs royaumes, dont l'empire du Djolof. L'île de Gorée rappelle le rôle tragique de la côte dans la traite atlantique. Colonie française, le Sénégal devient indépendant en 1960, avec Léopold Sédar Senghor comme premier président.",
    ["Dakar et l'île de Gorée", "Saint-Louis", "Le delta du Sine-Saloum", "La Casamance", "Le lac Rose"]),

  c("MG", "Madagascar", "Afrique", "Antananarivo", "Malgache et français", "MGA", "Avril à novembre", 1, ["nature", "faune", "aventure", "plage"],
    "Baobabs, lémuriens et paysages qu'on ne voit nulle part ailleurs.",
    "Isolée depuis des millions d'années, Madagascar abrite une faune et une flore uniques au monde. Les distances sont longues, mais les paysages valent chaque kilomètre.",
    "L'île est peuplée par des navigateurs venus d'Asie du Sud-Est puis par des populations d'Afrique de l'Est. Au XIXe siècle, le royaume merina unifie une grande partie de l'île. Colonie française à partir de 1896, Madagascar devient indépendante en 1960.",
    ["L'allée des Baobabs", "Les Tsingy de Bemaraha", "Le parc de l'Isalo", "Nosy Be", "Les lémuriens d'Andasibe"]),

  c("CV", "Cap-Vert", "Afrique", "Praia", "Portugais (créole capverdien)", "CVE", "Toute l'année", 2, ["plage", "montagne", "culture"],
    "Des îles volcaniques au rythme de la morna.",
    "Chaque île du Cap-Vert a son caractère : plages de sable blanc, sentiers de randonnée vertigineux ou volcan encore actif. La musique y est partout.",
    "L'archipel, inhabité, est découvert par des navigateurs portugais au XVe siècle et devient une escale importante de l'Atlantique, notamment pour la traite. Le pays devient indépendant en 1975. La chanteuse Cesária Évora a fait connaître la morna dans le monde entier.",
    ["Les randonnées de Santo Antão", "Mindelo sur São Vicente", "Le volcan de Fogo", "Les plages de Boa Vista", "Sal"]),

  c("NA", "Namibie", "Afrique", "Windhoek", "Anglais", "NAD", "Mai à octobre", 2, ["desert", "faune", "aventure", "nature"],
    "Dunes rouges, déserts infinis et safaris en liberté.",
    "La Namibie est le pays du road trip par excellence : routes de piste, grands espaces vides, dunes géantes et animaux sauvages au bord des points d'eau.",
    "Colonie allemande à partir de 1884, le territoire est ensuite administré par l'Afrique du Sud. Après une longue lutte, la Namibie devient indépendante en 1990.",
    ["Les dunes de Sossusvlei", "Le parc d'Etosha", "La Skeleton Coast", "Swakopmund", "Le Damaraland"]),

  // ---------- Moyen-Orient ----------
  c("JO", "Jordanie", "Moyen-Orient", "Amman", "Arabe", "JOD", "Mars à mai, septembre à novembre", 2, ["culture", "desert", "aventure"],
    "Pétra, le Wadi Rum et la mer Morte.",
    "La Jordanie concentre des sites exceptionnels sur un petit territoire : une cité taillée dans la roche, un désert de cinéma et la mer la plus salée du monde.",
    "Les Nabatéens font de Pétra une grande cité caravanière il y a plus de deux mille ans. La région devient ensuite romaine, comme en témoigne Jerash. Le royaume de Jordanie devient indépendant en 1946.",
    ["Pétra", "Le désert du Wadi Rum", "La mer Morte", "Jerash", "Aqaba et la mer Rouge"]),

  c("AE", "Émirats arabes unis", "Moyen-Orient", "Abou Dabi", "Arabe", "AED", "Novembre à mars", 3, ["ville", "desert", "plage"],
    "Gratte-ciel record, désert doré et plages chaudes en hiver.",
    "Dubaï et Abou Dabi offrent une architecture spectaculaire, des musées ambitieux et le désert à quelques minutes. Une escale idéale entre l'Europe et l'Asie.",
    "Les émirats vivent longtemps de la pêche et de la récolte des perles. Ils forment une fédération en 1971 et connaissent ensuite un développement très rapide grâce au pétrole puis au tourisme et au commerce.",
    ["Dubaï et le Burj Khalifa", "La grande mosquée Cheikh Zayed", "Le Louvre Abu Dhabi", "Une nuit dans le désert", "Le vieux Dubaï et ses souks"]),

  c("OM", "Oman", "Moyen-Orient", "Mascate", "Arabe", "OMR", "Octobre à avril", 2, ["desert", "nature", "culture", "aventure"],
    "Forts, wadis turquoise et dunes, loin des foules.",
    "Oman est une destination authentique et sûre, parfaite pour un road trip : canyons, oasis, montagnes, plages et désert se succèdent.",
    "Grande puissance maritime, Oman contrôle au XIXe siècle une partie de la côte est-africaine, dont Zanzibar. Le pays se modernise profondément à partir de 1970 sous le règne du sultan Qabus.",
    ["Mascate", "Nizwa et son fort", "Le désert des Wahiba", "Le Wadi Shab", "Les fjords du Musandam"]),

  // ---------- Asie ----------
  c("JP", "Japon", "Asie", "Tokyo", "Japonais", "JPY", "Mars à mai, octobre et novembre", 3, ["culture", "ville", "gastronomie", "nature"],
    "Temples zen, mégalopoles futuristes et cerisiers en fleurs.",
    "Le Japon fascine par le contraste entre traditions millénaires et modernité. Les trains rapides permettent de passer facilement de Tokyo aux temples de Kyoto ou aux montagnes.",
    "Kyoto devient capitale impériale en 794 et le reste plus de mille ans. Les shoguns gouvernent ensuite le pays, qui se ferme presque totalement aux étrangers pendant plus de deux siècles. À partir de l'ère Meiji, en 1868, le Japon se modernise à grande vitesse.",
    ["Tokyo", "Kyoto et ses temples", "Nara et Osaka", "Hiroshima et Miyajima", "Les Alpes japonaises"]),

  c("TH", "Thaïlande", "Asie", "Bangkok", "Thaï", "THB", "Novembre à mars", 1, ["plage", "culture", "gastronomie", "nature"],
    "Temples dorés, street food et îles paradisiaques.",
    "La Thaïlande est une destination facile et variée : effervescence de Bangkok, temples du nord, jungle et îles aux eaux turquoise. Sa cuisine de rue est légendaire.",
    "Les royaumes de Sukhothaï puis d'Ayutthaya dominent la région du XIIIe au XVIIIe siècle. Fait rare en Asie du Sud-Est, la Thaïlande, autrefois appelée Siam, n'a jamais été colonisée. Elle devient une monarchie constitutionnelle en 1932.",
    ["Bangkok", "Chiang Mai", "Ayutthaya", "Krabi et la mer d'Andaman", "Les îles du golfe"]),

  c("VN", "Vietnam", "Asie", "Hanoï", "Vietnamien", "VND", "Février à avril (selon les régions)", 1, ["nature", "culture", "gastronomie", "plage"],
    "Baie d'Halong, rizières en terrasses et soupe pho.",
    "Le Vietnam s'étire sur plus de 1 500 km du nord au sud, avec des climats et des paysages très différents. On le parcourt souvent du nord au sud, en train, en bus ou à moto.",
    "Le pays vit près de mille ans sous domination chinoise avant de s'en libérer au Xe siècle. Colonie française au XIXe siècle, il traverse ensuite les guerres d'Indochine puis du Vietnam. Le pays est réunifié en 1976.",
    ["La baie d'Halong", "Hoi An", "Hué", "Hô Chi Minh-Ville", "Les rizières de Sapa"]),

  c("ID", "Indonésie", "Asie", "Jakarta", "Indonésien", "IDR", "Mai à septembre", 1, ["plage", "nature", "culture", "aventure"],
    "Volcans, rizières et plus de 17 000 îles.",
    "L'Indonésie est le plus grand archipel du monde. Bali est la plus connue, mais Java, Lombok, Komodo ou Raja Ampat offrent des paysages tout aussi spectaculaires.",
    "Des royaumes hindous et bouddhistes s'y développent, laissant des temples comme Borobudur. L'islam se diffuse ensuite dans une grande partie de l'archipel. Colonie néerlandaise, l'Indonésie proclame son indépendance en 1945.",
    ["Bali et ses rizières", "Le temple de Borobudur", "Le volcan Bromo", "Les îles Gili et Lombok", "Le parc de Komodo"]),

  c("IN", "Inde", "Asie", "New Delhi", "Hindi et anglais (et de nombreuses langues régionales)", "INR", "Octobre à mars", 1, ["culture", "gastronomie", "aventure"],
    "Palais du Rajasthan, Taj Mahal et backwaters du Kerala.",
    "L'Inde est un pays-continent, intense et fascinant. Chaque région a sa langue, sa cuisine et ses traditions : mieux vaut en choisir une ou deux pour un premier voyage.",
    "Une des plus anciennes civilisations urbaines se développe dans la vallée de l'Indus. L'Empire moghol, qui fait bâtir le Taj Mahal au XVIIe siècle, domine ensuite une grande partie du sous-continent. Sous domination britannique, l'Inde obtient son indépendance en 1947.",
    ["Le Taj Mahal à Agra", "Jaipur et le Rajasthan", "Varanasi", "Les backwaters du Kerala", "Goa"]),

  c("LK", "Sri Lanka", "Asie", "Sri Jayawardenepura Kotte (Colombo, capitale économique)", "Cingalais et tamoul", "LKR", "Décembre à avril (côte sud-ouest)", 1, ["nature", "culture", "plage", "faune"],
    "Plantations de thé, éléphants et temples bouddhistes.",
    "Le Sri Lanka concentre sur une petite île des sites anciens, des montagnes couvertes de thé, des parcs animaliers et de belles plages. Le train dans les hauts plateaux est mythique.",
    "Anuradhapura, capitale de royaumes bouddhistes pendant plus d'un millénaire, en témoigne encore. L'île, appelée Ceylan, est successivement contrôlée par les Portugais, les Néerlandais puis les Britanniques. Elle devient indépendante en 1948.",
    ["Le rocher de Sigiriya", "Kandy et le temple de la Dent", "Ella et les plantations de thé", "Galle", "Le parc de Yala"]),

  c("KR", "Corée du Sud", "Asie", "Séoul", "Coréen", "KRW", "Avril, mai, septembre à novembre", 2, ["ville", "culture", "gastronomie"],
    "K-culture, palais royaux et cuisine épicée.",
    "La Corée du Sud combine des villes ultra-modernes, des palais anciens et des montagnes accessibles. Sa culture populaire et sa cuisine attirent de plus en plus de voyageurs.",
    "La dynastie Joseon règne de 1392 à la fin du XIXe siècle. La péninsule est occupée par le Japon de 1910 à 1945, puis divisée. Après la guerre de Corée (1950-1953), le Sud connaît un développement économique spectaculaire.",
    ["Séoul et ses palais", "Busan", "Gyeongju", "L'île de Jeju", "Le parc de Seoraksan"]),

  c("KH", "Cambodge", "Asie", "Phnom Penh", "Khmer", "KHR", "Novembre à mars", 1, ["culture", "nature"],
    "Les temples d'Angkor et la douceur khmère.",
    "Le Cambodge est surtout connu pour Angkor, l'un des plus grands sites archéologiques du monde. Le reste du pays offre des villes paisibles, la campagne et le littoral.",
    "L'Empire khmer domine une grande partie de l'Asie du Sud-Est du IXe au XVe siècle et bâtit les temples d'Angkor. Protectorat français à partir de 1863, le pays devient indépendant en 1953. Le régime des Khmers rouges (1975-1979) a fait un très grand nombre de victimes.",
    ["Les temples d'Angkor", "Phnom Penh", "Battambang", "Kampot et Kep", "Le lac Tonlé Sap"]),

  c("PH", "Philippines", "Asie", "Manille", "Filipino et anglais", "PHP", "Décembre à mai", 1, ["plage", "nature", "aventure"],
    "Lagons turquoise, rizières et plongée exceptionnelle.",
    "Avec plus de 7 000 îles, les Philippines sont un paradis pour les amateurs de plages, de plongée et d'island hopping. Les habitants sont réputés pour leur accueil.",
    "Colonie espagnole de 1565 à 1898, l'archipel passe ensuite sous contrôle américain. Le pays devient indépendant en 1946. Le catholicisme, hérité de la période espagnole, y est très présent.",
    ["El Nido et Coron à Palawan", "Bohol et ses collines de chocolat", "Siargao", "Les rizières de Banaue", "Cebu"]),

  c("NP", "Népal", "Asie", "Katmandou", "Népalais", "NPR", "Octobre, novembre, mars et avril", 1, ["montagne", "aventure", "culture"],
    "Le toit du monde et les plus beaux treks de la planète.",
    "Le Népal abrite huit des dix plus hauts sommets du monde, dont l'Everest. On y vient pour les treks, mais aussi pour les temples de la vallée de Katmandou.",
    "La vallée de Katmandou est longtemps partagée entre plusieurs royaumes newars, réputés pour leur architecture. Le pays est unifié au XVIIIe siècle. La monarchie est abolie en 2008. Lumbini, au sud, est considéré comme le lieu de naissance du Bouddha.",
    ["Katmandou et sa vallée", "Le trek des Annapurnas", "Le camp de base de l'Everest", "Pokhara", "Le parc de Chitwan"]),

  c("CN", "Chine", "Asie", "Pékin", "Mandarin", "CNY", "Avril, mai, septembre et octobre", 2, ["culture", "ville", "nature"],
    "Grande Muraille, montagnes karstiques et mégapoles.",
    "La Chine est immense et très variée. Pékin et Xi'an racontent son histoire impériale, Shanghai incarne sa modernité, et les paysages du sud sont spectaculaires.",
    "Des dynasties successives gouvernent la Chine pendant plus de deux mille ans, et la Grande Muraille est édifiée et reconstruite au fil des siècles. L'empire prend fin en 1912. La République populaire de Chine est proclamée en 1949.",
    ["Pékin et la Grande Muraille", "L'armée de terre cuite de Xi'an", "Guilin et Yangshuo", "Shanghai", "Zhangjiajie"]),

  c("MY", "Malaisie", "Asie", "Kuala Lumpur", "Malais", "MYR", "Toute l'année (selon la côte)", 1, ["nature", "gastronomie", "plage", "faune"],
    "Jungle de Bornéo, street food et tours futuristes.",
    "La Malaisie mêle cultures malaise, chinoise et indienne, ce qui se ressent dans sa cuisine. On y passe de la ville moderne à la jungle et aux îles.",
    "Le sultanat de Malacca est un grand port de commerce au XVe siècle. La ville est ensuite prise par les Portugais, les Néerlandais puis les Britanniques. La Malaisie devient indépendante en 1957.",
    ["Kuala Lumpur", "George Town à Penang", "Malacca", "Bornéo et les orangs-outans", "Les îles Perhentian"]),

  // ---------- Amériques ----------
  c("BR", "Brésil", "Amériques", "Brasília", "Portugais", "BRL", "Septembre à mars (selon les régions)", 2, ["plage", "nature", "culture", "faune"],
    "Rio, l'Amazonie, les chutes d'Iguaçu et des plages sans fin.",
    "Le Brésil est un pays-continent à l'énergie contagieuse. Ses villes, ses forêts, ses plages et sa musique offrent de quoi revenir encore et encore.",
    "Les Portugais arrivent sur ces côtes en 1500. Le Brésil devient indépendant en 1822 sous la forme d'un empire, abolit l'esclavage en 1888, puis devient une république en 1889. Sa population, très métissée, est le fruit d'origines autochtones, européennes et africaines.",
    ["Rio de Janeiro", "Les chutes d'Iguaçu", "L'Amazonie", "Salvador de Bahia", "Les Lençóis Maranhenses"]),

  c("AR", "Argentine", "Amériques", "Buenos Aires", "Espagnol", "ARS", "Octobre à avril (Patagonie : novembre à mars)", 2, ["nature", "montagne", "gastronomie", "aventure"],
    "Tango, glaciers de Patagonie et vins de Mendoza.",
    "De Buenos Aires aux glaciers du sud en passant par les vignobles des Andes, l'Argentine offre des distances immenses et des paysages grandioses.",
    "La région fait partie de l'empire espagnol avant de proclamer son indépendance en 1816. À la fin du XIXe et au début du XXe siècle, elle accueille des millions d'immigrants européens, notamment italiens et espagnols.",
    ["Buenos Aires", "Le glacier Perito Moreno", "El Chaltén et le Fitz Roy", "Les chutes d'Iguazú", "Mendoza et Salta"]),

  c("CL", "Chili", "Amériques", "Santiago", "Espagnol", "CLP", "Octobre à avril", 2, ["desert", "montagne", "nature", "aventure"],
    "Du désert le plus sec du monde aux glaciers de Patagonie.",
    "Étiré sur plus de 4 000 km, le Chili offre une variété de paysages unique : déserts, volcans, lacs, fjords et glaciers.",
    "Le nord du territoire fait partie de l'empire inca avant la conquête espagnole. Le Chili devient indépendant en 1818. Le pays connaît la dictature du général Pinochet de 1973 à 1990.",
    ["Le désert d'Atacama", "Torres del Paine", "Valparaíso", "L'île de Pâques", "L'île de Chiloé"]),

  c("PE", "Pérou", "Amériques", "Lima", "Espagnol et quechua", "PEN", "Mai à septembre", 1, ["culture", "montagne", "gastronomie", "aventure"],
    "Machu Picchu, héritage inca et cuisine réputée.",
    "Le Pérou attire pour ses sites incas, mais séduit aussi par ses montagnes, ses marchés colorés et sa gastronomie, parmi les plus réputées d'Amérique latine.",
    "L'empire inca, centré sur Cuzco, devient au XVe siècle le plus grand État de l'Amérique précolombienne. Il est conquis par les Espagnols à partir de 1532. Le Pérou proclame son indépendance en 1821.",
    ["Le Machu Picchu", "Cuzco et la Vallée sacrée", "Le lac Titicaca", "Le canyon de Colca", "Lima"]),

  c("BO", "Bolivie", "Amériques", "Sucre (La Paz, siège du gouvernement)", "Espagnol, quechua, aymara (et d'autres langues)", "BOB", "Mai à octobre", 1, ["desert", "montagne", "aventure", "culture"],
    "Le salar d'Uyuni et les hauts plateaux andins.",
    "La Bolivie offre certains des paysages les plus irréels d'Amérique du Sud, entre déserts de sel, lagunes colorées et villes perchées en altitude.",
    "La civilisation de Tiwanaku se développe près du lac Titicaca bien avant les Incas. À l'époque coloniale, les mines d'argent de Potosí enrichissent l'empire espagnol. Le pays devient indépendant en 1825 et prend le nom de Simón Bolívar.",
    ["Le salar d'Uyuni", "La Paz", "Le lac Titicaca", "Potosí", "Sucre"]),

  c("CO", "Colombie", "Amériques", "Bogotá", "Espagnol", "COP", "Décembre à mars", 1, ["culture", "plage", "nature"],
    "Villes colorées, café et côte caraïbe.",
    "La Colombie séduit par la chaleur de ses habitants, ses villes coloniales, ses plantations de café et ses deux côtes, Pacifique et Caraïbe.",
    "Les Muiscas, à l'origine de la légende de l'El Dorado, vivent sur les hauts plateaux. Le territoire devient la vice-royauté de Nouvelle-Grenade, puis gagne son indépendance en 1819 avec Simón Bolívar. Un accord de paix est signé en 2016 avec la principale guérilla.",
    ["Carthagène des Indes", "Medellín", "La région du café", "Le parc Tayrona", "Bogotá"]),

  c("MX", "Mexique", "Amériques", "Mexico", "Espagnol", "MXN", "Novembre à avril", 1, ["culture", "plage", "gastronomie"],
    "Pyramides mayas, cénotes et cuisine inscrite au patrimoine.",
    "Le Mexique offre une richesse culturelle immense, des plages des Caraïbes et une gastronomie reconnue par l'UNESCO. Le Yucatán se prête particulièrement bien au road trip.",
    "Les Mayas puis les Aztèques bâtissent de grandes civilisations. Tenochtitlan, la capitale aztèque, est conquise par les Espagnols en 1521. Le Mexique devient indépendant en 1821, puis vit une révolution à partir de 1910.",
    ["Mexico", "Chichén Itzá et le Yucatán", "Les cénotes", "Oaxaca", "Tulum"]),

  c("CU", "Cuba", "Amériques", "La Havane", "Espagnol", "CUP", "Novembre à avril", 2, ["culture", "plage"],
    "Voitures anciennes, salsa et plages des Caraïbes.",
    "Cuba fascine par son atmosphère hors du temps, sa musique et ses villes coloniales colorées. Prévoyez de la flexibilité : les infrastructures sont limitées.",
    "Colonie espagnole pendant près de quatre siècles, Cuba devient indépendante au début du XXe siècle. La révolution de 1959, menée par Fidel Castro, instaure un régime socialiste.",
    ["La Havane", "Trinidad", "La vallée de Viñales", "Cienfuegos", "Les plages de Varadero"]),

  c("CR", "Costa Rica", "Amériques", "San José", "Espagnol", "CRC", "Décembre à avril", 2, ["nature", "faune", "plage", "aventure"],
    "Volcans, forêts tropicales et biodiversité exceptionnelle.",
    "Le Costa Rica est un pionnier de l'écotourisme. Une grande partie de son territoire est protégée, et l'on y observe facilement paresseux, singes et oiseaux tropicaux.",
    "Le pays devient indépendant de l'Espagne en 1821. En 1948, il abolit son armée, un choix rare dans le monde. Il investit ensuite beaucoup dans l'éducation et la protection de la nature.",
    ["Le volcan Arenal", "La forêt de nuages de Monteverde", "Le parc Manuel Antonio", "Tortuguero", "Le parc du Corcovado"]),

  c("US", "États-Unis", "Amériques", "Washington", "Anglais", "USD", "Variable selon les régions", 3, ["nature", "ville", "aventure", "desert"],
    "Grands parcs nationaux, routes mythiques et villes iconiques.",
    "Les États-Unis sont la terre du road trip : Route 66, côte Pacifique, canyons de l'Ouest. Les villes comme New York ou La Nouvelle-Orléans ont chacune leur personnalité.",
    "Des peuples autochtones vivent sur ce territoire depuis des millénaires avant l'arrivée des Européens. Les treize colonies britanniques déclarent leur indépendance en 1776. La guerre de Sécession (1861-1865) aboutit à l'abolition de l'esclavage.",
    ["New York", "Le Grand Canyon", "Le parc de Yosemite", "La côte californienne", "La Nouvelle-Orléans"]),

  c("CA", "Canada", "Amériques", "Ottawa", "Anglais et français", "CAD", "Juin à octobre", 3, ["nature", "montagne", "faune", "aventure"],
    "Lacs turquoise des Rocheuses et charme du Québec.",
    "Le Canada est immense et sauvage. On peut y combiner villes accueillantes, montagnes, lacs et observation de la faune, en français au Québec.",
    "Les Premières Nations occupent le territoire bien avant l'arrivée des Européens. Samuel de Champlain fonde Québec en 1608, au cœur de la Nouvelle-France. Le Canada naît en tant que confédération en 1867.",
    ["Les Rocheuses (Banff et Jasper)", "Québec", "Montréal", "Vancouver et l'île de Vancouver", "Les couleurs de l'automne"]),

  c("GT", "Guatemala", "Amériques", "Guatemala", "Espagnol (et langues mayas)", "GTQ", "Novembre à avril", 1, ["culture", "nature", "aventure"],
    "Volcans, lacs et cités mayas dans la jungle.",
    "Le Guatemala est un concentré d'Amérique centrale : marchés indigènes, ville coloniale, lac entouré de volcans et grands sites mayas.",
    "Tikal est l'une des plus grandes cités de la civilisation maya. La région est conquise par les Espagnols au XVIe siècle et devient indépendante en 1821. Une longue guerre civile prend fin en 1996.",
    ["Antigua", "Le lac Atitlán", "Le site maya de Tikal", "Semuc Champey", "Le marché de Chichicastenango"]),

  // ---------- Océanie ----------
  c("AU", "Australie", "Océanie", "Canberra", "Anglais", "AUD", "Septembre à novembre, mars à mai", 3, ["nature", "plage", "faune", "aventure"],
    "Récifs, outback rouge et plages de surf.",
    "L'Australie est faite pour les longs road trips en van : côtes immenses, déserts, forêts tropicales et une faune unique.",
    "Les peuples aborigènes vivent sur le continent depuis des dizaines de milliers d'années. Les Britanniques y fondent une colonie en 1788. Les colonies s'unissent en 1901 pour former l'Australie.",
    ["Sydney", "La Grande Barrière de corail", "Uluru", "La Great Ocean Road", "La Tasmanie"]),

  c("NZ", "Nouvelle-Zélande", "Océanie", "Wellington", "Anglais et maori", "NZD", "Décembre à mars", 3, ["nature", "montagne", "aventure"],
    "Fjords, volcans et paysages de cinéma.",
    "La Nouvelle-Zélande offre une densité exceptionnelle de paysages : fjords, glaciers, volcans et plages, idéale en van ou en camping-car.",
    "Les Maoris s'installent sur les îles vers le XIIIe siècle. En 1840, des chefs maoris et la couronne britannique signent le traité de Waitangi, texte fondateur du pays. La culture maorie reste très présente aujourd'hui.",
    ["Milford Sound", "Queenstown", "Le parc du Tongariro", "Rotorua", "La Bay of Islands"]),

  c("PF", "Polynésie française", "Océanie", "Papeete", "Français et tahitien", "XPF", "Mai à octobre", 3, ["plage", "nature"],
    "Lagons turquoise et îles du bout du monde.",
    "Bora Bora, Moorea, Tahiti : la Polynésie française incarne le rêve des mers du Sud. Une destination lointaine et chère, mais inoubliable.",
    "Les îles sont peuplées par des navigateurs polynésiens il y a plusieurs siècles. Les explorateurs européens y arrivent au XVIIIe siècle. La France y établit un protectorat en 1842. Le peintre Paul Gauguin y a passé ses dernières années.",
    ["Bora Bora", "Moorea", "Tahiti", "Rangiroa", "Les îles Marquises"]),
];

export const countryByCode = (code) => COUNTRIES.find((x) => x.code === code) || null;
export const wikiUrl = (country) => "https://fr.wikipedia.org/wiki/" + encodeURIComponent(country.name.replace(/ /g, "_"));
