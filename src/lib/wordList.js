export const WORDS = [
  "APPLE", "BEACH", "CHAIR", "DANCE", "EAGLE", "FLAME", "GRAPE", "HOUSE", "IMAGE", "JOKER",
  "KNIFE", "LEMON", "MONEY", "NIGHT", "OCEAN", "PIANO", "QUIET", "RIVER", "STONE", "TABLE",
  "UNITY", "VOICE", "WATER", "YOUTH", "ZEBRA", "BREAD", "CLOUD", "DREAM", "EARTH", "FRUIT",
  "GHOST", "HEART", "IVORY", "JELLY", "KOALA", "LIGHT", "MUSIC", "NORTH", "OLIVE", "PEACE",
  "QUEEN", "ROBOT", "SMILE", "TIGER", "UNCLE", "VALUE", "WORLD", "YIELD", "BRAVE", "CANDY",
  "DRIVE", "ELBOW", "FENCE", "GLASS", "HONEY", "INBOX", "JUICE", "KNOWN", "LUCKY", "MAPLE",
  "NURSE", "ORBIT", "PIZZA", "QUICK", "REACH", "SHINE", "TRUST", "UPPER", "VISIT", "WHALE",
  "BLOOM", "CROWN", "DELTA", "EQUAL", "FROST", "GRAND", "HAPPY", "INPUT", "JUMBO", "KNEEL",
  "LEVEL", "MINOR", "NOVEL", "OASIS", "PLANT", "QUOTE", "RADIO", "SOLID", "TOAST", "UNITE",
  "VIVID", "WORTH", "BLAZE", "CABIN", "DEPTH", "ENJOY", "FLOOR", "GUARD", "HORSE", "IDEAL",
  "JOINT", "KITES", "LODGE", "MERIT", "NOBLE", "ORDER", "PRIDE", "QUAKE", "REPLY", "SPARK",
  "TREND", "USUAL", "VAPOR", "WOMAN", "BUNCH", "CABLE", "DINER", "EAGER",
  "FIELD", "GOOSE", "HABIT", "ICING", "JOKED", "KARMA", "LOYAL", "MAGIC", "NAKED", "OPERA",
  "PEARL", "QUALM", "ROUND", "STORM", "TRACE", "UNDER", "VITAL", "WOVEN", "BASIL", "CIVIC",
  "DODGE", "EMPTY", "FAITH", "GRACE", "HOVER", "INLET", "JOLLY", "KIOSK", "LEAFY", "MOIST",
  "NOISE", "OUNCE", "PULSE", "QUART", "RANCH", "SHARP", "TITLE", "URBAN",
  "VOTER", "WITTY", "BATON", "CLICK", "DAISY", "ELVES", "FOCUS", "GLORY", "HOTEL", "IRATE",
  "JEANS", "KNOCK", "LARGE", "MEDAL", "NASAL", "OPTIC", "PLAZA", "QUOTA", "RUGBY", "SALTY",
  "TEMPO", "UTTER", "VALID", "WAGON", "BELLY", "CHESS", "DRAFT", "ENTER", "FUDGE", "GRAIN",
  "HUMID", "IDIOM", "JOUST", "KNELT", "LUNAR", "MODEL", "NYLON", "OZONE", "POUCH", "QUILL",
  "ROBIN", "SCOUT", "THORN", "USAGE", "VENOM", "WITCH", "BAGEL", "CRISP",
  "DUSTY", "ELITE", "FAULT", "GUEST", "HINGE", "IONIC", "JETTY", "KITTY", "LOOSE", "MERGE",
];

const EPOCH = new Date(2024, 5, 1);

export function getWordOfTheDay(date = new Date()) {
  const dayCount = Math.floor((date.setHours(0, 0, 0, 0) - EPOCH.getTime()) / 86400000);
  const index = ((dayCount % WORDS.length) + WORDS.length) % WORDS.length;
  return WORDS[index];
}

export function isValidWord(word) {
  return WORDS.includes(word.toUpperCase());
}
