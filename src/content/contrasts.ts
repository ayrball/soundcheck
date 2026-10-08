// Minimal-pair drills. Each contrast is a pair of English sounds that speakers of some
// first languages merge. A drill is a word plus the sound in it we focus on.

export interface Drill {
  word: string;
  /** model token for the sound this drill targets */
  focus: string;
  /** the minimal-pair partner: same word with the other sound */
  partner?: string;
}

export interface Contrast {
  id: string;
  /** short IPA label, e.g. "θ · s" */
  label: string;
  /** plain-language name, e.g. "th in think vs s in sink" */
  name: string;
  /** the sounds in play, as model tokens */
  sounds: string[];
  drills: Drill[];
  /** for drills without a partner: what the common mistake is */
  watchFor?: "insertion" | "deletion";
  /** which occurrence of the focus sound to highlight (default: first) */
  focusAt?: "first" | "last";
}

function pairs(a: string, b: string, list: [string, string][]): Drill[] {
  return list.flatMap(([wa, wb]) => [
    { word: wa, focus: a, partner: wb },
    { word: wb, focus: b, partner: wa },
  ]);
}

function words(focus: (w: string) => string, list: string[]): Drill[] {
  return list.map((word) => ({ word, focus: focus(word) }));
}

export const CONTRASTS: Contrast[] = [
  {
    id: "th-s",
    label: "θ · s",
    name: "th in think vs s in sink",
    sounds: ["θ", "s"],
    drills: pairs("θ", "s", [
      ["think", "sink"],
      ["thick", "sick"],
      ["thumb", "sum"],
      ["thin", "sin"],
      ["path", "pass"],
      ["mouth", "mouse"],
      ["faith", "face"],
      ["worth", "worse"],
    ]),
  },
  {
    id: "th-t",
    label: "θ · t",
    name: "th in three vs t in tree",
    sounds: ["θ", "t"],
    drills: pairs("θ", "t", [
      ["three", "tree"],
      ["thank", "tank"],
      ["thin", "tin"],
      ["both", "boat"],
      ["thought", "taught"],
      ["bath", "bat"],
      ["thigh", "tie"],
    ]),
  },
  {
    id: "th-f",
    label: "θ · f",
    name: "th in three vs f in free",
    sounds: ["θ", "f"],
    drills: pairs("θ", "f", [
      ["three", "free"],
      ["thin", "fin"],
      ["thirst", "first"],
      ["thought", "fought"],
      ["death", "deaf"],
      ["thread", "fred"],
    ]),
  },
  {
    id: "dh-d",
    label: "ð · d",
    name: "th in they vs d in day",
    sounds: ["ð", "d"],
    drills: pairs("ð", "d", [
      ["they", "day"],
      ["then", "den"],
      ["though", "dough"],
      ["there", "dare"],
      ["those", "doze"],
      ["breathe", "breed"],
    ]),
  },
  {
    id: "dh-z",
    label: "ð · z",
    name: "th in breathe vs z in breeze",
    sounds: ["ð", "z"],
    drills: pairs("ð", "z", [
      ["breathe", "breeze"],
      ["clothing", "closing"],
      ["then", "zen"],
      ["bathe", "bays"],
      ["teethe", "tease"],
    ]),
  },
  {
    id: "r-l",
    label: "ɹ · l",
    name: "r in right vs l in light",
    sounds: ["ɹ", "l"],
    drills: pairs("ɹ", "l", [
      ["right", "light"],
      ["rice", "lice"],
      ["road", "load"],
      ["grass", "glass"],
      ["fry", "fly"],
      ["pray", "play"],
      ["correct", "collect"],
      ["arrive", "alive"],
    ]),
  },
  {
    id: "v-w",
    label: "v · w",
    name: "v in vest vs w in west",
    sounds: ["v", "w"],
    drills: pairs("v", "w", [
      ["vest", "west"],
      ["vine", "wine"],
      ["vet", "wet"],
      ["verse", "worse"],
      ["veil", "whale"],
      ["vow", "wow"],
    ]),
  },
  {
    id: "b-v",
    label: "b · v",
    name: "b in berry vs v in very",
    sounds: ["b", "v"],
    drills: pairs("b", "v", [
      ["berry", "very"],
      ["ban", "van"],
      ["best", "vest"],
      ["boat", "vote"],
      ["bet", "vet"],
      ["curb", "curve"],
    ]),
  },
  {
    id: "p-f",
    label: "p · f",
    name: "p in pan vs f in fan",
    sounds: ["p", "f"],
    drills: pairs("p", "f", [
      ["pan", "fan"],
      ["pool", "fool"],
      ["pine", "fine"],
      ["copy", "coffee"],
      ["cheap", "chief"],
      ["pork", "fork"],
    ]),
  },
  {
    id: "p-b",
    label: "p · b",
    name: "p in pig vs b in big",
    sounds: ["p", "b"],
    drills: pairs("p", "b", [
      ["pig", "big"],
      ["pear", "bear"],
      ["cap", "cab"],
      ["rope", "robe"],
      ["pie", "buy"],
      ["pin", "bin"],
    ]),
  },
  {
    id: "ih-ee",
    label: "ɪ · iː",
    name: "i in ship vs ee in sheep",
    sounds: ["ɪ", "iː"],
    drills: pairs("ɪ", "iː", [
      ["ship", "sheep"],
      ["bit", "beat"],
      ["live", "leave"],
      ["fill", "feel"],
      ["sit", "seat"],
      ["chip", "cheap"],
      ["hit", "heat"],
      ["still", "steal"],
    ]),
  },
  {
    id: "ae-e",
    label: "æ · ɛ",
    name: "a in bad vs e in bed",
    sounds: ["æ", "ɛ"],
    drills: pairs("æ", "ɛ", [
      ["bad", "bed"],
      ["man", "men"],
      ["sad", "said"],
      ["pan", "pen"],
      ["had", "head"],
      ["sat", "set"],
    ]),
  },
  {
    id: "ae-uh",
    label: "æ · ʌ",
    name: "a in cat vs u in cut",
    sounds: ["æ", "ʌ"],
    drills: pairs("æ", "ʌ", [
      ["cat", "cut"],
      ["bag", "bug"],
      ["cap", "cup"],
      ["ran", "run"],
      ["hat", "hut"],
      ["match", "much"],
    ]),
  },
  {
    id: "oo-uu",
    label: "ʊ · uː",
    name: "u in full vs oo in fool",
    sounds: ["ʊ", "uː"],
    drills: pairs("ʊ", "uː", [
      ["full", "fool"],
      ["pull", "pool"],
      ["look", "luke"],
      ["wood", "wooed"],
      ["could", "cooed"],
    ]),
  },
  {
    id: "sh-s",
    label: "ʃ · s",
    name: "sh in she vs s in see",
    sounds: ["ʃ", "s"],
    drills: pairs("ʃ", "s", [
      ["she", "see"],
      ["ship", "sip"],
      ["shell", "sell"],
      ["shine", "sign"],
      ["short", "sort"],
      ["mesh", "mess"],
    ]),
  },
  {
    id: "sh-ch",
    label: "ʃ · tʃ",
    name: "sh in share vs ch in chair",
    sounds: ["ʃ", "tʃ"],
    drills: pairs("ʃ", "tʃ", [
      ["share", "chair"],
      ["ship", "chip"],
      ["shoes", "choose"],
      ["wash", "watch"],
      ["cash", "catch"],
      ["sheep", "cheap"],
    ]),
  },
  {
    id: "j-y",
    label: "dʒ · j",
    name: "j in jet vs y in yet",
    sounds: ["dʒ", "j"],
    drills: pairs("dʒ", "j", [
      ["jet", "yet"],
      ["jam", "yam"],
      ["jello", "yellow"],
      ["joke", "yoke"],
      ["jeer", "year"],
    ]),
  },
  {
    id: "z-s",
    label: "z · s",
    name: "z in prize vs s in price",
    sounds: ["z", "s"],
    drills: pairs("z", "s", [
      ["zoo", "sue"],
      ["prize", "price"],
      ["eyes", "ice"],
      ["rise", "rice"],
      ["buzz", "bus"],
      ["lazy", "lacy"],
    ]),
  },
  {
    id: "n-l",
    label: "n · l",
    name: "n in night vs l in light",
    sounds: ["n", "l"],
    drills: pairs("n", "l", [
      ["night", "light"],
      ["know", "low"],
      ["nine", "line"],
      ["snow", "slow"],
      ["nap", "lap"],
    ]),
  },
  {
    id: "ng-n",
    label: "ŋ · n",
    name: "ng in thing vs n in thin",
    sounds: ["ŋ", "n"],
    drills: pairs("ŋ", "n", [
      ["thing", "thin"],
      ["sing", "sin"],
      ["rang", "ran"],
      ["bang", "ban"],
      ["wing", "win"],
      ["tongue", "ton"],
    ]),
  },
  {
    id: "h",
    label: "h · ∅",
    name: "h in hair vs no h in air",
    sounds: ["h"],
    drills: [
      { word: "hair", focus: "h", partner: "air" },
      { word: "heat", focus: "h", partner: "eat" },
      { word: "hold", focus: "h", partner: "old" },
      { word: "heart", focus: "h", partner: "art" },
      { word: "hand", focus: "h", partner: "and" },
      { word: "hi", focus: "h", partner: "eye" },
    ],
    watchFor: "deletion",
  },
  {
    id: "er",
    label: "ɜː",
    name: "er in bird and work",
    sounds: ["ɜː"],
    drills: [
      { word: "bird", focus: "ɜː", partner: "bud" },
      { word: "work", focus: "ɜː", partner: "walk" },
      { word: "word", focus: "ɜː", partner: "ward" },
      { word: "hurt", focus: "ɜː", partner: "hut" },
      { word: "shirt", focus: "ɜː", partner: "shut" },
      { word: "turn", focus: "ɜː", partner: "ton" },
      { word: "first", focus: "ɜː" },
      { word: "learn", focus: "ɜː" },
    ],
  },
  {
    id: "final",
    focusAt: "last",
    label: "–C",
    name: "Finishing words: final consonants",
    sounds: [],
    drills: [
      { word: "bike", focus: "k", partner: "buy" },
      { word: "rice", focus: "s", partner: "rye" },
      { word: "line", focus: "n", partner: "lie" },
      { word: "seat", focus: "t", partner: "sea" },
      { word: "made", focus: "d", partner: "may" },
      { word: "phone", focus: "n", partner: "foe" },
      { word: "cold", focus: "d", partner: "coal" },
      { word: "test", focus: "t", partner: "tess" },
    ],
    watchFor: "deletion",
  },
  {
    id: "final-voicing",
    focusAt: "last",
    label: "d · t",
    name: "Buzzing final sounds: bed vs bet",
    sounds: ["d", "t", "z", "s", "ɡ", "k", "v", "f"],
    drills: [
      ...pairs("d", "t", [["bed", "bet"], ["card", "cart"], ["ride", "write"]]),
      ...pairs("ɡ", "k", [["bag", "back"], ["dog", "dock"]]),
      ...pairs("v", "f", [["leave", "leaf"], ["save", "safe"]]),
    ],
  },
  {
    id: "s-cluster",
    label: "sC",
    name: "Starting with s: school, not eschool",
    sounds: ["s"],
    drills: words(() => "s", ["school", "speak", "street", "student", "sport", "star", "small", "snow"]),
    watchFor: "insertion",
  },
  {
    id: "no-extra-vowel",
    focusAt: "last",
    label: "C#",
    name: "Ending on a consonant: desk, not desku",
    sounds: [],
    drills: [
      { word: "desk", focus: "k" },
      { word: "milk", focus: "k" },
      { word: "good", focus: "d" },
      { word: "big", focus: "ɡ" },
      { word: "bed", focus: "d" },
      { word: "help", focus: "p" },
      { word: "bus", focus: "s" },
      { word: "book", focus: "k" },
    ],
    watchFor: "insertion",
  },
  {
    id: "dark-l",
    focusAt: "last",
    label: "-l",
    name: "l at the end: feel, not feew",
    sounds: ["l"],
    drills: words(() => "l", ["feel", "well", "call", "school", "people", "milk", "help", "film"]),
  },
];

export const CONTRAST_BY_ID = Object.fromEntries(CONTRASTS.map((c) => [c.id, c]));

/** Index of the drill's focus sound in its tokens. Merged tokens like "əl" count for "l". */
export function focusIndex(tokens: string[], focus: string, at: "first" | "last" = "first"): number {
  const idx = tokens.map((t, i) => (t === focus || (t.length > 1 && t.endsWith(focus)) ? i : -1)).filter((i) => i >= 0);
  if (idx.length === 0) return -1;
  return at === "last" ? idx[idx.length - 1] : idx[0];
}
