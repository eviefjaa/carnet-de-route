// Fiches pays en anglais (anglais britannique), pour l'interface en anglais
//
// Même structure que countries.js : mêmes pays dans le même ordre, mêmes codes, continents (clés),
// monnaies, budgets et envies ; seuls les textes sont traduits. Chargé seulement quand l'interface
// est en anglais (js/views/explore.js) ; un pays ou un texte absent s'affiche en français.
// Contrôle : node scripts/i18n/check-countries.mjs (lancé par les tests unitaires).
// Pour ajouter un pays : l'ajouter d'abord dans countries.js, puis ici à la même place.

const c = (code, name, continent, capital, language, currency, best, budget, tags, tagline, description, history, highlights) =>
  ({ code, name, continent, capital, language, currency, best, budget, tags, tagline, description, history, highlights });

export const COUNTRIES = [
  // ---------- Europe ----------
  c("FR", "France", "Europe", "Paris", "French", "EUR", "May to September", 3, ["culture","gastronomie","montagne","plage","ville"],
    "Châteaux, villages, fine wines and astonishingly varied scenery.",
    "From the beaches of the Côte d'Azur to the peaks of the Alps, France packs in a rare variety of landscapes. Its food, vineyards and heritage make it one of the most visited countries in the world.",
    "Land of the Gauls and then a Roman province, the country took its name from the Franks in the early Middle Ages. The monarchy held sway for centuries until the Revolution of 1789, which left a lasting mark on Europe. The Fifth Republic was founded in 1958.",
    ["Paris and its museums","The Loire châteaux","Provence and its lavender fields","Mont-Saint-Michel","The Alps and Mont Blanc"]),

  c("ES", "Spain", "Europe", "Madrid", "Spanish (also Catalan, Basque, Galician)", "EUR", "April to June, September and October", 2, ["plage","culture","gastronomie","ville"],
    "Sunshine, tapas, flamenco and a Moorish heritage.",
    "Spain mixes lively cities, sunny coasts and the white villages of Andalusia. People live late, eat well, and every region has its own identity.",
    "For nearly eight centuries from 711, much of the peninsula was part of Al-Andalus, whose crowning jewel is the Alhambra in Granada. After 1492, Spain built a vast overseas empire. In the 20th century, the Civil War (1936-1939) led to Franco's dictatorship, and the country returned to democracy after 1975.",
    ["Barcelona and Gaudí's work","Seville and Andalusia","The Alhambra in Granada","Madrid and the Prado","The Balearic Islands"]),

  c("PT", "Portugal", "Europe", "Lisbon", "Portuguese", "EUR", "April to October", 2, ["plage","culture","gastronomie","ville"],
    "Azulejos, fado and golden cliffs facing the Atlantic.",
    "Small in size but rich in atmosphere, Portugal offers charming hillside cities, terraced vineyards and spectacular beaches. Welcoming and affordable, it is ideal for a road trip.",
    "Portugal is one of Europe's oldest nation states. In the 15th and 16th centuries its navigators opened the sea route to India (Vasco da Gama, 1498) and reached Brazil. The country emerged from dictatorship with the Carnation Revolution in 1974.",
    ["Lisbon and Belém","Porto and the Douro Valley","Sintra and its palaces","The Algarve cliffs","The Azores"]),

  c("IT", "Italy", "Europe", "Rome", "Italian", "EUR", "April to June, September and October", 3, ["culture","gastronomie","plage","ville"],
    "An open-air museum, and for many the best food in the world.",
    "From ancient Rome to Renaissance Florence, Italy is one of the cradles of European culture. Its coastline, lakes, Tuscan hills and regional cooking are perfect for a touring trip.",
    "For centuries Rome ruled an empire that stretched all around the Mediterranean. Split into rival cities and states, the peninsula saw the Renaissance born in 15th-century Florence. Italian unification was achieved in 1861 and the Republic was proclaimed in 1946.",
    ["Rome and the Vatican","Florence and Tuscany","Venice","The Amalfi Coast","Sicily"]),

  c("GR", "Greece", "Europe", "Athens", "Greek", "EUR", "May, June, September and October", 2, ["plage","culture","gastronomie"],
    "Blue-and-white islands, turquoise sea and ancient ruins.",
    "With thousands of islands and major archaeological sites, Greece combines lazy days with history. The Cyclades, Crete and the mainland each offer a different experience.",
    "Athens invented democracy in the 5th century BC, when the Parthenon was built. The region then came under the rule of Rome, Byzantium and the Ottoman Empire. The War of Independence began in 1821 and led to the creation of a modern Greek state.",
    ["The Acropolis of Athens","Santorini and the Cyclades","Crete","The Meteora monasteries","The Peloponnese"]),

  c("HR", "Croatia", "Europe", "Zagreb", "Croatian", "EUR", "May, June and September", 2, ["plage","nature","culture"],
    "Ramparts, coves and emerald lakes on the Adriatic.",
    "Croatia's coast is lined with walled towns, islands and crystal-clear waters, while the interior hides spectacular nature parks. Ideal for combining boat trips, swimming and hiking.",
    "The Roman emperor Diocletian built his palace in Split, where people still live today. Dubrovnik, then known as Ragusa, was for centuries a prosperous merchant republic. After being part of Yugoslavia, Croatia became independent in 1991.",
    ["Dubrovnik","Split and Diocletian's Palace","The Plitvice Lakes","The islands of Hvar and Korčula","Istria"]),

  c("IS", "Iceland", "Europe", "Reykjavik", "Icelandic", "ISK", "June to August (northern lights: September to March)", 3, ["nature","aventure","montagne"],
    "Volcanoes, glaciers, geysers and the northern lights.",
    "Iceland is a raw land shaped by fire and ice. The Ring Road circles the island, passing waterfalls, black-sand beaches and glacier lagoons.",
    "The island was settled by Scandinavians from the late 9th century. The Althing, founded in 930, is one of the oldest parliamentary assemblies in the world. Long under Norwegian and then Danish rule, Iceland became an independent republic in 1944.",
    ["The Golden Circle","The south coast waterfalls","Jökulsárlón glacier lagoon","The Westfjords","The northern lights in winter"]),

  c("NO", "Norway", "Europe", "Oslo", "Norwegian", "NOK", "June to August", 3, ["nature","montagne","aventure"],
    "Dizzying fjords, the midnight sun and fishing villages.",
    "Norway is one of Europe's finest destinations for nature. Its fjords, islands and scenic routes lend themselves to epic road trips, in summer, and in winter too for the northern lights.",
    "The Vikings set out from these shores between the 8th and 11th centuries. The country was then joined for centuries to Denmark, and later to Sweden, before becoming fully independent in 1905. The discovery of oil in the North Sea made it one of the richest countries in the world.",
    ["The Geirangerfjord","The Lofoten Islands","Bergen","Tromsø and the northern lights","The Atlantic Road"]),

  c("IE", "Ireland", "Europe", "Dublin", "English and Irish", "EUR", "May to September", 3, ["nature","culture"],
    "Wild cliffs, welcoming pubs and green as far as the eye can see.",
    "Ireland wins hearts with its rugged coastline, its little roads and its friendly atmosphere. The Wild Atlantic Way, which follows the west coast, is one of Europe's great road trips.",
    "A Celtic land converted to Christianity in the 5th century, notably by St Patrick, the island gradually came under English rule. The Great Famine (1845-1852) triggered mass emigration. The south of the island won independence in 1922, while Northern Ireland remained part of the United Kingdom.",
    ["Dublin","The Cliffs of Moher","Connemara","The Ring of Kerry","The Wild Atlantic Way"]),

  c("GB", "United Kingdom", "Europe", "London", "English", "GBP", "May to September", 3, ["culture","ville","nature"],
    "London, the Highlands and the English countryside.",
    "The United Kingdom brings together England, Scotland, Wales and Northern Ireland. You can go from London's free museums to the Scottish lochs, passing through picture-postcard villages on the way.",
    "After the Norman Conquest of 1066, England grew into a powerful kingdom, then united with Scotland in 1707. Birthplace of the Industrial Revolution, the country built the largest colonial empire in history in the 19th century.",
    ["London","Edinburgh","The Highlands and the Isle of Skye","The Cotswolds","Cornwall"]),

  c("NL", "Netherlands", "Europe", "Amsterdam", "Dutch", "EUR", "April to September (tulips in April)", 3, ["ville","culture"],
    "Canals, bikes, windmills and tulip fields.",
    "Flat and compact, the Netherlands is easy to explore by bike or train. Amsterdam is the star, but Utrecht, Delft and Rotterdam are well worth the detour too.",
    "The northern provinces rose up against the Spanish crown in the 16th century and formed a republic. In the 17th century, its Golden Age, the country dominated world trade through the East India Company and saw painters such as Rembrandt and Vermeer flourish.",
    ["Amsterdam and its canals","The Keukenhof tulip fields","The windmills of Kinderdijk","Utrecht","Rotterdam and its architecture"]),

  c("DE", "Germany", "Europe", "Berlin", "German", "EUR", "May to September (Christmas markets in December)", 2, ["ville","culture","nature"],
    "Creative cities, fairy-tale castles and deep forests.",
    "From Berlin's cultural scene to Bavarian castles and the wine valleys of the Rhine, Germany surprises with its variety. Its road and rail networks make long itineraries easy.",
    "Long divided into many states within the Holy Roman Empire, the country saw the birth of the Protestant Reformation with Luther in 1517. Germany was unified in 1871. After the Second World War it was split in two, then reunified in 1990, a year after the fall of the Berlin Wall.",
    ["Berlin","Munich and Bavaria","Neuschwanstein Castle","The Rhine Valley","The Black Forest"]),

  c("AT", "Austria", "Europe", "Vienna", "German", "EUR", "May to September, skiing December to March", 3, ["montagne","culture","ville"],
    "Viennese waltzes, Alpine lakes and mountain villages.",
    "Austria combines the imperial elegance of Vienna with the Alpine scenery of Tyrol. Lakes, summer hiking and winter skiing make it a destination for every season.",
    "For more than six centuries the Habsburg dynasty ruled a vast empire at the heart of Europe from Vienna. Mozart was born in Salzburg in 1756. The Austro-Hungarian Empire came to an end in 1918, at the close of the First World War.",
    ["Vienna","Salzburg","Hallstatt","Tyrol and Innsbruck","The Wachau Valley"]),

  c("CH", "Switzerland", "Europe", "Bern", "German, French, Italian, Romansh", "CHF", "June to September, skiing December to March", 3, ["montagne","nature","aventure"],
    "Snowy peaks, crystal-clear lakes and panoramic trains.",
    "Switzerland is Alpine scenery in concentrated form, served by one of the best transport networks in the world. Expensive, but uncommonly beautiful.",
    "According to tradition, the Confederation was born in 1291 from an alliance of three cantons. The country became a federal state in 1848 and has long cultivated its neutrality. It has four national languages.",
    ["Zermatt and the Matterhorn","Interlaken and the Jungfrau","Lucerne","Lake Geneva","The Glacier Express"]),

  c("CZ", "Czech Republic", "Europe", "Prague", "Czech", "CZK", "May to September, December", 2, ["ville","culture"],
    "Gothic bridges, castles and legendary beers.",
    "Prague is one of Europe's most beautiful cities, but the rest of the country is well worth the trip too, with its medieval towns and spa resorts.",
    "The heart of the Kingdom of Bohemia, the region came under Habsburg rule in the 16th century. Czechoslovakia was born in 1918. The Prague Spring was crushed in 1968, and the Velvet Revolution ended communist rule in 1989. The country separated from Slovakia in 1993.",
    ["Prague","Český Krumlov","Kutná Hora","Karlovy Vary","Moravia and its vineyards"]),

  c("HU", "Hungary", "Europe", "Budapest", "Hungarian", "HUF", "April to October", 1, ["ville","culture","gastronomie"],
    "Thermal baths, the Danube and Tokaj wines.",
    "Budapest, split in two by the Danube, is famous for its baths and architecture. Lake Balaton and the wine regions round off a trip nicely.",
    "The Magyars settled in the Danube plain at the end of the 9th century, and Stephen I became the first King of Hungary around the year 1000. The country later came under Ottoman and then Habsburg rule. The 1956 uprising against Soviet rule remains a defining moment in its history.",
    ["Budapest and its baths","Lake Balaton","Eger","Tokaj","Pécs"]),

  c("AL", "Albania", "Europe", "Tirana", "Albanian", "ALL", "May, June and September", 1, ["plage","montagne","culture","aventure"],
    "The Balkans' little-known riviera, between sea and mountains.",
    "Long closed to the world, Albania now reveals turquoise beaches, listed Ottoman towns and wild mountains, at prices that are still gentle.",
    "Land of the Illyrians in Antiquity, the region resisted the Ottomans in the 15th century under Skanderbeg, the national hero. Independent since 1912, Albania then spent decades in isolation under Enver Hoxha's communist regime, before opening up in the early 1990s.",
    ["The Albanian Riviera and Ksamil","Berat, the town of a thousand windows","Gjirokastër","The Albanian Alps and Theth","The ancient site of Butrint"]),

  c("ME", "Montenegro", "Europe", "Podgorica", "Montenegrin", "EUR", "May to September", 2, ["plage","montagne","nature"],
    "A fjord on the Adriatic and spectacular mountains.",
    "Small as it is, Montenegro offers a superb coastline and a mountainous interior, with national parks just a few hours' drive away.",
    "Long an independent principality in the mountains, Montenegro later became part of Yugoslavia, then of a union with Serbia. It became independent after a referendum in 2006.",
    ["The Bay of Kotor","Budva","Durmitor National Park","Lake Skadar","Ostrog Monastery"]),

  c("TR", "Turkey", "Europe", "Ankara", "Turkish", "TRY", "April to June, September and October", 1, ["culture","plage","gastronomie","ville"],
    "Between Europe and Asia: bazaars, mosques and fairy chimneys.",
    "Turkey packs in an incredible range of experiences: the global city of Istanbul, the lunar landscapes of Cappadocia, ancient sites and the turquoise coast.",
    "Constantinople, built on ancient Byzantium, was the capital of the Byzantine Empire for more than a thousand years. It fell in 1453 to the Ottomans, whose empire dominated much of the Mediterranean. Mustafa Kemal Atatürk proclaimed the Republic of Turkey in 1923.",
    ["Istanbul","Cappadocia","Pamukkale","The ancient site of Ephesus","The Lycian coast"]),

  // ---------- Afrique ----------
  c("MA", "Morocco", "Afrique", "Rabat", "Arabic and Amazigh (French widely spoken)", "MAD", "March to May, September to November", 1, ["culture","desert","montagne","gastronomie"],
    "Colourful medinas, the Atlas Mountains and Saharan dunes.",
    "Close at hand yet a world away, Morocco combines imperial cities, Berber villages, desert and Atlantic coast. On a road trip you can go from the souks to wide open spaces in a few hours.",
    "A series of dynasties followed one another, including the Almoravids and Almohads, who ruled as far as Andalusia. The country became a French and Spanish protectorate in 1912, then regained its independence in 1956.",
    ["Marrakech","Fez and its medina","The Merzouga desert","Chefchaouen, the blue town","Essaouira"]),

  c("EG", "Egypt", "Afrique", "Cairo", "Arabic", "EGP", "October to April", 1, ["culture","desert","plage"],
    "Pyramids, pharaonic temples and a Nile cruise.",
    "Egypt is home to some of humanity's most famous monuments. Many visitors combine the sights of Cairo, a cruise between Luxor and Aswan, and then the Red Sea.",
    "A pharaonic civilisation grew up along the Nile from around 3000 BC, building pyramids and temples. The country was later ruled by the Ptolemies and Rome, then conquered by the Arabs in the 7th century. The Suez Canal opened in 1869.",
    ["The pyramids of Giza","Luxor and the Valley of the Kings","A Nile cruise","Abu Simbel","The Red Sea"]),

  c("TN", "Tunisia", "Afrique", "Tunis", "Arabic (French widely spoken)", "TND", "April to June, September and October", 1, ["plage","culture","desert"],
    "Medinas, Roman sites and oases on the edge of the Sahara.",
    "Tunisia packs great variety into short distances: beaches, white-and-blue villages, Roman amphitheatres and Saharan scenery.",
    "Carthage, founded by the Phoenicians, became a great power and rival of Rome before being destroyed in 146 BC. The region was then Roman, later Arab. A French protectorate from 1881, Tunisia became independent in 1956.",
    ["Sidi Bou Said","The ruins of Carthage","The amphitheatre of El Jem","Djerba","Tozeur and the oases"]),

  c("ZA", "South Africa", "Afrique", "Pretoria (executive) and Cape Town (legislative)", "Several official languages, including English, Zulu and Afrikaans", "ZAR", "September to April (safari: May to September)", 2, ["faune","nature","plage","gastronomie"],
    "Safaris, vineyards and breathtaking coastal roads.",
    "South Africa lets you combine safari, cosmopolitan cities, vineyards and one of the world's finest coastal drives. A perfect road-trip destination.",
    "The Dutch set up a supply station at the Cape in 1652, before the British arrived. From 1948 to the early 1990s, the country lived under apartheid, a system of racial segregation. Nelson Mandela became president in 1994, after the first democratic elections open to all.",
    ["Cape Town and Table Mountain","The Garden Route","Kruger National Park","The Stellenbosch winelands","The Cape of Good Hope"]),

  c("KE", "Kenya", "Afrique", "Nairobi", "Swahili and English", "KES", "July to October, January and February", 2, ["faune","nature","plage"],
    "The Great Migration and the savannah plains.",
    "Kenya is one of the most celebrated safari destinations, with its great reserves and views of Kilimanjaro. The Swahili coast adds a beach break.",
    "Coastal towns such as Mombasa and Lamu prospered from Indian Ocean trade. Kenya became a British colony, then won independence in 1963.",
    ["The Masai Mara reserve","Amboseli National Park","Lake Nakuru","Lamu Island","Diani Beach"]),

  c("TZ", "Tanzania", "Afrique", "Dodoma", "Swahili and English", "TZS", "June to October", 2, ["faune","nature","plage","aventure"],
    "The Serengeti, Kilimanjaro and the beaches of Zanzibar.",
    "Tanzania offers exceptional safaris, Africa's highest peak and the white-sand beaches of Zanzibar: a rare trio in a single country.",
    "For centuries Zanzibar was a major centre of Indian Ocean trade, ruled by a sultanate. Tanganyika won independence in 1961 and united with Zanzibar in 1964 to form Tanzania.",
    ["Serengeti National Park","Ngorongoro Crater","Kilimanjaro","Zanzibar and Stone Town","Tarangire National Park"]),

  c("SN", "Senegal", "Afrique", "Dakar", "French (Wolof widely spoken)", "XOF", "November to May", 1, ["culture","plage","nature"],
    "Senegalese teranga, between river, delta and ocean.",
    "Senegal is renowned for its hospitality, known as teranga. Dakar is lively, and in a few days you can discover islands, mangroves and colonial towns.",
    "A series of kingdoms rose and fell here, including the Jolof Empire. Gorée Island recalls the coast's tragic role in the Atlantic slave trade. A French colony, Senegal became independent in 1960, with Léopold Sédar Senghor as its first president.",
    ["Dakar and Gorée Island","Saint-Louis","The Sine-Saloum Delta","Casamance","The Pink Lake"]),

  c("MG", "Madagascar", "Afrique", "Antananarivo", "Malagasy and French", "MGA", "April to November", 1, ["nature","faune","aventure","plage"],
    "Baobabs, lemurs and scenery found nowhere else.",
    "Isolated for millions of years, Madagascar is home to wildlife and plants found nowhere else on earth. Distances are long, but the scenery is worth every kilometre.",
    "The island was settled by seafarers from South-East Asia, then by peoples from East Africa. In the 19th century the Merina kingdom unified much of the island. A French colony from 1896, Madagascar became independent in 1960.",
    ["The Avenue of the Baobabs","The Tsingy de Bemaraha","Isalo National Park","Nosy Be","The lemurs of Andasibe"]),

  c("CV", "Cape Verde", "Afrique", "Praia", "Portuguese (Cape Verdean Creole)", "CVE", "All year round", 2, ["plage","montagne","culture"],
    "Volcanic islands that move to the rhythm of morna.",
    "Each island in Cape Verde has its own character: white-sand beaches, vertiginous hiking trails or a still-active volcano. Music is everywhere.",
    "The uninhabited archipelago was discovered by Portuguese navigators in the 15th century and became an important Atlantic port of call, notably for the slave trade. The country became independent in 1975. The singer Cesária Évora made morna known all over the world.",
    ["Hiking on Santo Antão","Mindelo on São Vicente","Fogo volcano","The beaches of Boa Vista","Sal"]),

  c("NA", "Namibia", "Afrique", "Windhoek", "English", "NAD", "May to October", 2, ["desert","faune","aventure","nature"],
    "Red dunes, endless deserts and wildlife roaming free.",
    "Namibia is the ultimate road-trip country: gravel roads, vast empty spaces, giant dunes and wild animals gathered at waterholes.",
    "A German colony from 1884, the territory was later administered by South Africa. After a long struggle, Namibia became independent in 1990.",
    ["The Sossusvlei dunes","Etosha National Park","The Skeleton Coast","Swakopmund","Damaraland"]),

  // ---------- Moyen-Orient ----------
  c("JO", "Jordan", "Moyen-Orient", "Amman", "Arabic", "JOD", "March to May, September to November", 2, ["culture","desert","aventure"],
    "Petra, Wadi Rum and the Dead Sea.",
    "Jordan packs exceptional sites into a small country: a city carved from the rock, a desert straight out of the movies and the saltiest sea in the world.",
    "The Nabataeans made Petra a great caravan city more than two thousand years ago. The region later became Roman, as Jerash shows. The Kingdom of Jordan became independent in 1946.",
    ["Petra","The Wadi Rum desert","The Dead Sea","Jerash","Aqaba and the Red Sea"]),

  c("AE", "United Arab Emirates", "Moyen-Orient", "Abu Dhabi", "Arabic", "AED", "November to March", 3, ["ville","desert","plage"],
    "Record-breaking skyscrapers, golden desert and warm winter beaches.",
    "Dubai and Abu Dhabi offer spectacular architecture, ambitious museums and the desert just minutes away. An ideal stopover between Europe and Asia.",
    "For centuries the emirates lived from fishing and pearl diving. They formed a federation in 1971 and then grew very fast, first on oil, then on tourism and trade.",
    ["Dubai and the Burj Khalifa","Sheikh Zayed Grand Mosque","Louvre Abu Dhabi","A night in the desert","Old Dubai and its souks"]),

  c("OM", "Oman", "Moyen-Orient", "Muscat", "Arabic", "OMR", "October to April", 2, ["desert","nature","culture","aventure"],
    "Forts, turquoise wadis and dunes, far from the crowds.",
    "Oman is an authentic and safe destination, perfect for a road trip: canyons, oases, mountains, beaches and desert follow one after another.",
    "A great maritime power, in the 19th century Oman controlled part of the East African coast, including Zanzibar. The country modernised profoundly from 1970 under Sultan Qaboos.",
    ["Muscat","Nizwa and its fort","The Wahiba Sands","Wadi Shab","The fjords of Musandam"]),

  // ---------- Asie ----------
  c("JP", "Japan", "Asie", "Tokyo", "Japanese", "JPY", "March to May, October and November", 3, ["culture","ville","gastronomie","nature"],
    "Zen temples, futuristic megacities and cherry blossom.",
    "Japan fascinates with its contrast between age-old traditions and modernity. Fast trains make it easy to move from Tokyo to the temples of Kyoto or the mountains.",
    "Kyoto became the imperial capital in 794 and remained so for over a thousand years. The shoguns later ruled the country, which closed itself almost entirely to foreigners for more than two centuries. From the Meiji era, in 1868, Japan modernised at great speed.",
    ["Tokyo","Kyoto and its temples","Nara and Osaka","Hiroshima and Miyajima","The Japanese Alps"]),

  c("TH", "Thailand", "Asie", "Bangkok", "Thai", "THB", "November to March", 1, ["plage","culture","gastronomie","nature"],
    "Golden temples, street food and island paradises.",
    "Thailand is an easy and varied destination: buzzing Bangkok, the temples of the north, jungle and islands with turquoise waters. Its street food is legendary.",
    "The kingdoms of Sukhothai and then Ayutthaya dominated the region from the 13th to the 18th century. Unusually for Southeast Asia, Thailand, formerly known as Siam, was never colonised. It became a constitutional monarchy in 1932.",
    ["Bangkok","Chiang Mai","Ayutthaya","Krabi and the Andaman Sea","The Gulf islands"]),

  c("VN", "Vietnam", "Asie", "Hanoi", "Vietnamese", "VND", "February to April (depending on the region)", 1, ["nature","culture","gastronomie","plage"],
    "Ha Long Bay, terraced rice fields and pho.",
    "Vietnam stretches more than 1,500 km from north to south, with very different climates and landscapes. Travellers often cover it from north to south by train, bus or motorbike.",
    "The country lived under Chinese rule for nearly a thousand years before breaking free in the 10th century. A French colony in the 19th century, it then went through the Indochina and Vietnam wars. The country was reunified in 1976.",
    ["Ha Long Bay","Hoi An","Hue","Ho Chi Minh City","The rice terraces of Sapa"]),

  c("ID", "Indonesia", "Asie", "Jakarta", "Indonesian", "IDR", "May to September", 1, ["plage","nature","culture","aventure"],
    "Volcanoes, rice terraces and more than 17,000 islands.",
    "Indonesia is the largest archipelago in the world. Bali is the best known, but Java, Lombok, Komodo and Raja Ampat offer landscapes every bit as spectacular.",
    "Hindu and Buddhist kingdoms flourished here, leaving temples such as Borobudur. Islam later spread across much of the archipelago. A Dutch colony, Indonesia declared independence in 1945.",
    ["Bali and its rice terraces","Borobudur temple","Mount Bromo","The Gili Islands and Lombok","Komodo National Park"]),

  c("IN", "India", "Asie", "New Delhi", "Hindi and English (plus many regional languages)", "INR", "October to March", 1, ["culture","gastronomie","aventure"],
    "Rajasthan's palaces, the Taj Mahal and the Kerala backwaters.",
    "India is a country the size of a continent, intense and fascinating. Each region has its own language, food and traditions: for a first trip, it's best to choose one or two.",
    "One of the oldest urban civilisations grew up in the Indus Valley. The Mughal Empire, which built the Taj Mahal in the 17th century, later ruled much of the subcontinent. Under British rule, India gained independence in 1947.",
    ["The Taj Mahal in Agra","Jaipur and Rajasthan","Varanasi","The Kerala backwaters","Goa"]),

  c("LK", "Sri Lanka", "Asie", "Sri Jayawardenepura Kotte (Colombo is the commercial capital)", "Sinhala and Tamil", "LKR", "December to April (south-west coast)", 1, ["nature","culture","plage","faune"],
    "Tea plantations, elephants and Buddhist temples.",
    "Sri Lanka packs ancient sites, tea-covered mountains, wildlife parks and beautiful beaches into one small island. The train through the hill country is legendary.",
    "Anuradhapura, capital of Buddhist kingdoms for more than a thousand years, still bears witness to that past. The island, then called Ceylon, was controlled in turn by the Portuguese, the Dutch and the British. It became independent in 1948.",
    ["Sigiriya Rock","Kandy and the Temple of the Tooth","Ella and the tea plantations","Galle","Yala National Park"]),

  c("KR", "South Korea", "Asie", "Seoul", "Korean", "KRW", "April, May, September to November", 2, ["ville","culture","gastronomie"],
    "K-culture, royal palaces and spicy food.",
    "South Korea combines ultra-modern cities, ancient palaces and easily reached mountains. Its pop culture and its food are drawing more and more travellers.",
    "The Joseon dynasty ruled from 1392 until the late 19th century. The peninsula was occupied by Japan from 1910 to 1945, then divided. After the Korean War (1950-1953), the South saw spectacular economic growth.",
    ["Seoul and its palaces","Busan","Gyeongju","Jeju Island","Seoraksan National Park"]),

  c("KH", "Cambodia", "Asie", "Phnom Penh", "Khmer", "KHR", "November to March", 1, ["culture","nature"],
    "The temples of Angkor and gentle Khmer charm.",
    "Cambodia is best known for Angkor, one of the largest archaeological sites in the world. The rest of the country offers peaceful towns, countryside and coast.",
    "The Khmer Empire ruled much of Southeast Asia from the 9th to the 15th century and built the temples of Angkor. A French protectorate from 1863, the country became independent in 1953. The Khmer Rouge regime (1975-1979) claimed a very large number of victims.",
    ["The temples of Angkor","Phnom Penh","Battambang","Kampot and Kep","Tonle Sap Lake"]),

  c("PH", "Philippines", "Asie", "Manila", "Filipino and English", "PHP", "December to May", 1, ["plage","nature","aventure"],
    "Turquoise lagoons, rice terraces and outstanding diving.",
    "With more than 7,000 islands, the Philippines is a paradise for lovers of beaches, diving and island hopping. Filipinos are known for their warm welcome.",
    "A Spanish colony from 1565 to 1898, the archipelago then came under American control. The country became independent in 1946. Catholicism, inherited from the Spanish period, is very much present.",
    ["El Nido and Coron in Palawan","Bohol and its Chocolate Hills","Siargao","The Banaue rice terraces","Cebu"]),

  c("NP", "Nepal", "Asie", "Kathmandu", "Nepali", "NPR", "October, November, March and April", 1, ["montagne","aventure","culture"],
    "The roof of the world and the finest treks on the planet.",
    "Nepal is home to eight of the world's ten highest peaks, including Everest. People come for the treks, but also for the temples of the Kathmandu Valley.",
    "The Kathmandu Valley was long divided between several Newar kingdoms, renowned for their architecture. The country was unified in the 18th century. The monarchy was abolished in 2008. Lumbini, in the south, is regarded as the birthplace of the Buddha.",
    ["Kathmandu and its valley","The Annapurna trek","Everest Base Camp","Pokhara","Chitwan National Park"]),

  c("CN", "China", "Asie", "Beijing", "Mandarin", "CNY", "April, May, September and October", 2, ["culture","ville","nature"],
    "The Great Wall, karst mountains and megacities.",
    "China is huge and immensely varied. Beijing and Xi'an tell its imperial story, Shanghai embodies its modernity, and the landscapes of the south are spectacular.",
    "Successive dynasties ruled China for more than two thousand years, and the Great Wall was built and rebuilt over the centuries. The empire ended in 1912. The People's Republic of China was proclaimed in 1949.",
    ["Beijing and the Great Wall","Xi'an's Terracotta Army","Guilin and Yangshuo","Shanghai","Zhangjiajie"]),

  c("MY", "Malaysia", "Asie", "Kuala Lumpur", "Malay", "MYR", "All year round (depending on the coast)", 1, ["nature","gastronomie","plage","faune"],
    "Borneo's jungle, street food and futuristic towers.",
    "Malaysia blends Malay, Chinese and Indian cultures, and you can taste it in the food. You can go from modern city to jungle to islands.",
    "The Sultanate of Malacca was a great trading port in the 15th century. The city was then taken by the Portuguese, the Dutch and finally the British. Malaysia became independent in 1957.",
    ["Kuala Lumpur","George Town in Penang","Malacca","Borneo and the orangutans","The Perhentian Islands"]),

  // ---------- Amériques ----------
  c("BR", "Brazil", "Amériques", "Brasília", "Portuguese", "BRL", "September to March (depending on the region)", 2, ["plage","nature","culture","faune"],
    "Rio, the Amazon, the Iguazu Falls and endless beaches.",
    "Brazil is a country the size of a continent, with infectious energy. Its cities, forests, beaches and music will keep you coming back again and again.",
    "The Portuguese reached these shores in 1500. Brazil became independent in 1822 as an empire, abolished slavery in 1888 and became a republic in 1889. Its highly mixed population has Indigenous, European and African roots.",
    ["Rio de Janeiro","The Iguazu Falls","The Amazon","Salvador da Bahia","Lençóis Maranhenses"]),

  c("AR", "Argentina", "Amériques", "Buenos Aires", "Spanish", "ARS", "October to April (Patagonia: November to March)", 2, ["nature","montagne","gastronomie","aventure"],
    "Tango, Patagonian glaciers and Mendoza wines.",
    "From Buenos Aires to the glaciers of the far south by way of the Andean vineyards, Argentina offers vast distances and grand scenery.",
    "The region was part of the Spanish Empire before declaring independence in 1816. In the late 19th and early 20th centuries it took in millions of European immigrants, particularly from Italy and Spain.",
    ["Buenos Aires","The Perito Moreno Glacier","El Chaltén and Fitz Roy","Iguazú Falls","Mendoza and Salta"]),

  c("CL", "Chile", "Amériques", "Santiago", "Spanish", "CLP", "October to April", 2, ["desert","montagne","nature","aventure"],
    "From the world's driest desert to the glaciers of Patagonia.",
    "Stretching more than 4,000 km, Chile offers a unique variety of scenery: deserts, volcanoes, lakes, fjords and glaciers.",
    "The north of the country was part of the Inca Empire before the Spanish conquest. Chile became independent in 1818. From 1973 to 1990 it lived under the dictatorship of General Pinochet.",
    ["The Atacama Desert","Torres del Paine","Valparaíso","Easter Island","Chiloé Island"]),

  c("PE", "Peru", "Amériques", "Lima", "Spanish and Quechua", "PEN", "May to September", 1, ["culture","montagne","gastronomie","aventure"],
    "Machu Picchu, Inca heritage and celebrated cuisine.",
    "Peru draws visitors with its Inca sites, but also wins them over with its mountains, colourful markets and food, among the most acclaimed in Latin America.",
    "The Inca Empire, centred on Cusco, became the largest state in pre-Columbian America in the 15th century. The Spanish conquered it from 1532 onwards. Peru declared independence in 1821.",
    ["Machu Picchu","Cusco and the Sacred Valley","Lake Titicaca","The Colca Canyon","Lima"]),

  c("BO", "Bolivia", "Amériques", "Sucre (La Paz, seat of government)", "Spanish, Quechua, Aymara (and other languages)", "BOB", "May to October", 1, ["desert","montagne","aventure","culture"],
    "The Uyuni salt flat and the high Andean plateau.",
    "Bolivia has some of South America's most otherworldly scenery, with salt flats, colourful lagoons and cities perched at high altitude.",
    "The Tiwanaku civilisation developed near Lake Titicaca long before the Incas. In colonial times the silver mines of Potosí enriched the Spanish Empire. The country became independent in 1825 and took its name from Simón Bolívar.",
    ["The Uyuni salt flat","La Paz","Lake Titicaca","Potosí","Sucre"]),

  c("CO", "Colombia", "Amériques", "Bogotá", "Spanish", "COP", "December to March", 1, ["culture","plage","nature"],
    "Colourful cities, coffee and the Caribbean coast.",
    "Colombia wins people over with the warmth of its people, its colonial towns, its coffee plantations and its two coasts, Pacific and Caribbean.",
    "The Muisca, who inspired the legend of El Dorado, lived on the high plateaus. The territory became the Viceroyalty of New Granada, then won independence in 1819 under Simón Bolívar. A peace agreement was signed with the main guerrilla group in 2016.",
    ["Cartagena","Medellín","The Coffee Region","Tayrona National Park","Bogotá"]),

  c("MX", "Mexico", "Amériques", "Mexico City", "Spanish", "MXN", "November to April", 1, ["culture","plage","gastronomie"],
    "Maya pyramids, cenotes and UNESCO-listed cuisine.",
    "Mexico offers immense cultural riches, Caribbean beaches and a cuisine recognised by UNESCO. The Yucatán is especially well suited to a road trip.",
    "The Maya and later the Aztecs built great civilisations. Tenochtitlan, the Aztec capital, fell to the Spanish in 1521. Mexico became independent in 1821, then went through a revolution from 1910.",
    ["Mexico City","Chichén Itzá and the Yucatán","The cenotes","Oaxaca","Tulum"]),

  c("CU", "Cuba", "Amériques", "Havana", "Spanish", "CUP", "November to April", 2, ["culture","plage"],
    "Vintage cars, salsa and Caribbean beaches.",
    "Cuba fascinates with its timeless atmosphere, its music and its colourful colonial towns. Build in some flexibility: infrastructure is limited.",
    "A Spanish colony for nearly four centuries, Cuba became independent in the early 20th century. The 1959 revolution, led by Fidel Castro, established a socialist regime.",
    ["Havana","Trinidad","The Viñales Valley","Cienfuegos","The beaches of Varadero"]),

  c("CR", "Costa Rica", "Amériques", "San José", "Spanish", "CRC", "December to April", 2, ["nature","faune","plage","aventure"],
    "Volcanoes, rainforests and exceptional biodiversity.",
    "Costa Rica is a pioneer of ecotourism. Much of its territory is protected, and sloths, monkeys and tropical birds are easy to spot.",
    "The country gained independence from Spain in 1821. In 1948 it abolished its army, a rare choice in the world. It went on to invest heavily in education and nature conservation.",
    ["Arenal Volcano","The Monteverde Cloud Forest","Manuel Antonio National Park","Tortuguero","Corcovado National Park"]),

  c("US", "United States", "Amériques", "Washington, DC", "English", "USD", "Varies by region", 3, ["nature","ville","aventure","desert"],
    "Great national parks, legendary roads and iconic cities.",
    "The United States is road-trip country: Route 66, the Pacific coast, the canyons of the West. Cities such as New York and New Orleans each have a personality of their own.",
    "Indigenous peoples had lived on this land for thousands of years before Europeans arrived. The thirteen British colonies declared independence in 1776. The Civil War (1861-1865) led to the abolition of slavery.",
    ["New York","The Grand Canyon","Yosemite National Park","The California coast","New Orleans"]),

  c("CA", "Canada", "Amériques", "Ottawa", "English and French", "CAD", "June to October", 3, ["nature","montagne","faune","aventure"],
    "Turquoise Rockies lakes and the charm of Quebec.",
    "Canada is vast and wild. You can combine welcoming cities, mountains, lakes and wildlife watching, and speak French in Quebec.",
    "First Nations lived on the land long before Europeans arrived. Samuel de Champlain founded Quebec in 1608, at the heart of New France. Canada was born as a confederation in 1867.",
    ["The Rockies (Banff and Jasper)","Quebec City","Montreal","Vancouver and Vancouver Island","Autumn colours"]),

  c("GT", "Guatemala", "Amériques", "Guatemala City", "Spanish (and Mayan languages)", "GTQ", "November to April", 1, ["culture","nature","aventure"],
    "Volcanoes, lakes and Maya cities in the jungle.",
    "Guatemala is Central America in miniature: Indigenous markets, a colonial city, a lake ringed by volcanoes and great Maya sites.",
    "Tikal was one of the greatest cities of the Maya civilisation. The region was conquered by the Spanish in the 16th century and became independent in 1821. A long civil war ended in 1996.",
    ["Antigua","Lake Atitlán","The Maya site of Tikal","Semuc Champey","Chichicastenango market"]),

  // ---------- Océanie ----------
  c("AU", "Australia", "Océanie", "Canberra", "English", "AUD", "September to November, March to May", 3, ["nature","plage","faune","aventure"],
    "Reefs, red outback and surf beaches.",
    "Australia is made for long road trips by campervan: endless coastlines, deserts, rainforests and unique wildlife.",
    "Aboriginal peoples have lived on the continent for tens of thousands of years. The British founded a colony there in 1788. The colonies united in 1901 to form Australia.",
    ["Sydney","The Great Barrier Reef","Uluru","The Great Ocean Road","Tasmania"]),

  c("NZ", "New Zealand", "Océanie", "Wellington", "English and Māori", "NZD", "December to March", 3, ["nature","montagne","aventure"],
    "Fjords, volcanoes and film-set scenery.",
    "New Zealand packs in an extraordinary range of scenery: fjords, glaciers, volcanoes and beaches, ideal by van or motorhome.",
    "Māori settled the islands around the 13th century. In 1840, Māori chiefs and the British Crown signed the Treaty of Waitangi, the country's founding document. Māori culture remains very present today.",
    ["Milford Sound","Queenstown","Tongariro National Park","Rotorua","The Bay of Islands"]),

  c("PF", "French Polynesia", "Océanie", "Papeete", "French and Tahitian", "XPF", "May to October", 3, ["plage","nature"],
    "Turquoise lagoons and islands at the end of the world.",
    "Bora Bora, Moorea, Tahiti: French Polynesia embodies the South Seas dream. A distant and expensive destination, but an unforgettable one.",
    "The islands were settled by Polynesian navigators several centuries ago. European explorers arrived in the 18th century. France established a protectorate in 1842. The painter Paul Gauguin spent his final years here.",
    ["Bora Bora","Moorea","Tahiti","Rangiroa","The Marquesas Islands"]),
];
