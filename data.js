// Ship Competition Data
const PARTICIPANTS = [
  {
    name: "Jhimi",
    color: "#e74c3c",
    ships: [
      { name: "Monte Urbasa", flag: "Portugal (Madeira)", imo: "9785835", mmsi: "255806023" },
      { name: "Shaden", flag: "Saudi Arabia", imo: "9779848", mmsi: "403530000" },
      { name: "Jag Vasant", flag: "India", imo: "9307750", mmsi: "419001387" },
      { name: "Rose 25", flag: "Palau", imo: "9275983", mmsi: "511101620" },
      { name: "Long Wind", flag: "Hong Kong", imo: "9385037", mmsi: "477372500" },
    ],
  },
  {
    name: "Murph",
    color: "#3498db",
    ships: [
      { name: "P.ALIKI", flag: "Marshall Islands", imo: "9460136", mmsi: "538010229" },
      { name: "Magic Victoria", flag: "Marshall Islands", imo: "9608867", mmsi: "538004722" },
      { name: "Nord Victor", flag: "Panama", imo: "9982536", mmsi: "352003984" },
      { name: "Eco Oracle", flag: "Marshall Islands", imo: "9936549", mmsi: "538009925" },
      { name: "Siena", flag: "Greece", imo: "9833735", mmsi: "241836000" },
    ],
  },
  {
    name: "Adrian",
    color: "#2ecc71",
    ships: [
      { name: "Abu Dhabi III", flag: "Liberia", imo: "9489027", mmsi: "636014923" },
      { name: "Spade", flag: "Cameroon", imo: "1137745", mmsi: "613701904" },
      { name: "Auroura", flag: "Panama", imo: "9262912", mmsi: "352001225" },
      { name: "Lan Jing", flag: "Curaçao", imo: "9288095", mmsi: "306254000" },
      { name: "North Star", flag: "Barbados", imo: "9299563", mmsi: "314109000" },
    ],
  },
  {
    name: "Albert",
    color: "#f39c12",
    ships: [
      { name: "Maria", flag: "Saudi Arabia", imo: "1120510", mmsi: "671536100" },
      { name: "Sands", flag: "Gambia", imo: "9220940", mmsi: "629009382" },
      { name: "Ocean Lily", flag: "Hong Kong", imo: "9284960", mmsi: "477178100" },
      { name: "Advantage Victory", flag: "Marshall Islands", imo: "9933547", mmsi: "538010019" },
      { name: "Lebrethah", flag: "Liberia", imo: "9976927", mmsi: "636024681" },
    ],
  },
  {
    name: "Sam",
    color: "#9b59b6",
    ships: [
      { name: "Karachi", flag: "Pakistan", imo: "9903413", mmsi: "463092101" },
      { name: "Sea Bird", flag: "Palau", imo: "9088536", mmsi: "511101458" },
      { name: "Diligent Warrior", flag: "Greece", imo: "9750050", mmsi: "241422000" },
      { name: "Nature Heart", flag: "Mozambique", imo: "9251585", mmsi: "650000171" },
      { name: "Camilla", flag: "Hong Kong", imo: "9254850", mmsi: "477223400" },
    ],
  },
  {
    name: "Viraj",
    color: "#1abc9c",
    ships: [
      { name: "Stoic Warrior", flag: "Liberia", imo: "1028762", mmsi: "636024896" },
      { name: "Pine Gas", flag: "India", imo: "9315680", mmsi: "419001655" },
      { name: "Galaxy Gas", flag: "Haiti", imo: "9174361", mmsi: "336897910" },
      { name: "Front Shanghai", flag: "Hong Kong", imo: "9832262", mmsi: "477539300" },
      { name: "Front Beauly", flag: "Marshall Islands", imo: "9937103", mmsi: "538010890" },
    ],
  },
  {
    name: "Tuffee",
    color: "#e67e22",
    ships: [
      { name: "Smyrni", flag: "Liberia", imo: "9493779", mmsi: "636015015" },
      { name: "Parimal", flag: "Palau", imo: "9308766", mmsi: "511101460" },
      { name: "Serifos", flag: "Liberia", imo: "9410399", mmsi: "636018827" },
      { name: "GasLog Skagen", flag: "Bermuda", imo: "9626285", mmsi: "310664000" },
      { name: "Mahadah Silver", flag: "Marshall Islands", imo: "9718777", mmsi: "538006501" },
    ],
  },
  {
    name: "Eleanor",
    color: "#e91e63",
    ships: [
      { name: "Safeen Prestige", flag: "Malta", imo: "9593517", mmsi: "249797000" },
      { name: "Sonangol Namibe", flag: "Bahamas", imo: "9325049", mmsi: "309072000" },
      { name: "Sanmar Herald", flag: "India", imo: "9330563", mmsi: "419002042" },
      { name: "Ocean Thunder", flag: "Panama", imo: "9416422", mmsi: "352003620" },
      { name: "Al Kharaitiyat", flag: "Marshall Islands", imo: "9397327", mmsi: "538003352" },
    ],
  },
];

