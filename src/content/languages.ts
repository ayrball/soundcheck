// Which English contrasts speakers of each first language most often find hard,
// most important first. Based on the standard learner-error literature
// (e.g. Swan & Smith, "Learner English"), simplified for a short practice plan.

export interface FirstLanguage {
  id: string;
  name: string;
  native: string;
  focus: string[];
}

export const LANGUAGES: FirstLanguage[] = [
  { id: "es", name: "Spanish", native: "Español", focus: ["ih-ee", "b-v", "s-cluster", "dh-d", "th-s", "z-s", "j-y", "sh-ch", "ae-uh", "h"] },
  { id: "pt", name: "Portuguese", native: "Português", focus: ["th-f", "dh-d", "ih-ee", "dark-l", "no-extra-vowel", "ae-e", "h", "th-t"] },
  { id: "zh", name: "Mandarin", native: "中文", focus: ["th-s", "dh-z", "v-w", "final", "n-l", "ih-ee", "ae-e", "r-l", "z-s"] },
  { id: "yue", name: "Cantonese", native: "廣東話", focus: ["n-l", "final", "th-f", "dh-d", "v-w", "z-s", "ih-ee", "r-l"] },
  { id: "ja", name: "Japanese", native: "日本語", focus: ["r-l", "no-extra-vowel", "th-s", "dh-z", "b-v", "er", "ae-uh", "sh-s"] },
  { id: "ko", name: "Korean", native: "한국어", focus: ["r-l", "p-f", "b-v", "z-s", "th-s", "dh-d", "no-extra-vowel", "ih-ee", "ae-e"] },
  { id: "vi", name: "Vietnamese", native: "Tiếng Việt", focus: ["final", "th-t", "dh-z", "sh-s", "ih-ee", "s-cluster", "p-b", "sh-ch"] },
  { id: "th", name: "Thai", native: "ภาษาไทย", focus: ["final", "r-l", "th-t", "v-w", "sh-ch", "z-s", "s-cluster", "ih-ee"] },
  { id: "ar", name: "Arabic", native: "العربية", focus: ["p-b", "v-w", "s-cluster", "ih-ee", "sh-ch", "ae-uh", "oo-uu", "ng-n"] },
  { id: "hi", name: "Hindi / Urdu", native: "हिन्दी / اردو", focus: ["v-w", "th-t", "dh-d", "s-cluster", "z-s", "ae-e", "er", "sh-s"] },
  { id: "fr", name: "French", native: "Français", focus: ["th-s", "dh-z", "h", "ih-ee", "oo-uu", "r-l", "ae-uh", "ng-n"] },
  { id: "de", name: "German", native: "Deutsch", focus: ["th-s", "dh-z", "v-w", "final-voicing", "ae-e", "r-l", "ih-ee"] },
  { id: "ru", name: "Russian", native: "Русский", focus: ["th-s", "dh-z", "ih-ee", "ae-e", "h", "v-w", "final-voicing", "ng-n", "er"] },
  { id: "tr", name: "Turkish", native: "Türkçe", focus: ["th-t", "dh-d", "v-w", "ae-e", "ih-ee", "final-voicing", "s-cluster"] },
  { id: "tl", name: "Filipino", native: "Tagalog", focus: ["p-f", "b-v", "th-t", "dh-d", "ih-ee", "z-s", "sh-s", "ae-uh"] },
  { id: "id", name: "Indonesian / Malay", native: "Bahasa", focus: ["th-t", "dh-d", "v-w", "p-f", "ih-ee", "z-s", "sh-s", "final-voicing"] },
];

export const LANGUAGE_BY_ID = Object.fromEntries(LANGUAGES.map((l) => [l.id, l]));
