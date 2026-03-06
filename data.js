// Ship Competition Data
const PARTICIPANTS = [
  {
    name: "Jhimi",
    color: "#e74c3c",
    ships: [
      { name: "Monte Urbasa", flag: "Portugal (Madeira)", imo: "9785835" },
      { name: "Shaden", flag: "Saudi Arabia", imo: "9779848" },
      { name: "Jag Vasant", flag: "India", imo: "9307750" },
      { name: "Rose 25", flag: "Palau", imo: "9275983" },
      { name: "Long Wind", flag: "Hong Kong", imo: "9385037" },
    ],
  },
  {
    name: "Murph",
    color: "#3498db",
    ships: [
      { name: "P.ALIKI", flag: "Marshall Islands", imo: "9460136" },
      { name: "Magic Victoria", flag: "Marshall Islands", imo: "9608867" },
      { name: "Nord Victor", flag: "Panama", imo: "9982536" },
      { name: "Eco Oracle", flag: "Marshall Islands", imo: "9936549" },
      { name: "Siena", flag: "Greece", imo: "9833735" },
    ],
  },
  {
    name: "Adrian",
    color: "#2ecc71",
    ships: [
      { name: "Abu Dhabi III", flag: "Liberia", imo: "9489027" },
      { name: "Spade", flag: "Cameroon", imo: "1137745" },
      { name: "Auroura", flag: "Panama", imo: "9262912" },
      { name: "Lan Jing", flag: "Curaçao", imo: "9288095" },
      { name: "North Star", flag: "Greece", imo: "9978676" },
    ],
  },
  {
    name: "Albert",
    color: "#f39c12",
    ships: [
      { name: "Maria", flag: "Saudi Arabia", imo: "1120510" },
      { name: "Sands", flag: "Gambia", imo: "9220940" },
      { name: "Ocean Lily", flag: "Hong Kong", imo: "9284960" },
      { name: "Advantage Victory", flag: "Marshall Islands", imo: "9933547" },
      { name: "Lebrethah", flag: "Liberia", imo: "9976927" },
    ],
  },
  {
    name: "Sam",
    color: "#9b59b6",
    ships: [
      { name: "Karachi", flag: "Pakistan", imo: "9903413" },
      { name: "Sea Bird", flag: "Panama", imo: "9065077" },
      { name: "Diligent Warrior", flag: "Greece", imo: "9750050" },
      { name: "Nature Heart", flag: "Mozambique", imo: "9251585" },
      { name: "Camilla", flag: "Liberia", imo: "9254850" },
    ],
  },
  {
    name: "Viraj",
    color: "#1abc9c",
    ships: [
      { name: "Stoic Warrior", flag: "Liberia", imo: "1028762" },
      { name: "Pine Gas", flag: "India", imo: "9315680" },
      { name: "Galaxy Gas", flag: "Haiti", imo: "9174361" },
      { name: "Front Shanghai", flag: "Hong Kong", imo: "9832262" },
      { name: "Front Beauly", flag: "Marshall Islands", imo: "9937103" },
    ],
  },
  {
    name: "Tuffee",
    color: "#e67e22",
    ships: [
      { name: "Smyrni", flag: "Liberia", imo: "9493779" },
      { name: "Parimal", flag: "Palau", imo: "9308766" },
      { name: "Serifos", flag: "Liberia", imo: "9410399" },
      { name: "GasLog Skagen", flag: "Bermuda", imo: "9626285" },
      { name: "Mahadah Silver", flag: "Marshall Islands", imo: "9718777" },
    ],
  },
];

// Real ship positions fetched from AIS data (myshiptracking.com)
// Last updated: 2026-03-06
const REAL_POSITIONS = {
  "1028762": { lat: 25.62078, lng: 54.85403 },  // Stoic Warrior
  "1137745": { lat: 25.41512, lng: 55.32857 },  // Spade
  "9174361": { lat: 25.68159, lng: 55.09767 },  // Galaxy Gas
  "9220940": { lat: 26.07955, lng: 55.78936 },  // Sands
  "9251585": { lat: 24.46434, lng: 52.82303 },  // Nature Heart
  "9254850": { lat: 25.67708, lng: 55.02244 },  // Camilla
  "9262912": { lat: 25.59927, lng: 55.09361 },  // Auroura
  "9275983": { lat: 24.45263, lng: 52.90046 },  // Rose 25
  "9284960": { lat: 26.33608, lng: 52.97348 },  // Ocean Lily
  "9288095": { lat: 24.45920, lng: 52.84508 },  // Lan Jing
  "9307750": { lat: 25.68347, lng: 55.06872 },  // Jag Vasant
  "9308766": { lat: 29.35883, lng: 49.09336 },  // Parimal
  "9315680": { lat: 25.70090, lng: 55.02940 },  // Pine Gas
  "9385037": { lat: 26.71684, lng: 52.79400 },  // Long Wind
  "9410399": { lat: 26.47966, lng: 52.80474 },  // Serifos
  "9460136": { lat: 25.86710, lng: 55.59069 },  // P.ALIKI
  "9489027": { lat: 24.42868, lng: 53.66972 },  // Abu Dhabi III
  "9493779": { lat: 24.50698, lng: 52.92393 },  // Smyrni
  "9608867": { lat: 27.54970, lng: 50.60362 },  // Magic Victoria
  "9626285": { lat: 24.45669, lng: 52.91287 },  // GasLog Skagen
  "9718777": { lat: 25.51483, lng: 53.46825 },  // Mahadah Silver
  "9750050": { lat: 25.63318, lng: 54.86490 },  // Diligent Warrior
  "9779848": { lat: 25.94069, lng: 55.68304 },  // Shaden
  "9785835": { lat: 24.51510, lng: 53.59438 },  // Monte Urbasa
  "9832262": { lat: 25.54406, lng: 54.90227 },  // Front Shanghai
  "9833735": { lat: 24.52852, lng: 53.58895 },  // Siena
  "9903413": { lat: 25.98660, lng: 55.50498 },  // Karachi
  "1120510": { lat: 26.03167, lng: 55.93833 },      // Maria (near Hulaylah Terminal)
  "9933547": { lat: 28.71129, lng: 49.30036 },  // Advantage Victory
  "9936549": { lat: 26.01413, lng: 52.71321 },  // Eco Oracle
  "9937103": { lat: 25.62021, lng: 54.98053 },  // Front Beauly
  "9065077": { lat: 25.96057, lng: 55.38039 },   // Sea Bird
  "9976927": { lat: 25.92130, lng: 52.32326 },  // Lebrethah
  "9978676": { lat: 24.40003, lng: 52.92878 },   // North Star
  "9982536": { lat: 24.43335, lng: 52.43220 },  // Nord Victor
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

// Musandam Peninsula obstacle (simplified triangle for land-avoidance routing)
const MUSANDAM_POLYGON = [
  [25.85, 55.95],  // Southwest base
  [26.4, 56.27],   // Tip (north)
  [25.85, 56.35],  // Southeast base
];

// Waypoint for routing through the Strait of Hormuz (well north+east of Musandam)
const STRAIT_WAYPOINT = { lat: 26.7, lng: 56.5 };

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
};