// Real ship positions fetched from AIS data (myshiptracking.com)
// Last updated: 2026-04-25
const REAL_POSITIONS = {
  "9785835": { lat: 26.03439, lng: 55.58827 },  // Monte Urbasa
  "9779848": { lat: 25.60952, lng: 54.96870 },  // Shaden
  "9307750": { lat: 19.19000, lng: 72.54468 },  // Jag Vasant
  "9275983": { lat: 26.17642, lng: 54.65128 },  // Rose 25
  "9385037": { lat: 25.74893, lng: 53.87648 },  // Long Wind
  "9460136": { lat: 24.80887, lng: 66.97605 },  // P.ALIKI
  "9608867": { lat: 25.52912, lng: 54.85947 },  // Magic Victoria
  "9982536": { lat: 24.80989, lng: 52.94570 },  // Nord Victor
  "9936549": { lat: 25.63666, lng: 53.42117 },  // Eco Oracle
  "9833735": { lat: 25.63672, lng: 55.11615 },  // Siena
  "9489027": { lat: 25.26196, lng: 56.47597 },  // Abu Dhabi III
  "1137745": { lat: 26.86024, lng: 52.82815 },  // Spade
  "9262912": { lat: 24.71919, lng: 56.60212 },  // Auroura
  "9288095": { lat: 34.95571, lng: 121.23693 },  // Lan Jing
  "9299563": { lat: 5.69607, lng: 81.14585 },  // North Star
  "1120510": { lat: 25.53915, lng: 55.28631 },  // Maria
  "9220940": { lat: 24.81876, lng: 56.99120 },  // Sands
  "9284960": { lat: 25.91200, lng: 55.32412 },  // Ocean Lily
  "9933547": { lat: 25.70155, lng: 53.42068 },  // Advantage Victory
  "9976927": { lat: 25.48534, lng: 52.25425 },  // Lebrethah
  "9903413": { lat: 24.74092, lng: 66.69884 },  // Karachi
  "9088536": { lat: 25.39266, lng: 56.60021 },  // Sea Bird
  "9750050": { lat: 25.54770, lng: 54.86940 },  // Diligent Warrior
  "9251585": { lat: 38.35540, lng: 121.62172 },  // Nature Heart
  "9254850": { lat: 19.73883, lng: 57.90682 },  // Camilla
  "1028762": { lat: 25.61933, lng: 54.85180 },  // Stoic Warrior
  "9315680": { lat: 21.54176, lng: 69.35446 },  // Pine Gas
  "9174361": { lat: 26.65064, lng: 56.90396 },  // Galaxy Gas
  "9832262": { lat: 24.94142, lng: 54.23176 },  // Front Shanghai
  "9937103": { lat: 2.20103, lng: 102.00514 },  // Front Beauly
  "9493779": { lat: 22.00768, lng: 65.34244 },  // Smyrni
  "9308766": { lat: 24.77867, lng: 56.55485 },  // Parimal
  "9410399": { lat: 2.20488, lng: 102.08681 },  // Serifos
  "9626285": { lat: 28.89375, lng: 48.99168 },  // GasLog Skagen
  "9718777": { lat: 25.34230, lng: 53.80960 },  // Mahadah Silver
  "9593517": { lat: 25.89098, lng: 55.41337 },  // Safeen Prestige
  "9325049": { lat: 29.56028, lng: 48.84260 },  // Sonangol Namibe
  "9330563": { lat: 25.72104, lng: 54.94683 },  // Sanmar Herald
  "9416422": { lat: 2.20238, lng: 102.10039 },  // Ocean Thunder
  "9397327": { lat: 25.87221, lng: 51.80865 },  // Al Kharaitiyat
};

// Strait of Hormuz coordinates
const HORMUZ = {
  center: [26.0, 54.0],
  zoom: 7,
  // Gate line - horizontal from Limah east across to Iranian coast
  gateLine: [
    [25.94, 56.42],
    [25.94, 57.4],
  ],
};

// Finish line target point (center of gate line, where the label is)
const FINISH_LINE = { lat: 25.94, lng: 56.8 };

// Actual eastbound shipping lane through the Strait of Hormuz (TSS)
// Based on key landmarks: Greater Tunb Island, Musandam, and Quoin Island
const SHIPPING_LANE = [
  { lat: 26.12, lng: 55.3 },   // South of Greater Tunb (26.25N,55.27E), eastbound lane
  { lat: 26.34, lng: 56.0 },   // Mid-strait, between Musandam and Iran
  { lat: 26.52, lng: 56.52 },  // Quoin Island (26.50N,56.52E) - traditional exit point
];

// Flag emoji mapping
const FLAG_EMOJIS = {
  "Portugal (Madeira)": "\u{1F1F5}\u{1F1F9}",
  "Saudi Arabia": "\u{1F1F8}\u{1F1E6}",
  India: "\u{1F1EE}\u{1F1F3}",
  Palau: "\u{1F1F5}\u{1F1FC}",
  "Hong Kong": "\u{1F1ED}\u{1F1F0}",
  "Marshall Islands": "\u{1F1F2}\u{1F1ED}",
  Panama: "\u{1F1F5}\u{1F1E6}",
  Greece: "\u{1F1EC}\u{1F1F7}",
  Liberia: "\u{1F1F1}\u{1F1F7}",
  Cameroon: "\u{1F1E8}\u{1F1F2}",
  Curaçao: "\u{1F1E8}\u{1F1FC}",
  Gambia: "\u{1F1EC}\u{1F1F2}",
  Pakistan: "\u{1F1F5}\u{1F1F0}",
  Mozambique: "\u{1F1F2}\u{1F1FF}",
  Haiti: "\u{1F1ED}\u{1F1F9}",
  Bermuda: "\u{1F1E7}\u{1F1F2}",
  Barbados: "\u{1F1E7}\u{1F1E7}",
  Malta: "\u{1F1F2}\u{1F1F9}",
  Bahamas: "\u{1F1E7}\u{1F1F8}",
};
